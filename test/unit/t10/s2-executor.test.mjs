/* global AbortController */
import { describe, it, expect } from "vitest";
import { createCreationService } from "../../../dist/creation/index.js";
import { args, binding, signal, sessionFixture, uuid } from "./helpers.mjs";
describe("T21 fresh creation service", () => {
  it("allocates fresh roots/keys for repeated and concurrent identical calls", async () => {
    const f = sessionFixture();
    const service = createCreationService({ session: f.session, writesEnabled: true });
    const results = await Promise.all([
      service.create(binding, args(), signal()),
      service.create(binding, args(), signal()),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(new Set(results.map((r) => r.data.routineId)).size).toBe(2);
    expect(f.mutations).toHaveLength(6);
    expect(new Set(f.mutations.map((r) => r.key)).size).toBe(6);
    expect(f.reads).toEqual([uuid(4), uuid(4)]);
    for (const result of results)
      expect(Object.keys(result.data).sort()).toEqual(["routineId", "status"]);
  });
  it("rejects obsolete IDs, disabled writes and oversized bodies before mutation", async () => {
    const f = sessionFixture();
    for (const [options, input, code] of [
      [{}, { ...args(), operationId: uuid(3) }, "invalid_arguments"],
      [{ writesEnabled: false }, args(), "configuration_required"],
      [{ maxRequestBytes: 100 }, args(), "request_too_large"],
    ]) {
      const service = createCreationService({
        session: f.session,
        writesEnabled: true,
        ...options,
      });
      expect(await service.create(binding, input, signal())).toEqual({
        ok: false,
        error: { code, retryable: false },
      });
    }
    expect(f.mutations).toEqual([]);
  });
  it("stops after cancellation with confirmed draft facts", async () => {
    const controller = new AbortController();
    const f = sessionFixture((r) => {
      if (r.step === "draft") controller.abort();
    });
    const service = createCreationService({ session: f.session, writesEnabled: true });
    const result = await service.create(binding, args(), controller.signal);
    expect(result.error).toMatchObject({
      code: "operation_interrupted",
      retryable: false,
      lastConfirmedStep: "draft",
      outcomeUnknown: false,
    });
    expect(f.mutations).toHaveLength(1);
  });
  it("withholds context after account/session replacement", async () => {
    const f = sessionFixture((_r, s) => {
      s.binding.sessionGeneration++;
    });
    const service = createCreationService({ session: f.session, writesEnabled: true });
    expect(await service.create(binding, args(), signal())).toEqual({
      ok: false,
      error: { code: "operation_interrupted", retryable: false },
    });
    expect(f.mutations).toHaveLength(1);
  });
});

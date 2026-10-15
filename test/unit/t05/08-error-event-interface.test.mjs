// T05 unit: TransportError constructor/derivation/immutability,
// isTransportError branding, TransportEvent shape/privacy/discipline.
// Approved spec section 9. Note the corrected privacy rule: a safe
// backendErrorCode IS allowed in the returned error, but NEVER in logs/events.

/* global setImmediate */

import { describe, it, expect } from "vitest";
import {
  createBackendTransport,
  TransportError,
  isTransportError,
} from "../../../dist/http/index.js";
import {
  ROUTINE_R,
  baseConfig,
  baseDeps,
  makeSession,
  makeWire,
  okJson,
  routineWire,
  testBinding,
  catchTransportError,
  freshSignal,
} from "./helpers.mjs";

function eventTransport(script, onEvent) {
  const { session } = makeSession();
  const { wire } = makeWire(script);
  const handle = createBackendTransport(baseConfig(), {
    ...baseDeps(),
    session,
    wire,
    ...(onEvent === undefined ? {} : { onEvent }),
  });
  return { handle };
}

describe("TransportError construction and derivation", () => {
  it("carries fixed message/name with derived retryable and nullish defaults", () => {
    const error = new TransportError("not_found", { status: 404 });
    expect(error.message).toBe("Transport failure: not_found.");
    expect(error.name).toBe("TransportError");
    expect(error.code).toBe("not_found");
    expect(error.retryable).toBe(false);
    expect(error.backendErrorCode).toBe(null);
    expect(error.retryAfterSeconds).toBe(null);
    expect(error.status).toBe(404);
    expect(error.dispatched).toBe(false);
    expect(error.outcomeUnknown).toBe(false);
    expect(error.attempts).toBe(0);
    expect(error.elapsedMs).toBe(0);
    expect(error.correlationId).toBe("");
    expect(isTransportError(error)).toBe(true);
  });

  it("derives retryable from the code table, never caller input", () => {
    expect(new TransportError("rate_limited", { retryAfterSeconds: 3 }).retryable).toBe(true);
    expect(new TransportError("network_error", {}).retryable).toBe(true);
    expect(new TransportError("operation_interrupted", {}).retryable).toBe(true);
    expect(new TransportError("internal_error", {}).retryable).toBe(true);
    expect(
      new TransportError("backend_error", { backendErrorCode: "synthetic_qa_x" }).retryable,
    ).toBe(false);
  });

  it("fails unknown codes and invalid details to safe invalid_arguments", () => {
    for (const args of [
      ["nope_not_real", undefined],
      ["not_found", { status: 99 }],
      ["not_found", { backendErrorCode: "HAS SPACE!" }],
      ["not_found", { retryAfterSeconds: -2 }],
      ["not_found", { attempts: 6 }],
      ["not_found", { correlationId: "not-a-uuid" }],
    ]) {
      const error = new TransportError(...args);
      expect({ args, code: error.code }).toEqual({ args, code: "invalid_arguments" });
    }
  });

  it("exposes exactly the specified own fields, frozen, with no stack/cause", () => {
    const error = new TransportError("rate_limited", {
      backendErrorCode: "rate_limited",
      retryAfterSeconds: 4,
      status: 429,
      dispatched: true,
      outcomeUnknown: false,
      attempts: 2,
      elapsedMs: 4100,
      correlationId: ROUTINE_R,
    });
    // Exact ownership via reflection: enumerability is NOT required, so a
    // normal nonenumerable Error.message shape is accepted while extra own
    // symbols/cause/stack payloads are rejected.
    const ownNames = Reflect.ownKeys(error)
      .filter((key) => typeof key === "string")
      .sort();
    expect(ownNames).toEqual(
      [
        "attempts",
        "backendErrorCode",
        "code",
        "correlationId",
        "dispatched",
        "elapsedMs",
        "message",
        "name",
        "outcomeUnknown",
        "retryAfterSeconds",
        "retryable",
        "status",
      ].sort(),
    );
    expect(Reflect.ownKeys(error).filter((key) => typeof key === "symbol")).toEqual([]);
    expect(Object.isFrozen(error)).toBe(true);
    expect(Reflect.getOwnPropertyDescriptor(error, "code").writable).toBe(false);
    expect("stack" in error).toBe(false);
    expect("cause" in error).toBe(false);
  });

  it("per-call correlation IDs are unrelated canonical UUIDs", async () => {
    const first = eventTransport([
      okJson(200, routineWire({ isDraft: false, name: "S", revision: 1 })),
    ]);
    const one = await first.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    const second = eventTransport([
      okJson(200, routineWire({ isDraft: false, name: "S", revision: 1 })),
    ]);
    const two = await second.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(one.correlationId).toMatch(uuidRe);
    expect(two.correlationId).toMatch(uuidRe);
    expect(one.correlationId).not.toBe(two.correlationId);
  });
});

describe("isTransportError branding without getter execution", () => {
  it("accepts only module-created errors", () => {
    expect(isTransportError(new TransportError("not_found", {}))).toBe(true);
    expect(isTransportError(null)).toBe(false);
    expect(isTransportError(undefined)).toBe(false);
    expect(isTransportError(new Error("Transport failure: not_found."))).toBe(false);
    expect(
      isTransportError({
        name: "TransportError",
        message: "Transport failure: not_found.",
        code: "not_found",
        retryable: false,
      }),
    ).toBe(false);
  });

  it("never invokes hostile getters", () => {
    let invoked = 0;
    const hostile = Object.defineProperty({}, "code", {
      enumerable: true,
      get() {
        invoked += 1;
        throw new Error("synthetic-qa getter must not run");
      },
    });
    expect(isTransportError(hostile)).toBe(false);
    expect(invoked).toBe(0);
  });
});

describe("TransportEvent discipline and privacy", () => {
  it("emits exactly one detached frozen terminal event per known-route call", async () => {
    const events = [];
    const { handle } = eventTransport(
      [okJson(200, routineWire({ isDraft: false, name: "Synthetic QA Saved", revision: 2 }))],
      (event) => {
        events.push(event);
      },
    );
    const result = await handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    expect(events.length).toBe(1);
    expect(events[0]).toEqual({
      routeLabel: "get_routine",
      code: "ok",
      status: 200,
      attempts: 1,
      elapsedMs: events[0].elapsedMs,
      dispatched: true,
      outcomeUnknown: false,
      correlationId: result.correlationId,
    });
    expect(Object.isFrozen(events[0])).toBe(true);
  });

  it("error events carry classification without backendErrorCode or identifiers", async () => {
    const events = [];
    const { handle } = eventTransport([okJson(404, { errorCode: "not_found" })], (event) => {
      events.push(event);
    });
    const error = await catchTransportError(
      handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(error.backendErrorCode).toBe("not_found");
    expect(events.length).toBe(1);
    expect(events[0].code).toBe("not_found");
    expect("backendErrorCode" in events[0]).toBe(false);
    expect(JSON.stringify(events[0]).includes(ROUTINE_R)).toBe(false);
  });

  it("emits no event on factory rejection", () => {
    const events = [];
    let thrown = null;
    try {
      createBackendTransport(
        { origin: "https://bad.example.invalid/a path" },
        {
          ...baseDeps(),
          onEvent: (event) => {
            events.push(event);
          },
        },
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown?.code).toBe("invalid_arguments");
    expect(events.length).toBe(0);
  });

  it("throwing and async listeners change nothing and log nothing", async () => {
    const throwing = eventTransport(
      [okJson(200, routineWire({ isDraft: false, name: "S", revision: 1 }))],
      () => {
        throw new Error("synthetic-qa listener boom");
      },
    );
    const okResult = await throwing.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    expect(okResult.status).toBe(200);

    const asyncFailing = eventTransport(
      [okJson(200, routineWire({ isDraft: false, name: "S", revision: 1 }))],
      () => Promise.reject(new Error("synthetic-qa async listener boom")),
    );
    const second = await asyncFailing.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    expect(second.status).toBe(200);
    await new Promise((resolve) => setImmediate(resolve));
  });

  it("transport writes nothing to console on success or mapped failure", async () => {
    const writes = [];
    const methods = ["log", "warn", "error", "info", "debug"];
    const originals = new Map(methods.map((method) => [method, console[method]]));
    try {
      for (const method of methods) {
        console[method] = (...args) => {
          writes.push([method, ...args]);
        };
      }
      const { handle } = eventTransport([
        okJson(200, routineWire({ isDraft: false, name: "S", revision: 1 })),
      ]);
      await handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
      const failing = eventTransport([okJson(404, { errorCode: "not_found" })]);
      await catchTransportError(failing.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()));
    } finally {
      for (const [method, original] of originals) console[method] = original;
    }
    expect(writes).toEqual([]);
  });
});

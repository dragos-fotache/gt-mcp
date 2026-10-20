// Strict file policy and durable operation identity at the delivered process boundary.
import { spawnSync } from "node:child_process";
import { describe, it, expect } from "vitest";
import { rawCall, expectEnvelope, expectError } from "../read-protocol/helpers.mjs";
import { SERVER, CONFIG_FAILURE, USAGE } from "../stdio-server/helpers.mjs";
import { fixture, args, processSession } from "./helpers.mjs";

const DISABLED = { message: "Routine creation is disabled in the operator configuration." };
const call = (s, input = args()) => s.client.callTool({ name: "create_routine", arguments: input });

describe("T15-S3 compiled policy and identity", () => {
  it("omitted/false startup policy defeats client and environment enablement while reads work", async () => {
    const f = await fixture();
    let s;
    try {
      for (const writesEnabled of [undefined, false]) {
        f.write({ ...f.config, writesEnabled });
        s = await processSession(f.configPath, {
          env: { WRITES_ENABLED: "true", GYMTRACKA_MCP_WRITES_ENABLED: "true" },
          clientInfo: { writesEnabled: true },
          clientOptions: {
            capabilities: { experimental: { permission: { writesEnabled: true } } },
          },
        });
        expect(f.requests).toEqual([]);
        expectError(
          await rawCall(s.client, {
            name: "create_routine",
            arguments: args(),
            _meta: { writesEnabled: true, annotations: { writesEnabled: true } },
          }),
          "configuration_required",
          false,
          DISABLED,
        );
        expectError(await call(s, { ...args(), writesEnabled: true }), "invalid_arguments", false);
        expect(f.requests).toEqual([]);
        expectEnvelope(await s.client.callTool({ name: "list_routines" }), {
          ok: true,
          data: { items: [], hasMore: false, nextPageToken: null },
        });
        expect(f.mutations()).toEqual([]);
        await s.close("eof");
        expect(s.stderr()).toBe("");
        s = undefined;
        expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
        f.requests.length = 0;
      }
      const result = spawnSync(
        process.execPath,
        [SERVER, "--config", f.configPath, "--writes-enabled"],
        { env: process.env, encoding: "utf8", timeout: 10000 },
      );
      expect(result).toMatchObject({ status: 64, signal: null, stdout: "", stderr: USAGE });
      expect(f.requests).toEqual([]);
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
    } finally {
      await s?.close();
      await f.close();
    }
  }, 30000);

  it("no-config serves seven tools but cannot admit creation", async () => {
    const s = await processSession();
    try {
      expect((await s.client.listTools()).tools).toHaveLength(7);
      expectError(await call(s), "configuration_required", false, DISABLED);
    } finally {
      await s.close("eof");
    }
    expect(s.stderr()).toBe("");
  });

  it("invalid null/number/string policy fails startup with fixed diagnostics and no admission", async () => {
    const f = await fixture();
    try {
      for (const writesEnabled of [null, 1, "true"]) {
        f.write({ ...f.config, writesEnabled });
        const result = spawnSync(process.execPath, [SERVER, "--config", f.configPath], {
          env: process.env,
          encoding: "utf8",
          timeout: 10000,
        });
        expect(result).toMatchObject({
          status: 78,
          signal: null,
          stdout: "",
          stderr: CONFIG_FAILURE,
        });
        expect(f.requests).toEqual([]);
        expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
      }
    } finally {
      await f.close();
    }
  });

  it("identical and changed explicit calls each create fresh routines; denied auth reveals no old outcome", async () => {
    const f = await fixture();
    let s;
    try {
      s = await processSession(f.configPath);
      const first = await call(s),
        second = await call(s),
        third = await call(s, { ...args(), name: "Changed input" });
      expect([first, second, third].every((r) => r.structuredContent.ok)).toBe(true);
      expect(
        new Set([first, second, third].map((r) => r.structuredContent.data.routineId)).size,
      ).toBe(3);
      expect(f.mutations()).toHaveLength(9);
      f.state.deny = true;
      expectError(await call(s), "read_only", false, { backendErrorCode: "read_only" });
      expect(f.mutations()).toHaveLength(9);
      await s.close();
      expect(s.stderr()).toBe("");
      s = null;
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
    } finally {
      await s?.close();
      await f.close();
    }
  }, 30000);
});

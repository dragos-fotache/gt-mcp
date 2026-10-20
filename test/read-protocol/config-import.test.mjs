import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as entry from "../../dist/protocol/index.js";
import { CASES, runtimeFixture } from "./fixtures.mjs";
import { connectServer, expectEnvelope, expectError, rawCall } from "./helpers.mjs";

const EXPORTS = [
  "DEFAULT_MAX_TOOL_RESULT_BYTES",
  "ReadToolServerError",
  "createReadToolServer",
  "createToolServer",
  "isReadToolServerError",
  "openConfiguredReadToolServer",
  "openConfiguredToolServer",
].sort();

describe("S2 public factory shape and import boundary", () => {
  it("has exactly seven exports and import emits no extra output or new handlers/selected persistent handles", () => {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./import-observation.mjs", import.meta.url))],
      {
        encoding: "utf8",
        timeout: 10000,
        env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const observation = JSON.parse(result.stdout);
    expect(observation.exports).toEqual(EXPORTS);
    expect(observation.defaultBudget).toBe(4194304);
    expect(observation.changedEvents).toEqual([]);
    expect(observation.afterResources).toEqual(observation.beforeResources);
    expect(Object.keys(entry).sort()).toEqual(EXPORTS);
    // IO/network completeness is an additional Coordinator source audit, not
    // inferred from active resources disappearing before this observation.
  });

  it("validates exact own-data factory options without invoking accessors or taking ownership on failure", async () => {
    const fixture = runtimeFixture();
    let accessed = 0;
    const accessor = Object.defineProperty({}, "runtime", {
      enumerable: true,
      get() {
        accessed += 1;
        return fixture.runtime;
      },
    });
    for (const options of [
      null,
      undefined,
      {},
      { runtime: null },
      { runtime: fixture.runtime, extra: true },
      { runtime: fixture.runtime, maxToolResultBytes: undefined },
      { runtime: fixture.runtime, maxToolResultBytes: null },
      { runtime: fixture.runtime, maxToolResultBytes: "4096" },
      { runtime: fixture.runtime, maxToolResultBytes: 4095 },
      { runtime: fixture.runtime, maxToolResultBytes: 67108865 },
      { runtime: fixture.runtime, maxToolResultBytes: 4096.5 },
      { runtime: fixture.runtime, maxToolResultBytes: NaN },
      Object.create({ runtime: fixture.runtime }),
      accessor,
    ]) {
      let error;
      try {
        entry.createReadToolServer(options);
      } catch (failure) {
        error = failure;
      }
      expect(entry.isReadToolServerError(error)).toBe(true);
      expect(error.code).toBe("invalid_arguments");
    }
    expect(accessed).toBe(0);
    expect(fixture.calls).toEqual([]);
    expect(fixture.closeCount).toBe(0);
    expect(Object.isFrozen(fixture.runtime)).toBe(false);
    for (const budget of [4096, 67108864]) {
      const accepted = runtimeFixture();
      const options = { runtime: accepted.runtime, maxToolResultBytes: budget };
      const server = entry.createReadToolServer(options);
      expect(accepted.calls).toEqual([]);
      expect(accepted.closeCount).toBe(0);
      expect(Object.isFrozen(options)).toBe(false);
      expect(Object.isFrozen(accepted.runtime)).toBe(false);
      await server.close();
      expect(accepted.closeCount).toBe(1);
    }
  });

  it("captures trusted runtime method receivers without freezing or retaining mutable method aliases", async () => {
    const fixture = runtimeFixture();
    const server = entry.createReadToolServer({ runtime: fixture.runtime });
    fixture.runtime.listRoutines = async () => {
      throw new Error("SYNTHETIC_REPLACED_METHOD");
    };
    const session = await connectServer(server);
    try {
      expectEnvelope(await rawCall(session.client, { name: "list_routines" }), {
        ok: true,
        data: CASES[4].data,
      });
      expect(fixture.calls[0].receiver).toBe(fixture.runtime);
    } finally {
      await session.close();
    }
  });

  it("configured factory has strict options and no ambient configuration fallback", async () => {
    for (const options of [
      null,
      undefined,
      { configPath: undefined },
      { configPath: "relative.json" },
      { configPath: null },
      { writesEnabled: true },
      { maxToolResultBytes: 4096 },
    ]) {
      await expect(entry.openConfiguredReadToolServer(options)).rejects.toMatchObject({
        code: "invalid_arguments",
      });
    }
    const server = await entry.openConfiguredReadToolServer({});
    const session = await connectServer(server);
    try {
      expectError(
        await rawCall(session.client, { name: "list_routines" }),
        "configuration_required",
        false,
      );
    } finally {
      await session.close();
    }
    let getters = 0;
    const errorLike = Object.defineProperty({}, "code", {
      get() {
        getters += 1;
        throw new Error("SYNTHETIC");
      },
    });
    expect(entry.isReadToolServerError(errorLike)).toBe(false);
    expect(getters).toBe(0);
    const error = new entry.ReadToolServerError("internal_error");
    expect(entry.isReadToolServerError(error)).toBe(true);
    expect(error.code).toBe("internal_error");
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.cause).toBeUndefined();
  });
});

// T01 QA: inert companion factory checks (approved spec §3).
//
// Black-box only: the default export is a synchronous factory that accepts a
// Pi ExtensionAPI value, returns undefined, makes zero calls on the supplied
// API, starts no resources, and connects/registers nothing. Probes use a
// recording proxy and a throwing proxy in an ordinary Node subprocess — no
// live Pi host. This proves inert scaffolding, not Pi loading, gate
// feasibility, or host compatibility.

import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { DIST, evalArgs, reportViolations, runNode } from "./harness.mjs";
import { EXPECT } from "../fixtures/synthetic-vectors.mjs";

const COMPANION_URL = pathToFileURL(DIST.companion).href;

const RECORDING_PROXY = [
  "const calls = [];",
  "const api = new Proxy(function qaApi() {}, {",
  "  get(t, p) { calls.push(`get:${String(p)}`); return (...a) => { calls.push(`call:${String(p)}`); void a; return undefined; }; },",
  '  apply(t, thisArg, a) { calls.push("apply"); return undefined; },',
  '  construct(t, a) { calls.push("construct"); return {}; },',
  "});",
].join("\n");

describe("T01 inert companion factory (approved spec §3)", () => {
  it(
    "default export is a synchronous factory returning undefined with zero API calls",
    { timeout: 30000 },
    () => {
      const code = [
        `const ns = await import(${JSON.stringify(COMPANION_URL)});`,
        "if (typeof ns.default !== 'function') { console.error('missing default factory'); process.exit(99); }",
        RECORDING_PROXY,
        "const returned = ns.default(api);",
        "if (returned instanceof Promise) { console.error('factory was async'); process.exit(99); }",
        "console.log(JSON.stringify({ undefinedResult: returned === undefined, calls }));",
      ].join("\n");
      const result = runNode({ args: evalArgs(code) });
      expect(result.spawnError).toBeNull();
      expect(result.exitCode).toBe(EXPECT.EXIT_OK);
      expect(result.stderr).toBe("");
      expect(reportViolations(result.report)).toEqual([]);
      const observed = JSON.parse(result.stdout.trim());
      expect(observed.undefinedResult).toBe(true);
      expect(observed.calls).toEqual([]);
    },
  );

  it("factory tolerates a throwing API proxy without interaction", { timeout: 30000 }, () => {
    const code = [
      `const ns = await import(${JSON.stringify(COMPANION_URL)});`,
      "const throwing = new Proxy(function qaApi() {}, {",
      "  get(t, p) { throw new Error(`unexpected get:${String(p)}`); },",
      '  apply() { throw new Error("unexpected apply"); },',
      '  construct() { throw new Error("unexpected construct"); },',
      "});",
      "const returned = ns.default(throwing);",
      'if (returned !== undefined) { console.error("factory must return undefined"); process.exit(99); }',
    ].join("\n");
    const result = runNode({ args: evalArgs(code) });
    expect(result.spawnError).toBeNull();
    // Any interaction with the throwing proxy would surface as a nonzero exit
    // plus an uncaught error; a clean exit proves zero interaction.
    expect(result.exitCode).toBe(EXPECT.EXIT_OK);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(reportViolations(result.report)).toEqual([]);
  });
});

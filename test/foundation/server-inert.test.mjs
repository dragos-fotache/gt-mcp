// T08-S3 narrowly supersedes T01's inert executable/signature only. Inert server
// imports remain checked by inert-imports and argv-match regression suites.
import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { INITIALIZE, SERVER, USAGE, rawServer, runServer } from "../stdio-server/helpers.mjs";

describe("T08-S3 delivered server entry (T01 executable supersession)", () => {
  for (const argv of [[], ["--stdio"], ["--help", "extra-arg"]]) {
    it(`direct execution with argv ${JSON.stringify(argv)} follows S3 startup`, () => {
      const result = runServer({ args: argv });
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(argv.length ? 64 : 0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(argv.length ? USAGE : "");
    });
  }

  it("direct server execution answers a JSON-RPC initialize request", async () => {
    const server = rawServer();
    try {
      server.send(INITIALIZE);
      expect(await server.next()).toMatchObject({
        id: 1,
        result: { protocolVersion: "2025-11-25" },
      });
      server.child.stdin.end();
      expect(await server.exited).toMatchObject({ code: 0, signal: null, stderr: "" });
    } finally {
      await server.cleanup();
    }
  });

  it("exported main(args) returns Promise<number> without changing exitCode", () => {
    const evalCode = [
      `const { main } = await import(${JSON.stringify(pathToFileURL(SERVER).href)});`,
      "process.exitCode = 41;",
      "const pending = main([]);",
      "if (!(pending instanceof Promise)) throw new Error('main must return Promise');",
      "if (await pending !== 0) throw new Error('main EOF status');",
      "if (process.exitCode !== 41) throw new Error('main changed exitCode');",
      "process.exitCode = 0;",
    ].join("\n");
    const result = runServer({ evalCode });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});

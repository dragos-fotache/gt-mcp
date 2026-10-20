import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { clearTimeout, setTimeout } from "node:timers";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ajvValidator } from "../unit/t03/helpers.mjs";
import {
  REPO,
  createArtifactFixture,
  installExtracted,
  inspectArchive,
  assertSafeMembers,
  readJson,
  run,
  sha256,
} from "./helpers.mjs";

// Independent public catalogue/argument oracle from shared draft0.3 tools.md.
const ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const CALLS = [
  ["search_exercises", {}],
  ["get_exercise", { exerciseId: ID }],
  ["list_workouts", {}],
  ["get_workout", { workoutId: ID }],
  ["list_routines", {}],
  ["get_routine", { routineId: ID }],
  [
    "create_routine",
    {
      name: "Synthetic disabled package creation",
      exercises: [{ exerciseId: ID, sets: [] }],
    },
  ],
];
const BINS = {
  "gymtracka-mcp-server": "dist/protocol/server.js",
  "gymtracka-mcp": "dist/cli/main.js",
};

describe("T21-S6 private runtime artifact and extract-and-ci installation", () => {
  let fixture;
  let app;
  beforeAll(() => {
    fixture = createArtifactFixture();
    app = installExtracted(fixture);
  }, 360000);
  afterAll(() => fixture?.cleanup());

  it("ships only safe production content with matching byte/mode inventory and root-authoritative lock", () => {
    const report = readJson(fixture.inventory);
    expect(report.archive).toEqual({
      name: path.basename(fixture.archive),
      sha256: sha256(fs.readFileSync(fixture.archive)),
    });
    const actualFiles = fixture.members
      .filter(({ type }) => type === "file")
      .map(({ path: file, sha256, mode }) => ({
        path: file.slice("package/".length),
        sha256,
        mode,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
    expect([...report.files].sort((a, b) => a.path.localeCompare(b.path))).toEqual(actualFiles);
    for (const file of actualFiles) {
      expect(file.path).not.toMatch(
        /(^|\/)(?:node_modules|companion|experiments|test|src|scripts|\.git|\.pi|\.env|\.npmrc|logs|evidence)(?:\/|$)/,
      );
      expect(file.path).not.toMatch(/(?:\.d\.ts|\.map|\.log)$/);
      expect(file.path).not.toMatch(
        /dist\/(?:cli\/index|storage\/(?:test-facility|diag-worker|diag-support))\.js$/,
      );
      if (file.path.startsWith("dist/")) {
        expect(file.path).toMatch(/\.js$/);
        expect(file.sha256).toBe(sha256(fs.readFileSync(path.join(REPO, file.path))));
      } else {
        expect(file.path).toMatch(
          /^(?:package\.json|npm-shrinkwrap\.json|install\.mjs|README\.md|[^/]*NOTICE[^/]*|[^/]*LICENSE[^/]*|docs\/[^/]+\.md|examples\/[^/]+\.json)$/,
        );
      }
      expect(file.mode).toBe(Object.values(BINS).includes(file.path) ? 0o755 : 0o644);
    }
    const shipped = actualFiles.map(({ path }) => path);
    for (const module of ["index", "client", "worker", "engine", "format", "files", "validate"])
      expect(shipped).toContain(`dist/storage/credential/${module}.js`);
    expect(shipped).toContain("dist/storage/ipc.js");
    expect(
      shipped.some((file) =>
        /dist\/(?:operations\/|storage\/holder\.js|login\/metadata\.js)/.test(file),
      ),
    ).toBe(false);
    const manifest = readJson(path.join(app, "package.json"));
    const rootManifest = readJson(path.join(REPO, "package.json"));
    expect(manifest).toMatchObject({
      name: "gymtracka-mcp",
      version: "0.0.0",
      private: true,
      type: "module",
      engines: rootManifest.engines,
      packageManager: "npm@11.19.0",
      dependencies: rootManifest.dependencies,
    });
    expect(
      Object.fromEntries(
        Object.entries(manifest.bin).map(([name, target]) => [name, target.replace(/^\.\//, "")]),
      ),
    ).toEqual(BINS);
    for (const key of ["workspaces", "devDependencies", "peerDependencies", "scripts"])
      expect(manifest).not.toHaveProperty(key);
    const lock = readJson(path.join(app, "npm-shrinkwrap.json"));
    const rootLock = readJson(path.join(REPO, "package-lock.json"));
    expect(lock.lockfileVersion).toBe(3);
    expect(lock.packages[""].dependencies).toEqual(rootManifest.dependencies);
    const dependencies = Object.entries(lock.packages)
      .filter(([location]) => location !== "")
      .map(([location, entry]) => {
        expect(location).toMatch(/^node_modules\//);
        expect(entry).not.toHaveProperty("link");
        expect(entry).not.toHaveProperty("dev", true);
        expect(entry.version).toBe(rootLock.packages[location].version);
        expect(entry.resolved).toBe(rootLock.packages[location].resolved);
        expect(entry.integrity).toBe(rootLock.packages[location].integrity);
        return {
          path: location,
          name: location.split("node_modules/").at(-1),
          version: entry.version,
          integrity: entry.integrity,
        };
      });
    expect([...report.runtimeDependencies].sort((a, b) => a.path.localeCompare(b.path))).toEqual(
      dependencies.sort((a, b) => a.path.localeCompare(b.path)),
    );
    expect(dependencies.map(({ name }) => name)).not.toEqual([]);
    for (const { name } of dependencies)
      expect(name).not.toMatch(/^(?:@earendil-works\/|eslint$|prettier$|typescript$|vitest$)/);
  });

  it("installs the runtime shrinkwrap without source compilation or a developer dependency tree", () => {
    const lock = readJson(path.join(app, "npm-shrinkwrap.json"));
    for (const [location, entry] of Object.entries(lock.packages)) {
      if (!location) continue;
      expect(readJson(path.join(app, location, "package.json")).version).toBe(entry.version);
    }
    run("npm", ["ls", "--omit=dev", "--all"], { cwd: app, env: fixture.env });
    expect(fs.existsSync(path.join(app, "src"))).toBe(false);
    expect(fs.existsSync(path.join(app, "node_modules", ".bin", "tsc"))).toBe(false);
  });

  it("excludes synthetic private/diagnostic source canaries and refuses to overwrite a nonempty output", () => {
    const snapshot = path.join(fixture.root, "source-snapshot");
    const report = readJson(fixture.inventory);
    const inputs = new Set([
      ...Object.keys(report.inputs),
      "scripts/package-artifact.mjs",
      ...report.runtimeDependencies.map(({ path: location }) => `${location}/package.json`),
    ]);
    for (const input of inputs) {
      const target = path.join(snapshot, input);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(REPO, input), target);
    }
    const marker = "SYNTHETIC-T18-PRIVATE-CANARY-MUST-NOT-SHIP";
    for (const input of [".env", ".pi/settings.json", "dist/storage/test-facility.js"]) {
      const target = path.join(snapshot, input);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, marker);
    }
    const out = path.join(fixture.root, "canary-artifact");
    fs.mkdirSync(out);
    const script = path.join(snapshot, "scripts/package-artifact.mjs");
    run(process.execPath, [script, "--out", out], { cwd: snapshot, env: fixture.env });
    const archive = path.join(out, path.basename(fixture.archive));
    const members = inspectArchive(archive);
    assertSafeMembers(members);
    expect(members.map(({ path }) => path)).toEqual(fixture.members.map(({ path }) => path));
    const original = fs.readFileSync(archive);
    expect(gunzipSync(original).includes(Buffer.from(marker))).toBe(false);
    const refusal = spawnSync(process.execPath, [script, "--out", out], {
      cwd: snapshot,
      env: fixture.env,
      encoding: "utf8",
      timeout: 30000,
    });
    expect(refusal.error).toBeUndefined();
    expect(refusal.signal).toBeNull();
    expect(refusal.status).not.toBe(0);
    expect(fs.readFileSync(archive)).toEqual(original);
  });

  // The original consumer-route run was 4/5: npm11.19 ignored its embedded
  // shrinkwrap and advanced three transitive versions. The user selected only
  // extract-and-ci; exact root-authoritative lock/install assertions stay above.
  it("exposes executable installed bin targets and the delivered trusted CLI help/usage", () => {
    for (const target of Object.values(BINS)) {
      const bin = path.join(app, target);
      expect(fs.statSync(bin).mode & 0o7777).toBe(0o755);
      expect(fs.readFileSync(bin, "utf8").startsWith("#!/usr/bin/env node\n")).toBe(true);
    }
    const cli = path.join(app, BINS["gymtracka-mcp"]);
    const help = run(cli, ["--help"], { cwd: fixture.root, env: fixture.env });
    expect(help.stdout).toBe("");
    expect(help.stderr).toMatch(/^Usage:/);
    expect(help.stderr).not.toContain("retire-operation");
    expect(help.stderr).toContain("account-status");
    expect(help.stderr).toContain("profile-remove");
    const usage = spawnSync(cli, [], {
      cwd: fixture.root,
      env: fixture.env,
      encoding: "utf8",
      timeout: 15000,
    });
    expect(usage.error).toBeUndefined();
    expect(usage.signal).toBeNull();
    expect(usage.status).toBe(2);
    expect(usage.stdout).toBe("");
    expect(usage.stderr).toBe(help.stderr);
  });

  it("serves the exact safe unconfigured MCP surface through an installed bin from unrelated CWD and exits on EOF", async () => {
    const bin = path.join(app, BINS["gymtracka-mcp-server"]);
    const transport = new StdioClientTransport({
      command: bin,
      args: [],
      cwd: fixture.root,
      env: fixture.env,
      stderr: "pipe",
    });
    let stderr = "";
    transport.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    const client = new Client(
      { name: "synthetic-t18-package-sdk", version: "0.0.0" },
      { jsonSchemaValidator: ajvValidator() },
    );
    try {
      await client.connect(transport);
      expect(client.getServerVersion()).toEqual({ name: "gymtracka-mcp", version: "0.0.0" });
      expect(client.getServerCapabilities()).toEqual({ tools: {} });
      expect((await client.listTools()).tools.map(({ name }) => name)).toEqual(
        CALLS.map(([name]) => name),
      );
      for (const [name, args] of CALLS) {
        const result = await client.callTool({ name, arguments: args });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          ok: false,
          error: { code: "configuration_required", retryable: false },
        });
        expect(result.content).toEqual([
          { type: "text", text: JSON.stringify(result.structuredContent) },
        ]);
      }
    } finally {
      await client.close();
    }
    expect(stderr).toBe("");
    // Observe exit directly: an SDK close's signal fallback cannot count as EOF.
    const child = spawn(bin, [], { cwd: fixture.root, env: fixture.env, stdio: "pipe" });
    const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
    let eofStderr = "";
    child.stderr.on("data", (chunk) => (eofStderr += chunk.toString()));
    const exited = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Installed initialize/EOF observation timed out")),
        5000,
      );
    });
    let completed = false;
    try {
      child.stdin.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "synthetic-t18-eof", version: "0.0.0" },
          },
        }) + "\n",
      );
      expect(JSON.parse((await Promise.race([lines.next(), deadline])).value)).toMatchObject({
        id: 1,
        result: { serverInfo: { name: "gymtracka-mcp", version: "0.0.0" } },
      });
      child.stdin.end();
      expect(await Promise.race([exited, deadline])).toEqual({ code: 0, signal: null });
      expect(eofStderr).toBe("");
      completed = true;
    } finally {
      clearTimeout(timer);
      if (!completed && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      await exited;
    }
  });
});

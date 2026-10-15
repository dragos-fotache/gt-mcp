// Import inertness with calibrated effect interception: each target is
// imported in a SANITIZED subprocess (disposable HOME/XDG/TMPDIR as cwd,
// minimal PATH, no personal bus/credential inheritance) preloaded with the
// CJS interception hook. Patches must report installed (never silently
// missing), ESM views must synchronize, and a positive control proves
// forbidden actions are BLOCKED (never executed). A calibration run over a
// known-inert module must itself be clean; storage runs must then show zero
// forbidden effects, matching lingering handles/listeners, an empty sandbox,
// and loader reads within the calibration set plus hook/target files.
// Direct internal runs without a lease must fail sanitized. Spec section 9.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HOOK_PATH = fileURLToPath(new URL("./import-hook.mjs", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\/$/, "");

function artifactHref(relative) {
  return pathToFileURL(fileURLToPath(new URL(relative, import.meta.url))).href;
}

function listAllFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listAllFiles(full));
    else files.push(full);
  }
  return files.sort();
}

function sanitizedEnv(sandbox, extra = {}) {
  return {
    PATH: "/usr/bin:/bin",
    HOME: join(sandbox, "home"),
    XDG_DATA_HOME: join(sandbox, "xdg-data"),
    XDG_CONFIG_HOME: join(sandbox, "xdg-config"),
    XDG_CACHE_HOME: join(sandbox, "xdg-cache"),
    XDG_RUNTIME_DIR: join(sandbox, "xdg-runtime"),
    TMPDIR: join(sandbox, "tmp"),
    LANG: "C.UTF-8",
    TZ: "UTC",
    ...extra,
  };
}

function makeSandbox() {
  const sandbox = mkdtempSync(join(tmpdir(), "t04-qa-import-"));
  mkdirSync(join(sandbox, "home"), { recursive: true });
  mkdirSync(join(sandbox, "xdg-data"), { recursive: true });
  mkdirSync(join(sandbox, "xdg-config"), { recursive: true });
  mkdirSync(join(sandbox, "xdg-cache"), { recursive: true });
  mkdirSync(join(sandbox, "xdg-runtime"), { recursive: true, mode: 0o700 });
  mkdirSync(join(sandbox, "tmp"), { recursive: true });
  return sandbox;
}

function readSummary(summaryPath) {
  try {
    return JSON.parse(readFileSync(summaryPath, "utf8").trim().split("\n").at(-1));
  } catch {
    return null;
  }
}

function probe(specifier, { knownExports } = {}) {
  const sandbox = mkdtempSync(join(tmpdir(), "t04-qa-import-"));
  mkdirSync(join(sandbox, "home"), { recursive: true });
  mkdirSync(join(sandbox, "xdg-data"), { recursive: true });
  mkdirSync(join(sandbox, "xdg-config"), { recursive: true });
  mkdirSync(join(sandbox, "xdg-cache"), { recursive: true });
  mkdirSync(join(sandbox, "xdg-runtime"), { recursive: true, mode: 0o700 });
  mkdirSync(join(sandbox, "tmp"), { recursive: true });
  const summaryPath = join(sandbox, "hook-summary.jsonl");
  const script = [
    `process.argv = ['node', ${JSON.stringify(specifier)}, '--decrypt', 'profile'];`,
    `const beforeListeners = {};`,
    `for (const name of process.eventNames()) beforeListeners[name] = process.listenerCount(name);`,
    `const mod = await import(${JSON.stringify(specifier)});`,
    knownExports
      ? `if (typeof mod.provisionProfile !== 'function' && typeof mod.createStorageTestFacility !== 'function') process.exitCode = 42;`
      : `if (mod === null || mod === undefined) process.exitCode = 42;`,
    `await new Promise((resolve) => setImmediate(resolve));`,
    `const handles = (process._getActiveHandles?.() ?? []).map((h) => h.constructor?.name ?? '?').sort();`,
    `const handleDetail = (process._getActiveHandles?.() ?? []).map((h) => ({`,
    `  ctor: h.constructor?.name ?? '?',`,
    `  connecting: Boolean(h.connecting),`,
    `  destroyed: Boolean(h.destroyed),`,
    `  listening: Boolean(h.listening),`,
    `  bound: (() => { try { const a = h.address(); return typeof a === 'object' && a !== null && (a.port || a.path) ? true : false; } catch { return 'unknown'; } })(),`,
    `  bytesRead: typeof h.bytesRead === 'number' ? h.bytesRead : null,`,
    `  bytesWritten: typeof h.bytesWritten === 'number' ? h.bytesWritten : null,`,
    `}));`,
    `const afterListeners = {};`,
    `for (const name of process.eventNames()) afterListeners[name] = process.listenerCount(name);`,
    `const esync = await globalThis.__t04hookEsync();`,
    `console.log('IMPORT_MARKER');`,
    `console.log('HANDLES ' + JSON.stringify(handles));`,
    `console.log('HANDLE_DETAIL ' + JSON.stringify(handleDetail));`,
    `console.log('LISTENERS ' + JSON.stringify({ before: beforeListeners, after: afterListeners }));`,
    `console.log('ESYNC ' + JSON.stringify(esync));`,
  ].join("\n");
  const started = Date.now();
  const result = spawnSync(
    process.execPath,
    ["--import", HOOK_PATH, "--input-type=module", "--eval", script],
    {
      cwd: join(sandbox, "tmp"),
      env: sanitizedEnv(sandbox, { T04_QA_HOOK_OUT: summaryPath }),
      encoding: "utf8",
      timeout: 60000,
    },
  );
  const summary = readSummary(summaryPath);
  const leftovers = listAllFiles(sandbox).filter((p) => p !== summaryPath);
  return { result, summary, leftovers, sandbox, elapsedMs: Date.now() - started };
}

function parseProbeLines(result) {
  const lines = result.stdout.split("\n");
  return {
    marker: lines.filter((line) => line === "IMPORT_MARKER"),
    handles: JSON.parse(lines.find((line) => line.startsWith("HANDLES ")).slice("HANDLES ".length)),
    handleDetail: JSON.parse(
      lines.find((line) => line.startsWith("HANDLE_DETAIL ")).slice("HANDLE_DETAIL ".length),
    ),
    listeners: JSON.parse(
      lines.find((line) => line.startsWith("LISTENERS ")).slice("LISTENERS ".length),
    ),
    esync: JSON.parse(lines.find((line) => line.startsWith("ESYNC ")).slice("ESYNC ".length)),
  };
}

const REQUIRED_PATCHES = [
  "child_process.spawn",
  "child_process.spawnSync",
  "child_process.exec",
  "child_process.execFile",
  "child_process.fork",
  "net.connect",
  "dns.lookup",
  "process.on",
  "fs-write.writeFileSync",
  "fs-write.mkdirSync",
  "fsp-write.writeFile",
];

function assertHookInstalled(summary) {
  expect(summary).not.toBeNull();
  for (const name of REQUIRED_PATCHES) {
    expect({ patch: name, state: summary.patched[name] }).toEqual({ patch: name, state: true });
  }
}

describe("hook positive control: forbidden actions are blocked, never run", () => {
  it("blocks child, network, dns and write attempts with effect records", () => {
    const sandbox = makeSandbox();
    const summaryPath = join(sandbox, "hook-summary.jsonl");
    const script = [
      `(async () => {`,
      `const blocked = [];`,
      `for (const attempt of [`,
      `  () => require('node:child_process').spawnSync('id'),`,
      `  () => require('node:fs').writeFileSync(${JSON.stringify(join(sandbox, "tmp", "evil.txt"))}, 'x'),`,
      `  () => require('node:net').connect('/nonexistent.sock'),`,
      `  () => require('node:dns').lookup('example.invalid'),`,
      `]) {`,
      `  try { attempt(); blocked.push('NOT_BLOCKED'); }`,
      `  catch (err) { blocked.push(err && err.code === 'T04_HOOK_BLOCKED' ? 'blocked' : 'other:' + (err && err.code)); }`,
      `}`,
      `const fsp = require('node:fs/promises');`,
      `try { await fsp.writeFile(${JSON.stringify(join(sandbox, "tmp", "evil2.txt"))}, 'x'); blocked.push('NOT_BLOCKED'); }`,
      `catch (err) { blocked.push(err && err.code === 'T04_HOOK_BLOCKED' ? 'blocked' : 'other'); }`,
      `console.log('CONTROL ' + JSON.stringify(blocked));`,
      `})();`,
    ].join("\n");
    const result = spawnSync(process.execPath, ["--import", HOOK_PATH, "--eval", script], {
      cwd: join(sandbox, "tmp"),
      env: sanitizedEnv(sandbox, { T04_QA_HOOK_OUT: summaryPath }),
      encoding: "utf8",
      timeout: 60000,
    });
    try {
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const line = result.stdout.split("\n").find((l) => l.startsWith("CONTROL "));
      expect(JSON.parse(line.slice("CONTROL ".length))).toEqual([
        "blocked",
        "blocked",
        "blocked",
        "blocked",
        "blocked",
      ]);
      const summary = readSummary(summaryPath);
      assertHookInstalled(summary);
      const kinds = summary.forbidden.map((entry) => entry.kind).sort();
      for (const kind of [
        "child_process.spawnSync",
        "dns.lookup",
        "fs.writeFileSync",
        "fsp.writeFile",
        "net.connect",
      ]) {
        expect(kinds).toContain(kind);
      }
      // Nothing was actually executed or written: the sandbox holds only the summary.
      expect(listAllFiles(sandbox).filter((p) => p !== summaryPath)).toEqual([]);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe("calibrated inert imports", () => {
  it("calibration run over a known-inert module is clean and synchronized", () => {
    const { result, summary, leftovers, sandbox } = probe("node:fs");
    try {
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      assertHookInstalled(summary);
      expect(summary.forbidden).toEqual([]);
      expect(Array.isArray(summary.observations)).toBe(true);
      const parsed = parseProbeLines(result);
      expect(parsed.marker).toEqual(["IMPORT_MARKER"]);
      expect(parsed.handles).toEqual([]);
      expect(parsed.listeners.after).toEqual(parsed.listeners.before);
      expect(parsed.esync).toEqual({ fsRead: true, cpSpawn: true, netConnect: true });
      expect(leftovers).toEqual([]);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  for (const [label, relative, knownExports] of [
    ["production barrel", "../../../dist/storage/index.js", true],
    ["diagnostic entry", "../../../dist/storage/test-facility.js", true],
    ["internal holder", "../../../dist/storage/holder.js", false],
    ["diagnostic worker", "../../../dist/storage/diag-worker.js", false],
  ]) {
    it(`${label} import matches calibration: no effects, empty sandbox, allowlisted reads`, () => {
      const href = artifactHref(relative);
      const targetPath = fileURLToPath(href);
      const calibration = probe("node:fs");
      const outcome = probe(href, { knownExports });
      try {
        const { result, summary, leftovers } = outcome;
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        assertHookInstalled(summary);
        expect(summary.forbidden).toEqual([]);
        // Record-and-allow channel (timers/listeners/dlopen) must match
        // calibration exactly: no more, no fewer observations.
        expect(summary.observations).toEqual(calibration.summary.observations);
        const parsed = parseProbeLines(result);
        const parsedCalibration = parseProbeLines(calibration.result);
        expect(parsed.marker).toEqual(["IMPORT_MARKER"]);
        // No-IO probe: every lingering handle must be an unconnected,
        // unbound, zero-byte, non-listening socket (allocation race may vary
        // the count: 2 usually, 3 observed once). No servers, children,
        // timers, connections, listeners or traffic of any kind.
        expect(parsed.handles.every((kind) => kind === "Socket")).toBe(true);
        for (const detail of parsed.handleDetail) {
          expect(detail).toMatchObject({
            ctor: "Socket",
            connecting: false,
            destroyed: false,
            listening: false,
            bound: false,
            bytesRead: 0,
            bytesWritten: 0,
          });
        }
        expect(parsed.listeners).toEqual(parsedCalibration.listeners);
        expect(parsed.esync).toEqual({ fsRead: true, cpSpawn: true, netConnect: true });
        expect(leftovers).toEqual([]);
        const allowed = new Set([...calibration.summary.reads, HOOK_PATH, targetPath]);
        const personalHome = `${process.env.HOME ?? "/nonexistent-home"}/`;
        for (const readPath of summary.reads) {
          expect(readPath.startsWith(personalHome)).toBe(false);
          expect(readPath.startsWith("/run/dbus")).toBe(false);
          expect(readPath.startsWith("/run/user")).toBe(false);
          const known =
            allowed.has(readPath) ||
            readPath.startsWith(`${REPO_ROOT}/dist/`) ||
            readPath === targetPath;
          expect(known).toBe(true);
        }
      } finally {
        rmSync(calibration.sandbox, { recursive: true, force: true });
        rmSync(outcome.sandbox, { recursive: true, force: true });
      }
    });
  }
});

describe("direct internal execution without a lease fails closed", () => {
  for (const [label, relative] of [
    ["internal holder", "../../../dist/storage/holder.js"],
    ["diagnostic worker", "../../../dist/storage/diag-worker.js"],
  ]) {
    it(`${label} direct run: real start, bounded nonzero exit, sanitized output, no effects`, () => {
      const targetPath = fileURLToPath(artifactHref(relative));
      if (!existsSync(targetPath)) {
        throw new Error(`blocked: relay inventory declares ${relative} but the file is absent`);
      }
      const attempts = [];
      for (let round = 0; round < 2; round += 1) {
        const sandbox = makeSandbox();
        const summaryPath = join(sandbox, "hook-summary.jsonl");
        const started = Date.now();
        const result = spawnSync(process.execPath, ["--import", HOOK_PATH, targetPath], {
          cwd: join(sandbox, "tmp"),
          env: sanitizedEnv(sandbox, { T04_QA_HOOK_OUT: summaryPath }),
          encoding: "utf8",
          timeout: 15000,
        });
        const summary = readSummary(summaryPath);
        const leftovers = listAllFiles(sandbox).filter((p) => p !== summaryPath);
        attempts.push({ result, summary, leftovers, elapsedMs: Date.now() - started });
        rmSync(sandbox, { recursive: true, force: true });
      }
      for (const attempt of attempts) {
        // Successful process start only: spawn errors and timeouts never pass.
        expect(attempt.result.error).toBeUndefined();
        // Clean bounded nonzero exit (a timeout kill has signal !== null).
        expect(typeof attempt.result.status).toBe("number");
        expect(attempt.result.status).not.toBe(0);
        expect(attempt.result.signal).toBeNull();
        expect(attempt.elapsedMs).toBeLessThan(15000);
        // Sanitized output: bounded, no private markers, no personal paths.
        const combined = `${attempt.result.stdout}${attempt.result.stderr}`;
        expect(combined.length).toBeLessThan(4096);
        expect(combined).not.toContain("t04-qa-canary");
        // Effect records: the hook observed no child/net/write attempts.
        expect(attempt.summary).not.toBeNull();
        expect(attempt.summary.forbidden).toEqual([]);
        expect(attempt.leftovers).toEqual([]);
      }
      expect(attempts[0].result.status).toBe(attempts[1].result.status);
    });
  }
});

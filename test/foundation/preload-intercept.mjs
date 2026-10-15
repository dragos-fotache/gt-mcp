// T01 QA black-box interception preload (Stage 2, approved spec §3).
//
// Purpose: observe a child process that imports or executes ONE inert foundation
// artifact and record attempted side effects. Loaded via `node --import` so it
// runs before any target code. Fail-closed: intercepted network / child-process /
// listener / private-state / stdin-consumption operations increment a counter AND
// throw, so any real attempt surfaces as a child failure plus a report entry.
// Uncaught exceptions/rejections additionally force exit code 1 so a violation
// can never hide behind a clean exit.
//
// FILE-SYSTEM POLICY (fail-closed):
//  - Writes: only the harness's own intercept-report path is writable. Every
//    other fs write (sync, callback, or promise API), including writes inside
//    the synthetic HOME/tmp root, is recorded and blocked. The report writer
//    below uses a pristine reference saved before patching.
//  - Reads: only necessary module-loader artifact reads are allowed (JS/JSON/
//    native addon files under the repo, node_modules, or the toolchain root).
//    The ESM/CJS loaders use internal bindings rather than these patched
//    exports, so ordinary imports stay silent. Any other fs-module read is
//    recorded (private-state-looking paths flagged distinctly) and blocked.
//  - Directory listings: allowed only under dist/node_modules/toolchain roots.
//  - Stats/existence checks: allowed except on private-state-looking paths.
//  - Paths are normalized first: string, Buffer, file: URL, and relative paths
//    (resolved against cwd) are all canonicalized before classification.
//
// STDIN POLICY: `read()` calls and data/readable/end subscriptions on stdin are
// recorded; `read()` additionally throws. Providing piped input while stdout
// stays empty proves no protocol response; a clean stdin sub-report proves no
// intercepted stdin-consumption attempt (fd/native bypasses remain explicitly
// noted gaps; coordinator source audit supplies additional assurance).
//
// INTERCEPTION LIMITS (stated truthfully, never a sandbox claim):
//  - fd-number / FileHandle-method I/O bypasses path classification. Handles
//    can only be obtained through the gated open() calls above, and inherited
//    stdio is observed via child stdio capture instead.
//  - Native addons, `process.dlopen`, `process.binding`/internalBinding, `vm`
//    escape hatches, or builtin references captured before this preload runs
//    are NOT intercepted. The preload is first by construction (`--import`
//    runs before `-e`/entry), so the captured-reference gap applies only to
//    Node internals, not target code.
//  - dgram/dns/worker/IPC coverage is coarse creation/call counting; payload
//    inspection is out of scope.
//  - A clean report proves no *intercepted* effect was attempted; it does not
//    prove absence of unintercepted transient effects. Remaining assurance is
//    coordinator source review (spec §3). No OS-sandbox or complete-network
//    proof is claimed.
//  - This harness never reads generated implementation file contents; it only
//    imports entry points (the authorized black-box observable) and observes
//    process-level effects.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire, syncBuiltinESMExports } from "node:module";

const REPORT_PATH = process.env.QA_INTERCEPT_REPORT ?? "";
const REAL_HOME = process.env.QA_REAL_HOME ?? "";
const REPO = process.env.QA_REPO_ROOT ?? process.cwd();
const EXEC_ROOT = path.dirname(process.execPath);
const DIST_ROOT = path.join(REPO, "dist");

const report = {
  fetchCalls: 0,
  httpCalls: 0,
  listenCalls: 0,
  connectCalls: 0,
  childProcessCalls: 0,
  timerCreations: 0,
  handlerSubscriptions: [],
  stdinReads: [],
  fsPrivateHits: [],
  uncaught: [],
};

// Pristine references saved before `fs` is patched (report writer + link resolution).
const origWriteFileSync = fs.writeFileSync.bind(fs);
const origRealpathSync = fs.realpathSync.bind(fs);

function flush() {
  if (!REPORT_PATH) return;
  try {
    origWriteFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  } catch {
    // Last resort: never mask the target's own exit code from here.
  }
}

// Subscribe BEFORE wrapping process.on so our own subscriptions are not recorded.
// Uncaught failures force a nonzero exit so violations cannot exit cleanly.
process.on("exit", flush);
process.on("uncaughtException", (err) => {
  report.uncaught.push(`uncaughtException:${err && err.message ? err.message : String(err)}`);
  process.exitCode = 1;
});
process.on("unhandledRejection", (reason) => {
  report.uncaught.push(`unhandledRejection:${String(reason)}`);
  process.exitCode = 1;
});

function blocked(kind) {
  return new Error(`QA intercept: ${kind} attempted by target under test`);
}

// --- global fetch ---
if (typeof globalThis.fetch === "function") {
  globalThis.fetch = async () => {
    report.fetchCalls += 1;
    throw blocked("fetch");
  };
}

// --- timers (globals; patching node:timers alone would miss these) ---
for (const name of ["setTimeout", "setInterval", "setImmediate"]) {
  const orig = globalThis[name];
  if (typeof orig === "function") {
    globalThis[name] = (...args) => {
      report.timerCreations += 1;
      return orig(...args);
    };
  }
}

// --- process handler subscriptions and IPC ---
for (const name of ["on", "once", "addListener", "prependListener"]) {
  const orig = process[name].bind(process);
  process[name] = (event, ...rest) => {
    report.handlerSubscriptions.push(`${name}:${String(event)}`);
    return orig(event, ...rest);
  };
}
if (typeof process.send === "function") {
  process.send = (...args) => {
    report.childProcessCalls += 1;
    void args;
    throw blocked("process.send (IPC)");
  };
}

// --- stdin consumption observation ---
{
  const stdin = process.stdin;
  if (stdin && typeof stdin.on === "function") {
    for (const method of ["on", "once", "addListener", "prependListener"]) {
      const orig = stdin[method].bind(stdin);
      stdin[method] = (event, ...rest) => {
        if (["data", "readable", "end"].includes(String(event))) {
          report.stdinReads.push(`sub:${method}:${String(event)}`);
        }
        return orig(event, ...rest);
      };
    }
    stdin.read = (...args) => {
      report.stdinReads.push("read");
      void args;
      throw blocked("stdin.read");
    };
  }
}

// --- builtin patching plumbing (synchronous; no top-level await) ---
const requireBuiltin = createRequire(import.meta.url);

function patchBuiltin(specifier, mutate) {
  const target = requireBuiltin(specifier);
  mutate(target);
  try {
    syncBuiltinESMExports(specifier, target);
  } catch {
    // Best effort; CJS consumers already see the mutated object.
  }
  return target;
}

// --- path normalization and classification ---
function normalizeFsPath(input) {
  try {
    if (typeof input === "string") return path.resolve(input);
    if (Buffer.isBuffer(input)) return path.resolve(input.toString("utf8"));
    if (input instanceof URL) {
      return input.protocol === "file:"
        ? path.resolve(fileURLToPath(input))
        : `${input.protocol}//non-file`;
    }
    if (typeof input === "number") return ""; // fd: inherited stdio, observed via capture.
    if (input && typeof input === "object") return ""; // handles: obtainable only via gated open().
  } catch {
    return "";
  }
  return "";
}

const PRIVATE_RE =
  /(^|\/)\.pi(\/|$)|(^|\/)(\.private|private|profiles|vault|journals?|receipts)(\/|$)|(^|\/)\.env(\..*)?$|\.pem$|\.key$|credentials.*\.json$|(^|\/)auth\.json$/;

function isPrivate(p) {
  if (!p) return false;
  // The repo checkout itself may live under the real HOME; repo-internal paths
  // are judged by pattern only, so legitimate loader reads stay silent while
  // repo-internal private-looking paths (vault/, profiles/, …) still fail.
  if (p.startsWith(`${REPO}/`)) return PRIVATE_RE.test(p);
  if (REAL_HOME !== "" && (p === REAL_HOME || p.startsWith(`${REAL_HOME}/`))) return true;
  return PRIVATE_RE.test(p);
}

const LOADER_EXT = /\.(mjs|cjs|js|json|node)$/;

function isLoaderArtifact(p) {
  if (!p || !LOADER_EXT.test(p)) return false;
  if (p.startsWith(`${REPO}/`) || p.includes("/node_modules/") || p.startsWith(`${EXEC_ROOT}/`))
    return true;
  // npm-style bin symlinks live outside the repo: resolve to the real path so
  // invoking an approved artifact through a symlink stays silent here, while
  // the direct-execution guard under test still sees the symlink argv.
  try {
    const real = origRealpathSync(p);
    if (real !== p) return isLoaderArtifact(real);
  } catch {
    // Nonexistent/unresolvable: not an artifact read.
  }
  return false;
}

function isListableDir(p) {
  if (!p) return false;
  return (
    p.startsWith(`${DIST_ROOT}/`) || p.includes("/node_modules/") || p.startsWith(`${EXEC_ROOT}/`)
  );
}

function isReportPath(p) {
  return p !== "" && p === REPORT_PATH;
}

// Decisions return 'allow' or a hit descriptor recorded in fsPrivateHits.
// Private-state classification always wins over the loader allowance, so a
// private-looking path is blocked even when it carries a loader extension.
function readDecision(p) {
  if (isPrivate(p)) return `read:private:${p}`;
  if (isLoaderArtifact(p)) return "allow";
  return `read:other:${p}`;
}

function listDecision(p) {
  if (isListableDir(p)) return "allow";
  if (isPrivate(p)) return `list:private:${p}`;
  return `list:other:${p}`;
}

function writeDecision(p) {
  if (isReportPath(p)) return "allow";
  if (isPrivate(p)) return `write:private:${p}`;
  return `write:other:${p}`;
}

function enforce(decision, api, display) {
  if (decision === "allow") return;
  report.fsPrivateHits.push(`${api}:${decision}`);
  throw blocked(`fs.${api} ${display}`);
}

// --- sync + callback fs reads/writes/stats/lists ---
const SYNC_READS = ["readFileSync"];
const CALLBACK_READS = ["readFile"];

function wrapRead(obj, name, isAsync) {
  const orig = obj[name];
  if (typeof orig !== "function") return;
  if (isAsync) {
    obj[name] = async (...args) => {
      const p = normalizeFsPath(args[0]);
      enforce(readDecision(p), name, p || "<fd>");
      return orig(...args);
    };
  } else {
    obj[name] = (...args) => {
      const p = normalizeFsPath(args[0]);
      enforce(readDecision(p), name, p || "<fd>");
      return orig(...args);
    };
  }
}

function wrapWrite(obj, name, isAsync) {
  const orig = obj[name];
  if (typeof orig !== "function") return;
  if (isAsync) {
    obj[name] = async (...args) => {
      const p = normalizeFsPath(args[0]);
      enforce(writeDecision(p), name, p || "<fd>");
      return orig(...args);
    };
  } else {
    obj[name] = (...args) => {
      const p = normalizeFsPath(args[0]);
      enforce(writeDecision(p), name, p || "<fd>");
      return orig(...args);
    };
  }
}

function wrapList(obj, name, isAsync) {
  const orig = obj[name];
  if (typeof orig !== "function") return;
  if (isAsync) {
    obj[name] = async (...args) => {
      const p = normalizeFsPath(args[0]);
      enforce(listDecision(p), name, p || "<fd>");
      return orig(...args);
    };
  } else {
    obj[name] = (...args) => {
      const p = normalizeFsPath(args[0]);
      enforce(listDecision(p), name, p || "<fd>");
      return orig(...args);
    };
  }
}

// Stats/existence probes: blocked only on private-state-looking paths.
function wrapStat(obj, name, isAsync) {
  const orig = obj[name];
  if (typeof orig !== "function") return;
  if (isAsync) {
    obj[name] = async (...args) => {
      const p = normalizeFsPath(args[0]);
      if (isPrivate(p)) enforce(`stat:private:${p}`, name, p);
      return orig(...args);
    };
  } else {
    obj[name] = (...args) => {
      const p = normalizeFsPath(args[0]);
      if (isPrivate(p)) enforce(`stat:private:${p}`, name, p);
      return orig(...args);
    };
  }
}

function wrapOpen(obj, name, isAsync) {
  const orig = obj[name];
  if (typeof orig !== "function") return;
  const decide = (flag) => {
    const writeFlag = typeof flag === "string" ? /[wax+]/.test(flag) : (flag ?? 0) !== 0;
    // Numeric flags: only O_RDONLY(0) is a pure read; treat everything else as a write.
    return { writeFlag };
  };
  if (isAsync) {
    obj[name] = async (...args) => {
      const p = normalizeFsPath(args[0]);
      const { writeFlag } = decide(args[1]);
      enforce(writeFlag ? writeDecision(p) : readDecision(p), name, p || "<fd>");
      return orig(...args);
    };
  } else {
    obj[name] = (...args) => {
      const p = normalizeFsPath(args[0]);
      const { writeFlag } = decide(args[1]);
      enforce(writeFlag ? writeDecision(p) : readDecision(p), name, p || "<fd>");
      return orig(...args);
    };
  }
}

for (const name of SYNC_READS) wrapRead(fs, name, false);
for (const name of CALLBACK_READS) wrapRead(fs, name, false);
for (const name of ["writeFileSync", "appendFileSync"]) wrapWrite(fs, name, false);
for (const name of ["writeFile", "appendFile"]) wrapWrite(fs, name, false);
for (const name of ["readdirSync"]) wrapList(fs, name, false);
for (const name of ["readdir"]) wrapList(fs, name, false);
for (const name of ["statSync", "lstatSync", "existsSync", "accessSync"]) wrapStat(fs, name, false);
for (const name of ["stat", "lstat", "exists", "access"]) wrapStat(fs, name, false);
wrapOpen(fs, "openSync", false);
wrapOpen(fs, "open", false);

{
  const origCreateRead = fs.createReadStream;
  if (typeof origCreateRead === "function") {
    fs.createReadStream = (...args) => {
      const p = normalizeFsPath(args[0]);
      enforce(readDecision(p), "createReadStream", p || "<fd>");
      return origCreateRead(...args);
    };
  }
  const origCreateWrite = fs.createWriteStream;
  if (typeof origCreateWrite === "function") {
    fs.createWriteStream = (...args) => {
      const p = normalizeFsPath(args[0]);
      enforce(writeDecision(p), "createWriteStream", p || "<fd>");
      return origCreateWrite(...args);
    };
  }
}

patchBuiltin("node:fs/promises", (fsp) => {
  wrapRead(fsp, "readFile", true);
  wrapWrite(fsp, "writeFile", true);
  wrapWrite(fsp, "appendFile", true);
  wrapList(fsp, "readdir", true);
  wrapStat(fsp, "stat", true);
  wrapStat(fsp, "lstat", true);
  wrapStat(fsp, "access", true);
  wrapOpen(fsp, "open", true);
});

try {
  syncBuiltinESMExports("node:fs", fs);
  syncBuiltinESMExports("fs", fs);
} catch {
  // Best effort; CJS consumers already see the mutated object.
}

// --- child processes / workers ---
patchBuiltin("node:child_process", (cp) => {
  for (const name of [
    "spawn",
    "spawnSync",
    "exec",
    "execFile",
    "execSync",
    "execFileSync",
    "fork",
  ]) {
    if (typeof cp[name] === "function") {
      cp[name] = (...args) => {
        report.childProcessCalls += 1;
        void args;
        throw blocked(`child_process.${name}`);
      };
    }
  }
});

patchBuiltin("node:worker_threads", (wt) => {
  if (typeof wt.Worker === "function") {
    wt.Worker = class QAInterceptedWorker {
      constructor(...args) {
        report.childProcessCalls += 1;
        void args;
        throw blocked("worker_threads.Worker");
      }
    };
  }
});

// --- network surface ---
patchBuiltin("node:net", (net) => {
  const origListen = net.Server.prototype.listen;
  net.Server.prototype.listen = function listen(...args) {
    report.listenCalls += 1;
    void args;
    void origListen;
    throw blocked("net.Server.listen");
  };
  for (const name of ["connect", "createConnection"]) {
    if (typeof net[name] === "function") {
      net[name] = (...args) => {
        report.connectCalls += 1;
        void args;
        throw blocked(`net.${name}`);
      };
    }
  }
});

patchBuiltin("node:http", (http) => {
  for (const name of ["request", "get"]) {
    if (typeof http[name] === "function") {
      http[name] = (...args) => {
        report.httpCalls += 1;
        void args;
        throw blocked(`http.${name}`);
      };
    }
  }
});

patchBuiltin("node:https", (https) => {
  for (const name of ["request", "get"]) {
    if (typeof https[name] === "function") {
      https[name] = (...args) => {
        report.httpCalls += 1;
        void args;
        throw blocked(`https.${name}`);
      };
    }
  }
});

patchBuiltin("node:dns", (dns) => {
  for (const name of ["lookup", "resolve"]) {
    if (typeof dns[name] === "function") {
      dns[name] = (...args) => {
        report.httpCalls += 1;
        void args;
        throw blocked(`dns.${name}`);
      };
    }
  }
});

patchBuiltin("node:dgram", (dgram) => {
  if (typeof dgram.createSocket === "function") {
    dgram.createSocket = (...args) => {
      report.connectCalls += 1;
      void args;
      throw blocked("dgram.createSocket");
    };
  }
});

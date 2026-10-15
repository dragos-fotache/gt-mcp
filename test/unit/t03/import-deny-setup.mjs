// T03 QA import deny/record setup (own harness, synthetic use only).
//
// Importing this module has no side effects: it only defines installProbe().
// installProbe() arms deny/record wrappers over global capabilities and risky
// builtin methods, then returns { violations, restore, summary }. Ordinary
// module loading is never blocked: only the listed mutation/egress/spawn/write
// paths throw.
//
// This instrumentation is NOT an OS sandbox; coordinator source audit
// complements it. No production/implementation reads; no network use.

import { createRequire, syncBuiltinESMExports } from "node:module";

const builtinRequire = createRequire(import.meta.url);

// Representative deny lists by family. Reads stay permitted so ordinary
// module loading works; only mutation/egress/spawn/write paths deny.
const METHOD_DENY_LIST = Object.freeze({
  "node:child_process": [
    "spawn",
    "spawnSync",
    "exec",
    "execSync",
    "execFile",
    "execFileSync",
    "fork",
  ],
  "node:worker_threads": ["Worker"],
  "node:fs": [
    "writeFile",
    "writeFileSync",
    "appendFile",
    "appendFileSync",
    "mkdir",
    "mkdirSync",
    "mkdtemp",
    "mkdtempSync",
    "rm",
    "rmSync",
    "unlink",
    "unlinkSync",
    "rmdir",
    "rmdirSync",
    "rename",
    "renameSync",
    "copyFile",
    "copyFileSync",
    "truncate",
    "truncateSync",
    "write",
    "writeSync",
    "writev",
    "writevSync",
    // NOTE: open/openSync use a narrow reader-aware wrapper (see below),
    // not a blanket deny. A controls run proved the ESM loader on pinned
    // Node24.21.0 opens files through the public fs.openSync, so denying it
    // breaks standard loading itself. Only undefined/"r" flags delegate;
    // write/create/truncate/append/RDWR and unknown flag forms deny.
    "open",
    "openSync",
    "createWriteStream",
  ],
  "node:fs/promises": [
    "writeFile",
    "appendFile",
    "mkdir",
    "mkdtemp",
    "rm",
    "unlink",
    "rmdir",
    "rename",
    "copyFile",
    "truncate",
    // NOTE: promises open uses the same reader-aware wrapper as openSync
    // above: undefined/"r" delegates, all other flag forms deny.
    "open",
  ],
  "node:http": ["request", "get", "createServer"],
  "node:https": ["request", "get", "createServer"],
  "node:http2": ["connect", "createServer", "createSecureServer"],
  "node:tls": ["connect", "createServer"],
  "node:net": ["connect", "createConnection", "createServer"],
  "node:dgram": ["createSocket"],
  "node:dns": ["lookup", "resolve", "resolve4", "resolve6", "reverse"],
  "node:dns/promises": ["lookup", "resolve", "resolve4", "resolve6"],
  "node:timers": [
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "setImmediate",
    "clearImmediate",
  ],
  "node:timers/promises": ["setTimeout", "setInterval", "setImmediate", "scheduler"],
});

const FAMILY_PREFIX = Object.freeze({
  "node:child_process": "child",
  "node:worker_threads": "worker",
  "node:fs": "fs",
  "node:fs/promises": "fsp",
  "node:http": "http",
  "node:https": "https",
  "node:http2": "http2",
  "node:tls": "tls",
  "node:net": "net",
  "node:dgram": "dgram",
  "node:dns": "dns",
  "node:dns/promises": "dns-promises",
  "node:timers": "timers",
  "node:timers/promises": "timers-promises",
});

export function installProbe() {
  const violations = [];
  const patched = [];
  const failures = [];
  const restoreErrors = [];
  const saved = [];

  const deny = (kind) => () => {
    violations.push(kind);
    throw new Error(`[t03-qa-import-probe] forbidden ${kind} during import`);
  };

  // Narrow reader-aware open wrapper (coordinator-approved explicit
  // readonly-loader handling, NOT a dropped mutation restriction): delegate
  // known readonly opens (absent or exactly "r" flags) with the original
  // receiver and async semantics preserved; deny and record every other
  // flag form (write/create/truncate/append/RDWR, numerics, unknowns).
  const openWrapper = (kind, original) =>
    function (...openArgs) {
      const flags = openArgs[1];
      if (flags === undefined || flags === "r") {
        return Reflect.apply(original, this, openArgs);
      }
      violations.push(kind);
      throw new Error(`[t03-qa-import-probe] forbidden ${kind} during import`);
    };

  const saveGlobal = (key, kind) => {
    const original = globalThis[key];
    try {
      globalThis[key] = deny(kind);
      saved.push({ target: "global", key, original });
      patched.push(kind);
    } catch (error) {
      failures.push({ kind, reason: String(error && error.message ? error.message : error) });
    }
  };

  saveGlobal("fetch", "network:fetch");
  if (typeof globalThis.WebSocket === "function") {
    saveGlobal("WebSocket", "network:websocket");
  }
  saveGlobal("setTimeout", "timer:setTimeout");
  saveGlobal("setInterval", "timer:setInterval");
  saveGlobal("setImmediate", "timer:setImmediate");
  try {
    const originalExit = process.exit;
    process.exit = () => {
      violations.push("process:exit");
      throw new Error("[t03-qa-import-probe] forbidden process:exit during import");
    };
    saved.push({ target: "process", key: "exit", original: originalExit });
    patched.push("process:exit");
  } catch (error) {
    failures.push({
      kind: "process:exit",
      reason: String(error && error.message ? error.message : error),
    });
  }

  for (const [specifier, names] of Object.entries(METHOD_DENY_LIST)) {
    let mod;
    try {
      mod = builtinRequire(specifier);
    } catch (error) {
      failures.push({
        kind: `${FAMILY_PREFIX[specifier]}:<module>`,
        reason: String(error && error.message ? error.message : error),
      });
      continue;
    }
    for (const name of names) {
      const kind = `${FAMILY_PREFIX[specifier]}:${name}`;
      try {
        const original = mod[name];
        // Open entry points get the reader-aware wrapper; everything else
        // gets the plain deny. Both record the same kind on violation.
        mod[name] =
          name === "open" || name === "openSync" ? openWrapper(kind, original) : deny(kind);
        saved.push({ target: "module", mod, key: name, original });
        patched.push(kind);
      } catch (error) {
        failures.push({
          kind,
          reason: String(error && error.message ? error.message : error),
        });
      }
    }
  }

  let esmSync = false;
  try {
    syncBuiltinESMExports();
    esmSync = true;
  } catch (error) {
    failures.push({
      kind: "<esm-sync>",
      reason: String(error && error.message ? error.message : error),
    });
  }

  const restore = () => {
    for (let index = saved.length - 1; index >= 0; index -= 1) {
      const entry = saved[index];
      try {
        if (entry.target === "global") globalThis[entry.key] = entry.original;
        else if (entry.target === "process") process[entry.key] = entry.original;
        else entry.mod[entry.key] = entry.original;
      } catch (error) {
        restoreErrors.push({
          key: entry.key,
          reason: String(error && error.message ? error.message : error),
        });
      }
    }
    try {
      syncBuiltinESMExports();
    } catch (error) {
      restoreErrors.push({
        key: "<esm-sync>",
        reason: String(error && error.message ? error.message : error),
      });
    }
  };

  const summary = () => ({
    patched: [...patched],
    failures: [...failures],
    esmSync,
    restoreErrors: [...restoreErrors],
  });

  return { violations, restore, summary };
}

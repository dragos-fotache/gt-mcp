// T04 import-effect interception hook (ESM preload via node --import).
// Runs in a SANITIZED subprocess only (disposable HOME/XDG, no personal bus).
// Mutable builtin views come from process.getBuiltinModule (no require()).
// Patch entries use REAL property keys; report labels are separate strings.
// Every install records true/missing/frozen/rejected — never silently absent.
// Forbidden network/child/dns/filesystem-write actions are BLOCKED after
// recording (originals are never called); reads, timers, listeners and dlopen
// are recorded and allowed for calibration-relative comparison. ESM-view
// synchronization is verifiable in-band via globalThis.__t04hookEsync.
// Summary JSON goes to T04_QA_HOOK_OUT on exit using a pre-opened fd and the
// saved fd-level write original. This file itself performs no target imports.

const fs = process.getBuiltinModule("node:fs");

const forbidden = [];
const observations = [];
const reads = new Set();
const patched = {};
const installed = {};

function note(kind, detail) {
  forbidden.push({ kind, detail: String(detail).slice(0, 240) });
}

// Record-and-allow channel for effects compared RELATIVELY against
// calibration (timers, listener registrations, native loads). Blocked
// actions (child/network/dns/fetch/filesystem writes) use note().
function observe(kind, detail) {
  observations.push({ kind, detail: String(detail).slice(0, 240) });
}

// Save pre-patch originals for our own summary output (never recorded).
// NOTE: fs.appendFileSync routes internally through writeFileSync, so the
// summary must not use it post-patch. The output fd is opened here, before
// any patching, and written with the saved fd-level original on exit.
const hookOutPath =
  typeof process.env.T04_QA_HOOK_OUT === "string" ? process.env.T04_QA_HOOK_OUT : "";
let hookOutFd = null;
if (hookOutPath.length > 0) {
  try {
    hookOutFd = fs.openSync(hookOutPath, "a");
  } catch {
    hookOutFd = null;
  }
}
const originalWriteSync = fs.writeSync;

function patch(obj, prop, label, wrapper) {
  if (obj === null || obj === undefined) {
    patched[label] = "missing";
    return;
  }
  let original;
  try {
    original = obj[prop];
  } catch {
    patched[label] = "unreadable";
    return;
  }
  if (typeof original !== "function") {
    patched[label] = "missing";
    return;
  }
  try {
    obj[prop] = wrapper(original);
  } catch {
    patched[label] = "frozen";
    return;
  }
  if (obj[prop] === original) {
    patched[label] = "rejected";
    return;
  }
  patched[label] = true;
  installed[label] = obj[prop];
}

function blocked(label) {
  const err = new Error(`t04 hook blocked forbidden action: ${label}`);
  err.code = "T04_HOOK_BLOCKED";
  return err;
}

function builtinOrNull(id) {
  try {
    return process.getBuiltinModule(id);
  } catch {
    return null;
  }
}

const cp = builtinOrNull("node:child_process");
for (const prop of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) {
  patch(
    cp,
    prop,
    `child_process.${prop}`,
    () =>
      function hookBlockedChild(...args) {
        note(`child_process.${prop}`, args[0]);
        throw blocked(`child_process.${prop}`);
      },
  );
}

const net = builtinOrNull("node:net");
for (const prop of ["connect", "createConnection"]) {
  patch(
    net,
    prop,
    `net.${prop}`,
    () =>
      function hookBlockedNet(...args) {
        const target = args[0];
        note(`net.${prop}`, target && (target.path || target.host || target));
        throw blocked(`net.${prop}`);
      },
  );
}

const dgram = builtinOrNull("node:dgram");
patch(
  dgram,
  "createSocket",
  "dgram.createSocket",
  () =>
    function hookBlockedDgram(...args) {
      note("dgram.createSocket", args[0]);
      throw blocked("dgram.createSocket");
    },
);

const dns = builtinOrNull("node:dns");
patch(
  dns,
  "lookup",
  "dns.lookup",
  () =>
    function hookBlockedDns(...args) {
      note("dns.lookup", args[0]);
      throw blocked("dns.lookup");
    },
);

for (const prop of [
  "readFileSync",
  "openSync",
  "createReadStream",
  "readdirSync",
  "statSync",
  "lstatSync",
]) {
  patch(
    fs,
    prop,
    `fs-read.${prop}`,
    (original) =>
      function hookRead(...args) {
        if (typeof args[0] === "string" || Buffer.isBuffer(args[0])) reads.add(String(args[0]));
        return original.apply(this, args);
      },
  );
}

for (const prop of [
  "writeFileSync",
  "appendFileSync",
  "mkdirSync",
  "renameSync",
  "unlinkSync",
  "rmSync",
]) {
  patch(
    fs,
    prop,
    `fs-write.${prop}`,
    () =>
      function hookBlockedWrite(...args) {
        note(`fs.${prop}`, args[0]);
        throw blocked(`fs.${prop}`);
      },
  );
}

const originalOpenSync = fs.openSync;
if (typeof originalOpenSync === "function" && patched["fs-read.openSync"] === true) {
  const tap = function hookOpenSync(...args) {
    if (typeof args[0] === "string" || Buffer.isBuffer(args[0])) reads.add(String(args[0]));
    const flagString = String(args[1] === undefined ? "r" : args[1]);
    if (/[wax+]/.test(flagString)) {
      note("fs.openSync-write", args[0]);
      throw blocked("fs.openSync-write");
    }
    return originalOpenSync.apply(this, args);
  };
  try {
    fs.openSync = tap;
  } catch {
    patched["fs.openSync-write-tap"] = "frozen";
  }
  if (fs.openSync === tap) {
    patched["fs.openSync-write-tap"] = true;
    installed["fs.openSync-write-tap"] = fs.openSync;
  } else if (patched["fs.openSync-write-tap"] === undefined) {
    patched["fs.openSync-write-tap"] = "rejected";
  }
} else {
  patched["fs.openSync-write-tap"] = "skipped";
}

const fsp = builtinOrNull("node:fs/promises");
for (const prop of ["readFile", "open", "readdir", "stat", "lstat"]) {
  patch(
    fsp,
    prop,
    `fsp-read.${prop}`,
    (original) =>
      async function hookAsyncRead(...args) {
        if (typeof args[0] === "string" || Buffer.isBuffer(args[0])) reads.add(String(args[0]));
        return original.apply(this, args);
      },
  );
}
for (const prop of [
  "writeFile",
  "appendFile",
  "mkdir",
  "rename",
  "unlink",
  "rm",
  "copyFile",
  "chmod",
]) {
  patch(
    fsp,
    prop,
    `fsp-write.${prop}`,
    () =>
      async function hookBlockedAsyncWrite(...args) {
        note(`fsp.${prop}`, args[0]);
        throw blocked(`fsp.${prop}`);
      },
  );
}

function hookBlockedCallbackWrite(label) {
  return function hookBlockedCallbackWriteInner(...args) {
    note(label, args[0]);
    throw blocked(label);
  };
}
patch(fs, "writeFile", "fs-callback.writeFile", () => hookBlockedCallbackWrite("fs.writeFile"));
patch(fs, "appendFile", "fs-callback.appendFile", () => hookBlockedCallbackWrite("fs.appendFile"));

for (const prop of ["setTimeout", "setInterval", "setImmediate"]) {
  const original = globalThis[prop];
  if (typeof original === "function") {
    const tap = function hookTimer(...args) {
      observe(`timer.${prop}`, typeof args[1] === "number" ? args[1] : "?");
      return original.apply(this, args);
    };
    try {
      globalThis[prop] = tap;
    } catch {
      patched[`timer.${prop}`] = "frozen";
      continue;
    }
    if (globalThis[prop] === tap) {
      patched[`timer.${prop}`] = true;
      installed[`timer.${prop}`] = globalThis[prop];
    } else if (patched[`timer.${prop}`] === undefined) {
      patched[`timer.${prop}`] = "rejected";
    }
  } else {
    patched[`timer.${prop}`] = "missing";
  }
}

const originalProcessOn = process.on;
try {
  process.on = function hookProcessOn(event, ...rest) {
    if (
      ["uncaughtException", "unhandledRejection", "SIGINT", "SIGTERM", "SIGHUP"].includes(event)
    ) {
      observe("process.on", event);
    }
    return originalProcessOn.call(this, event, ...rest);
  };
} catch {
  patched["process.on"] = "frozen";
}
if (process.on !== originalProcessOn && patched["process.on"] === undefined) {
  patched["process.on"] = true;
  installed["process.on"] = process.on;
}

const originalDlopen = process.dlopen;
if (typeof originalDlopen === "function") {
  const tap = function hookDlopen(...args) {
    observe("process.dlopen", args[1]);
    return originalDlopen.apply(this, args);
  };
  try {
    process.dlopen = tap;
  } catch {
    patched["process.dlopen"] = "frozen";
  }
  if (process.dlopen === tap) {
    patched["process.dlopen"] = true;
    installed["process.dlopen"] = process.dlopen;
  } else if (patched["process.dlopen"] === undefined) {
    patched["process.dlopen"] = "rejected";
  }
} else {
  patched["process.dlopen"] = "missing";
}

if (typeof globalThis.fetch === "function") {
  const tap = function hookBlockedFetch(...args) {
    const target = args[0];
    note("fetch", target && (target.url || target));
    throw blocked("fetch");
  };
  try {
    globalThis.fetch = tap;
  } catch {
    patched.fetch = "frozen";
  }
  if (globalThis.fetch === tap) {
    patched.fetch = true;
    installed.fetch = globalThis.fetch;
  } else if (patched.fetch === undefined) {
    patched.fetch = "rejected";
  }
} else {
  patched.fetch = "missing";
}

// In-band ESM-view synchronization check: do builtin ESM namespaces expose
// the patched functions? Resolved by the test script after its imports.
globalThis.__t04hookEsync = async () => {
  const [esmFs, esmCp, esmNet] = await Promise.all([
    import("node:fs"),
    import("node:child_process"),
    import("node:net"),
  ]);
  return {
    fsRead: esmFs.readFileSync === installed["fs-read.readFileSync"],
    cpSpawn: esmCp.spawn === installed["child_process.spawn"],
    netConnect: esmNet.connect === installed["net.connect"],
  };
};

originalProcessOn.call(process, "exit", () => {
  if (hookOutFd === null) return;
  const payload = JSON.stringify({ patched, forbidden, observations, reads: [...reads].sort() });
  try {
    originalWriteSync.call(fs, hookOutFd, `${payload}\n`);
  } catch {
    // Summary best-effort only; probe assertions never depend on silence here.
  }
});

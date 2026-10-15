// Violation reporting plus guard factories for the import-interception
// harness. Pure logic with no IO of its own; originals are captured at
// module evaluation, before any target import runs.
//
// Filesystem rule: EVERY public fs read or write is a recorded violation.
// There is deliberately NO filename-suffix exemption: the module loader
// resolves sources through internal bindings, never through these public
// entry points, so any caller reaching them performs genuine runtime IO.
// Violation reports carry a fixed class/API label only, never the attempted
// path, credential or content.

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

export function reportViolation(tag, detail) {
  originalStderrWrite(`synthetic-qa-violation:${tag}:${detail ?? ""}\n`);
  throw new Error(`synthetic-qa-violation:${tag}`);
}

function firstPath(args) {
  const candidate = args[0];
  if (typeof candidate === "string") return candidate;
  if (candidate instanceof URL) return candidate.pathname;
  if (typeof candidate === "number") return `fd:${candidate}`;
  return "";
}

// Open flags: write intent (w/a/+ /create/excl/trunc) is a write violation,
// read-only opens are read violations. String and numeric forms supported.
const O_ACCMODE = 3;
const O_CREAT = 64;
const O_EXCL = 128;
const O_TRUNC = 512;
const O_APPEND = 1024;

export function openFlagsAreWrite(flags) {
  if (typeof flags === "string") {
    const base = flags[0];
    if (base === "w" || base === "a" || base === "x") return true;
    if (flags.includes("+")) return true;
    return false;
  }
  if (typeof flags === "number") {
    if ((flags & O_ACCMODE) !== 0) return true;
    if ((flags & (O_CREAT | O_EXCL | O_TRUNC | O_APPEND)) !== 0) return true;
    return false;
  }
  return true;
}

export function guardFsRead(label, original) {
  const guarded = function intercepted(...args) {
    reportViolation("fs-read", label);
    return original.apply(this, args);
  };
  return guarded;
}

export function guardFsWrite(label, original) {
  const guarded = function intercepted(...args) {
    reportViolation("fs-write", label);
    return original.apply(this, args);
  };
  return guarded;
}

export function guardFsOpen(label, original) {
  const guarded = function intercepted(...args) {
    if (openFlagsAreWrite(args[1])) reportViolation("fs-write", label);
    reportViolation("fs-read", label);
    return original.apply(this, args);
  };
  return guarded;
}

export function guardCall(tag, label, original) {
  const guarded = function intercepted(...args) {
    reportViolation(tag, label);
    return original.apply(this, args);
  };
  return guarded;
}

export { firstPath };

// Mutable-global interception (globalThis/process are writable, unlike frozen
// ESM builtin namespaces which the resolve hook redirects to shims instead).
export function installGlobalInterception() {
  for (const name of ["setTimeout", "setInterval", "setImmediate"]) {
    const original = globalThis[name];
    globalThis[name] = (...args) => {
      reportViolation("timer", name);
      return original.apply(globalThis, args);
    };
  }
  for (const name of ["on", "once", "addListener", "prependListener", "prependOnceListener"]) {
    const original = process[name];
    process[name] = function intercepted(...args) {
      reportViolation("listener", name);
      return original.apply(process, args);
    };
  }
  {
    const original = process.exit;
    process.exit = (code) => {
      originalStderrWrite(`synthetic-qa-violation:exit:${code ?? ""}\n`);
      return original.call(process, code);
    };
  }
  for (const stream of [process.stdout, process.stderr]) {
    const original = stream.write.bind(stream);
    const label = stream === process.stdout ? "stdout" : "stderr";
    stream.write = (...args) => {
      reportViolation(label, "write");
      return original.apply(stream, args);
    };
  }
  if (typeof globalThis.fetch === "function") {
    const original = globalThis.fetch;
    globalThis.fetch = (...args) => {
      reportViolation("fetch", "fetch");
      return original.apply(globalThis, args);
    };
  }
  if (typeof globalThis.WebSocket === "function") {
    const OriginalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = function intercepted(...args) {
      reportViolation("websocket", "WebSocket");
      return new OriginalWebSocket(...args);
    };
  }
  return { originalStdoutWrite, originalStderrWrite };
}

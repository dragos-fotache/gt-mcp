// Guarded re-export of node:module. createRequire is wrapped so CommonJS
// require() of guarded builtins cannot escape the ESM-only resolve hook.
// Requiring a guarded builtin is harmless and succeeds; the returned
// namespace guards every effectful surface, so only the eventual IO throws.
// Benign requires pass through untouched.
import * as real from "node:module";
import { reportViolation, openFlagsAreWrite } from "../import-intercept-setup.mjs";
import { EventEmitter as GuardedEmitter } from "./events.mjs";

export * from "node:module";

const TABLES = {
  fs: {
    read: ["readFileSync", "readFile", "statSync", "stat", "accessSync", "access", "existsSync", "exists", "readdirSync", "readdir", "createReadStream", "watch", "watchFile", "realpathSync", "realpath"],
    write: ["writeFileSync", "writeFile", "appendFileSync", "appendFile", "createWriteStream", "mkdirSync", "mkdir", "unlinkSync", "unlink", "renameSync", "rename", "copyFileSync", "copyFile", "truncateSync", "truncate"],
    open: ["openSync", "open"],
  },
  promises: {
    read: ["readFile", "stat", "access", "readdir", "realpath"],
    write: ["writeFile", "appendFile", "mkdir", "unlink", "rename", "copyFile", "truncate"],
    open: ["open"],
  },
};

function guardedFunction(tag, label) {
  return function intercepted() {
    reportViolation(tag, label);
  };
}

function guardCjsPromises(realPromises) {
  return new Proxy(realPromises, {
    get(target, property, receiver) {
      if (typeof property !== "string") return Reflect.get(target, property, receiver);
      if (TABLES.promises.read.includes(property)) return guardedFunction("fs-read", property);
      if (TABLES.promises.write.includes(property)) return guardedFunction("fs-write", property);
      if (TABLES.promises.open.includes(property)) {
        return function intercepted(...args) {
          if (openFlagsAreWrite(args[1])) reportViolation("fs-write", property);
          reportViolation("fs-read", property);
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

function guardCjsFs(realFs) {
  return new Proxy(realFs, {
    get(target, property, receiver) {
      if (typeof property !== "string") return Reflect.get(target, property, receiver);
      if (TABLES.fs.read.includes(property)) return guardedFunction("fs-read", property);
      if (TABLES.fs.write.includes(property)) return guardedFunction("fs-write", property);
      if (TABLES.fs.open.includes(property)) {
        return function intercepted(...args) {
          if (openFlagsAreWrite(args[1])) reportViolation("fs-write", property);
          reportViolation("fs-read", property);
        };
      }
      if (property === "promises") return guardCjsPromises(Reflect.get(target, property, receiver));
      return Reflect.get(target, property, receiver);
    },
  });
}

const METHOD_TABLES = {
  "node:net": ["connect", "createConnection", "createServer", "Socket", "Server", "net"],
  "node:http": ["request", "get", "http"],
  "node:https": ["request", "get", "https"],
  "node:http2": ["connect", "createServer", "createSecureServer", "http2"],
  "node:tls": ["connect", "createServer", "TLSSocket", "Server", "tls"],
  "node:dns": ["lookup", "resolve", "resolve4", "resolve6", "dns"],
  "node:dgram": ["createSocket", "dgram"],
  "node:child_process": ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork", "process-spawn"],
  "node:worker_threads": ["Worker", "worker"],
  "node:inspector": ["open", "inspector"],
  "node:timers": ["setTimeout", "setInterval", "setImmediate", "timer"],
  "node:timers/promises": ["setTimeout", "setInterval", "setImmediate", "scheduler", "timer"],
  "node:events": ["EventEmitter", "once", "on", "listener"],
};

function guardCjsGeneric(realObj, names, tag) {
  const guarded = new Set(names);
  return new Proxy(realObj, {
    get(target, property, receiver) {
      if (typeof property === "string" && guarded.has(property)) {
        return guardedFunction(tag, property);
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

export function createRequire(...args) {
  const required = real.createRequire(...args);
  function guardedRequire(id) {
    if (id === "node:fs" || id === "fs") return guardCjsFs(required(id));
    if (id === "node:fs/promises" || id === "fs/promises") {
      return guardCjsPromises(required(id));
    }
    if (id === "node:events" || id === "events") {
      const realEvents = required(id);
      return new Proxy(realEvents, {
        get(target, property, receiver) {
          if (property === "EventEmitter") return GuardedEmitter;
          if (property === "once" || property === "on") {
            return function intercepted() {
              reportViolation("listener", property);
            };
          }
          return Reflect.get(target, property, receiver);
        },
      });
    }
    const canonical = id.startsWith("node:") ? id : `node:${id}`;
    if (Object.hasOwn(METHOD_TABLES, canonical)) {
      const names = METHOD_TABLES[canonical];
      return guardCjsGeneric(required(id), names.slice(0, -1), names[names.length - 1]);
    }
    return required(id);
  }
  guardedRequire.resolve = required.resolve.bind(required);
  guardedRequire.cache = required.cache;
  return guardedRequire;
}

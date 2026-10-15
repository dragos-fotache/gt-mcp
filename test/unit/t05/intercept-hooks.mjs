// ESM resolve hook: redirect frozen public builtin namespaces to guarding
// shims for every importer EXCEPT the shims themselves (which must receive
// the real builtins for their internal delegation). Plain file imports,
// loader metadata and internal specifiers pass through untouched. This module
// imports no builtins itself so it can never recurse through its own hook.

const SHIM_DIR_HREF = new URL("./intercept-shims/", import.meta.url).href;

const SHIMS = {
  "node:fs": "fs.mjs",
  "node:fs/promises": "fs-promises.mjs",
  "node:net": "net.mjs",
  "node:http": "http.mjs",
  "node:https": "https.mjs",
  "node:http2": "http2.mjs",
  "node:tls": "tls.mjs",
  "node:dns": "dns.mjs",
  "node:dgram": "dgram.mjs",
  "node:child_process": "child-process.mjs",
  "node:worker_threads": "worker-threads.mjs",
  "node:inspector": "inspector.mjs",
  "node:timers": "timers.mjs",
  "node:timers/promises": "timers-promises.mjs",
  "node:events": "events.mjs",
  "node:module": "module.mjs",
  "fs": "fs.mjs",
  "fs/promises": "fs-promises.mjs",
  "net": "net.mjs",
  "http": "http.mjs",
  "https": "https.mjs",
  "http2": "http2.mjs",
  "tls": "tls.mjs",
  "dns": "dns.mjs",
  "dgram": "dgram.mjs",
  "child_process": "child-process.mjs",
  "worker_threads": "worker-threads.mjs",
  "inspector": "inspector.mjs",
  "timers": "timers.mjs",
  "timers/promises": "timers-promises.mjs",
  "events": "events.mjs",
  "module": "module.mjs",
};

export async function resolve(specifier, context, next) {
  const file = SHIMS[specifier];
  if (file !== undefined) {
    const parent = context.parentURL ?? "";
    if (!parent.startsWith(SHIM_DIR_HREF)) {
      return { url: `${SHIM_DIR_HREF}${file}`, shortCircuit: true };
    }
  }
  return next(specifier, context);
}

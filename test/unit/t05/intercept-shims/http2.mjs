// Guarded re-export of node:http2. Session/server creation is a violation.
import * as real from "node:http2";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:http2";

export const connect = guardCall("http2", "connect", real.connect);
export const createServer = guardCall("http2", "createServer", real.createServer);
export const createSecureServer = guardCall("http2", "createSecureServer", real.createSecureServer);

const GUARDED_DEFAULT = { connect, createServer, createSecureServer };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


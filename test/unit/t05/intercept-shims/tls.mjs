// Guarded re-export of node:tls. Connection/server creation is a violation.
import * as real from "node:tls";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:tls";

export const connect = guardCall("tls", "connect", real.connect);
export const createServer = guardCall("tls", "createServer", real.createServer);
export const TLSSocket = guardCall("tls", "TLSSocket", real.TLSSocket);
export const Server = guardCall("tls", "Server", real.Server);

const GUARDED_DEFAULT = { connect, createServer, TLSSocket, Server };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


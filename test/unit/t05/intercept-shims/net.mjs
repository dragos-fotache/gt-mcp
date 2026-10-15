// Guarded re-export of node:net. Socket/server creation and connections are
// violations, whether via factories, classes or methods.
import * as real from "node:net";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:net";

export const connect = guardCall("net", "connect", real.connect);
export const createConnection = guardCall("net", "createConnection", real.createConnection);
export const createServer = guardCall("net", "createServer", real.createServer);
export const Socket = guardCall("net", "Socket", real.Socket);
export const Server = guardCall("net", "Server", real.Server);

const GUARDED_DEFAULT = { connect, createConnection, createServer, Socket, Server };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;

// Guarded re-export of node:dgram. Socket creation is a violation.
import * as real from "node:dgram";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:dgram";

export const createSocket = guardCall("dgram", "createSocket", real.createSocket);

const GUARDED_DEFAULT = { createSocket };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


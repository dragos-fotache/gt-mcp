// Guarded re-export of node:https. Any client request is a violation.
import * as real from "node:https";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:https";

export const request = guardCall("https", "request", real.request);
export const get = guardCall("https", "get", real.get);

const WRAPPED = { request: request, get: get };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(WRAPPED, property)) return WRAPPED[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;

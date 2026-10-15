// Guarded re-export of node:http. Any client request is a violation.
import * as real from "node:http";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:http";

export const request = guardCall("http", "request", real.request);
export const get = guardCall("http", "get", real.get);

const WRAPPED = { request: request, get: get };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(WRAPPED, property)) return WRAPPED[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;

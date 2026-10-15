// Guarded re-export of node:dns. Any lookup/resolution is a violation.
import * as real from "node:dns";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:dns";

export const lookup = guardCall("dns", "lookup", real.lookup);
export const resolve = guardCall("dns", "resolve", real.resolve);
export const resolve4 = guardCall("dns", "resolve4", real.resolve4);
export const resolve6 = guardCall("dns", "resolve6", real.resolve6);

const GUARDED_DEFAULT = { lookup, resolve, resolve4, resolve6 };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


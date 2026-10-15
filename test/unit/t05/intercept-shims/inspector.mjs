// Guarded re-export of node:inspector. Opening is a violation.
import * as real from "node:inspector";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:inspector";

export const open = guardCall("inspector", "open", real.open);

const GUARDED_DEFAULT = { open };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


// Guarded re-export of node:timers. Any timer creation (even cleared or
// unrefed afterwards) is recorded at creation and cannot evade.
import * as real from "node:timers";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:timers";

export const setTimeout = guardCall("timer", "timers.setTimeout", real.setTimeout);
export const setInterval = guardCall("timer", "timers.setInterval", real.setInterval);
export const setImmediate = guardCall("timer", "timers.setImmediate", real.setImmediate);

const GUARDED_DEFAULT = { setTimeout, setInterval, setImmediate };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


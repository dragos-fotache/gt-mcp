// Guarded re-export of node:timers/promises. Scheduler creation is a violation.
import * as real from "node:timers/promises";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:timers/promises";

export const setTimeout = guardCall("timer", "timers-promises.setTimeout", real.setTimeout);
export const setInterval = guardCall("timer", "timers-promises.setInterval", real.setInterval);
export const setImmediate = guardCall("timer", "timers-promises.setImmediate", real.setImmediate);
export const scheduler = guardCall("timer", "timers-promises.scheduler", real.scheduler);

const GUARDED_DEFAULT = { setTimeout, setInterval, setImmediate, scheduler };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


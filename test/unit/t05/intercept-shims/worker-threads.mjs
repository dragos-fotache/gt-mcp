// Guarded re-export of node:worker_threads. Worker creation is a violation.
import * as real from "node:worker_threads";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:worker_threads";

export const Worker = guardCall("worker", "Worker", real.Worker);

const GUARDED_DEFAULT = { Worker };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


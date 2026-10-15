// Guarded re-export of node:events. Listener registration is guarded at the
// prototype level (not only construction): any EventEmitter use obtained
// through this surface throws on handler registration, while removal and
// emission (with no registrable handlers) pass through.
import * as real from "node:events";
import { reportViolation, guardCall } from "../import-intercept-setup.mjs";

export * from "node:events";

class GuardedEmitter extends real.EventEmitter {
  on() {
    reportViolation("listener", "on");
  }

  addListener() {
    reportViolation("listener", "addListener");
  }

  once() {
    reportViolation("listener", "once");
  }

  prependListener() {
    reportViolation("listener", "prependListener");
  }

  prependOnceListener() {
    reportViolation("listener", "prependOnceListener");
  }
}

export const EventEmitter = GuardedEmitter;
export const once = guardCall("listener", "events.once", real.once);
export const on = guardCall("listener", "events.on", real.on);

const GUARDED_DEFAULT = { EventEmitter, once, on };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;

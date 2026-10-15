// Synthetic deny-control: forbidden node:timers module timer during import.
//
// The probe patches the timers module exports, so no timer is scheduled.
// Expected probe outcome: violations ["timers:setTimeout"], import fails.

import { setTimeout } from "node:timers";

setTimeout(() => {}, 0);

export const CONTROL = "synthetic-qa-t03-deny-timers-unreached";

// Synthetic deny-control: forbidden timer during import.
//
// The probe's deny wrapper throws; no timer is ever scheduled.
// Expected probe outcome: violations ["timer:setTimeout"], import fails.

globalThis.setTimeout(() => {}, 0);

export const CONTROL = "synthetic-qa-t03-deny-timer-unreached";

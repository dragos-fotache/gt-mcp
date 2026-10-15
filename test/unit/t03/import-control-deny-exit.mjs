// Synthetic deny-control: forbidden process.exit during import.
//
// The probe's wrapper throws instead of exiting, so the child survives to
// report. Expected probe outcome: violations ["process:exit"], import fails.

process.exit(0);

export const CONTROL = "synthetic-qa-t03-deny-exit-unreached";

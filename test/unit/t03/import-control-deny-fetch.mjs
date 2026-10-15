// Synthetic deny-control: forbidden fetch during import.
//
// The probe's deny wrapper throws before any I/O, so no network occurs.
// Expected probe outcome: violations ["network:fetch"], import fails.

await globalThis.fetch("http://127.0.0.1:1/synthetic-qa-probe");

export const CONTROL = "synthetic-qa-t03-deny-fetch-unreached";

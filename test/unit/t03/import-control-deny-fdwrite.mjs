// Synthetic deny-control: forbidden fd write during import.
//
// The probe denies fs.writeSync outright, so the descriptor write never
// happens (stdout stays clean for the probe report).
// Expected probe outcome: violations ["fs:writeSync"], import fails.

import { writeSync } from "node:fs";

writeSync(1, "synthetic-qa-probe");

export const CONTROL = "synthetic-qa-t03-deny-fdwrite-unreached";

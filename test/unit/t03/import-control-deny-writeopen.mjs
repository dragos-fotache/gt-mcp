// Synthetic deny-control: forbidden write-flag open during import.
//
// The probe's reader-aware open wrapper denies "w" before touching the
// filesystem, so no file is created or truncated.
// Expected probe outcome: violations ["fs:openSync"], import fails.

import { openSync } from "node:fs";

openSync("synthetic-qa-probe.txt", "w");

export const CONTROL = "synthetic-qa-t03-deny-writeopen-unreached";

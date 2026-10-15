// Synthetic deny-control: forbidden fs write during import.
//
// Resolved after the probe's syncBuiltinESMExports patch, so the ESM binding
// is the deny wrapper and no file is ever written.
// Expected probe outcome: violations ["fs:writeFileSync"], import fails.

import { writeFileSync } from "node:fs";

writeFileSync("synthetic-qa-probe.txt", "x");

export const CONTROL = "synthetic-qa-t03-deny-write-unreached";

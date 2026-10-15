// Synthetic deny-control: forbidden child_process spawn during import.
//
// Resolved after the probe's syncBuiltinESMExports patch, so the ESM binding
// is the deny wrapper and no process is ever spawned.
// Expected probe outcome: violations ["child:spawn"], import fails.

import { spawn } from "node:child_process";

spawn("synthetic-qa-probe-nope", []);

export const CONTROL = "synthetic-qa-t03-deny-spawn-unreached";

// Violation control: openSync read-only is still a recorded read.
import { openSync } from "node:fs";
openSync(new URL("./clean.mjs", import.meta.url), "r");
export const syntheticQaControl = "fs-open-read";

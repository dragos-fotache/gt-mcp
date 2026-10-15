// Violation control: openSync with write flags truncates (guarded by flags).
import { openSync } from "node:fs";
openSync(new URL("./mutation-target.txt", import.meta.url), "w");
export const syntheticQaControl = "fs-open-write";

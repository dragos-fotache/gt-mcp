// Violation control: nested promises surface of the default fs export.
import fs from "node:fs";
await fs.promises.writeFile(new URL("./mutation-target.txt", import.meta.url), "x");
export const syntheticQaControl = "fs-nested-promises-write";

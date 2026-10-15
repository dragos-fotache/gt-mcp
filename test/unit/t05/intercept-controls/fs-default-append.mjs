// Violation control: default-export append bypass.
import fs from "node:fs";
fs.appendFileSync(new URL("./mutation-target.txt", import.meta.url), "x");
export const syntheticQaControl = "fs-default-append";

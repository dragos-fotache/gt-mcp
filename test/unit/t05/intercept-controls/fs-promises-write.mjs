// Violation control: default promises write bypass.
import fsp from "node:fs/promises";
await fsp.writeFile(new URL("./mutation-target.txt", import.meta.url), "x");
export const syntheticQaControl = "fs-promises-write";

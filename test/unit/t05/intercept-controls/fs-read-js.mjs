// Violation control: named read of an arbitrary synthetic .js file. No
// filename exemption exists: loader reads use internal bindings.
import { readFileSync } from "node:fs";
readFileSync(new URL("./clean.mjs", import.meta.url), "utf8");
export const syntheticQaControl = "fs-read-js";

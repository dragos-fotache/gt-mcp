// Violation control: CJS require of a guarded builtin.
import { createRequire } from "node:module";
const required = createRequire(import.meta.url);
required("node:fs").writeFileSync(new URL("./mutation-target.txt", import.meta.url), "x");
export const syntheticQaControl = "cjs-require";

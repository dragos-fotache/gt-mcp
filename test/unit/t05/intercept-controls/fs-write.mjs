// Violation control: filesystem write (guarded before touching disk).
import fs from "node:fs";
fs.writeFileSync("/tmp/synthetic-qa-must-not-exist.txt", "synthetic-qa");
export const syntheticQaControl = "fs-write";

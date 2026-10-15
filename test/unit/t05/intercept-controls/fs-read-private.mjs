// Violation control: non-loader filesystem read.
import fs from "node:fs";
fs.readFileSync("/etc/hostname", "utf8");
export const syntheticQaControl = "fs-read-private";

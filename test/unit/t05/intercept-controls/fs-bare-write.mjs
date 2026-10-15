// Violation control: UNPREFIXED bare builtin import (no node: scheme).
import { writeFileSync } from "fs";
writeFileSync(new URL("./mutation-target.txt", import.meta.url), "x");
export const syntheticQaControl = "fs-bare-write";

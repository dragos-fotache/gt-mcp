// Violation control: process launch.
import { spawnSync } from "node:child_process";
spawnSync("echo", ["synthetic-qa"]);
export const syntheticQaControl = "spawn";

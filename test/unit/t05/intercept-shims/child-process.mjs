// Guarded re-export of node:child_process. Any launch is a violation.
import * as real from "node:child_process";
import { guardCall } from "../import-intercept-setup.mjs";

export * from "node:child_process";

export const spawn = guardCall("process-spawn", "spawn", real.spawn);
export const spawnSync = guardCall("process-spawn", "spawnSync", real.spawnSync);
export const exec = guardCall("process-spawn", "exec", real.exec);
export const execSync = guardCall("process-spawn", "execSync", real.execSync);
export const execFile = guardCall("process-spawn", "execFile", real.execFile);
export const execFileSync = guardCall("process-spawn", "execFileSync", real.execFileSync);
export const fork = guardCall("process-spawn", "fork", real.fork);

const GUARDED_DEFAULT = { spawn, spawnSync, exec, execSync, execFile, execFileSync, fork };
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;


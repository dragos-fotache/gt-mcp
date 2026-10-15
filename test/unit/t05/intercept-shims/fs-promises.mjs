// Guarded re-export of node:fs/promises. Same no-exemption rule as fs.
import * as real from "node:fs/promises";
import { guardFsRead, guardFsWrite, guardFsOpen } from "../import-intercept-setup.mjs";

export * from "node:fs/promises";

export const readFile = guardFsRead("promises.readFile", real.readFile);
export const open = guardFsOpen("promises.open", real.open);
export const stat = guardFsRead("promises.stat", real.stat);
export const access = guardFsRead("promises.access", real.access);
export const readdir = guardFsRead("promises.readdir", real.readdir);
export const realpath = guardFsRead("promises.realpath", real.realpath);
export const writeFile = guardFsWrite("promises.writeFile", real.writeFile);
export const appendFile = guardFsWrite("promises.appendFile", real.appendFile);
export const mkdir = guardFsWrite("promises.mkdir", real.mkdir);
export const unlink = guardFsWrite("promises.unlink", real.unlink);
export const rename = guardFsWrite("promises.rename", real.rename);
export const copyFile = guardFsWrite("promises.copyFile", real.copyFile);
export const truncate = guardFsWrite("promises.truncate", real.truncate);

const GUARDED_DEFAULT = {
  readFile, open, stat, access, readdir, realpath, writeFile, appendFile,
  mkdir, unlink, rename, copyFile, truncate,
};
const def = new Proxy(real.default ?? real, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    return Reflect.get(target, property, receiver);
  },
});
export default def;

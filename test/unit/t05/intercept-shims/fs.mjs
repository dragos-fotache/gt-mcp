// Guarded re-export of node:fs. EVERY public read or write is a recorded
// violation: the module loader uses internal bindings, never these entry
// points, so no filename exemption exists. Open honors flags for read/write
// classification. The internal `real` import is exempted by the resolve hook
// because this file lives under intercept-shims/.
import * as real from "node:fs";
import { guardFsRead, guardFsWrite, guardFsOpen } from "../import-intercept-setup.mjs";
import {
  readFile as promisesReadFile,
  open as promisesOpen,
  stat as promisesStat,
  access as promisesAccess,
  readdir as promisesReaddir,
  realpath as promisesRealpath,
  writeFile as promisesWriteFile,
  appendFile as promisesAppendFile,
  mkdir as promisesMkdir,
  unlink as promisesUnlink,
  rename as promisesRename,
  copyFile as promisesCopyFile,
  truncate as promisesTruncate,
} from "./fs-promises.mjs";

export * from "node:fs";

export const readFileSync = guardFsRead("readFileSync", real.readFileSync);
export const readFile = guardFsRead("readFile", real.readFile);
export const openSync = guardFsOpen("openSync", real.openSync);
export const open = guardFsOpen("open", real.open);
export const statSync = guardFsRead("statSync", real.statSync);
export const stat = guardFsRead("stat", real.stat);
export const accessSync = guardFsRead("accessSync", real.accessSync);
export const access = guardFsRead("access", real.access);
export const existsSync = guardFsRead("existsSync", real.existsSync);
export const exists = guardFsRead("exists", real.exists);
export const readdirSync = guardFsRead("readdirSync", real.readdirSync);
export const readdir = guardFsRead("readdir", real.readdir);
export const createReadStream = guardFsRead("createReadStream", real.createReadStream);
export const watch = guardFsRead("watch", real.watch);
export const watchFile = guardFsRead("watchFile", real.watchFile);
export const realpathSync = guardFsRead("realpathSync", real.realpathSync);
export const realpath = guardFsRead("realpath", real.realpath);

export const writeFileSync = guardFsWrite("writeFileSync", real.writeFileSync);
export const writeFile = guardFsWrite("writeFile", real.writeFile);
export const appendFileSync = guardFsWrite("appendFileSync", real.appendFileSync);
export const appendFile = guardFsWrite("appendFile", real.appendFile);
export const createWriteStream = guardFsWrite("createWriteStream", real.createWriteStream);
export const mkdirSync = guardFsWrite("mkdirSync", real.mkdirSync);
export const mkdir = guardFsWrite("mkdir", real.mkdir);
export const unlinkSync = guardFsWrite("unlinkSync", real.unlinkSync);
export const unlink = guardFsWrite("unlink", real.unlink);
export const renameSync = guardFsWrite("renameSync", real.renameSync);
export const rename = guardFsWrite("rename", real.rename);
export const copyFileSync = guardFsWrite("copyFileSync", real.copyFileSync);
export const copyFile = guardFsWrite("copyFile", real.copyFile);
export const truncateSync = guardFsWrite("truncateSync", real.truncateSync);
export const truncate = guardFsWrite("truncate", real.truncate);

const GUARDED_DEFAULT = {
  readFileSync, readFile, openSync, open, statSync, stat, accessSync, access,
  existsSync, exists, readdirSync, readdir, createReadStream, watch, watchFile,
  realpathSync, realpath, writeFileSync, writeFile, appendFileSync, appendFile,
  createWriteStream, mkdirSync, mkdir, unlinkSync, unlink, renameSync, rename,
  copyFileSync, copyFile, truncateSync, truncate,
};
const PROMISES_FACADE = {
  readFile: promisesReadFile,
  open: promisesOpen,
  stat: promisesStat,
  access: promisesAccess,
  readdir: promisesReaddir,
  realpath: promisesRealpath,
  writeFile: promisesWriteFile,
  appendFile: promisesAppendFile,
  mkdir: promisesMkdir,
  unlink: promisesUnlink,
  rename: promisesRename,
  copyFile: promisesCopyFile,
  truncate: promisesTruncate,
};
const def = new Proxy(real.default, {
  get(target, property, receiver) {
    if (Object.hasOwn(GUARDED_DEFAULT, property)) return GUARDED_DEFAULT[property];
    if (property === "promises") return PROMISES_FACADE;
    return Reflect.get(target, property, receiver);
  },
});
export default def;

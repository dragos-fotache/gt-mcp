/**
 * T04 protected storage — low-level filesystem primitives.
 *
 * Atomic durable replacement (same-directory O_EXCL temp, full short-write
 * handling, file fsync, parent-directory fsync, rename, parent-directory
 * fsync), restrictive permission/ownership/link validation, symlink-free
 * ancestor traversal checks, and WRITE FLOCK lease discovery via
 * /proc/self/fdinfo. No filesystem type gate.
 * All failures throw sanitized StorageError codes; native errno values
 * never propagate.
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { StorageError } from "./errors.js";
import type { FaultProbe } from "./faults.js";

export interface FileIdentity {
  dev: string;
  ino: string;
}

function currentEuid(): number {
  if (typeof process.geteuid === "function") {
    return process.geteuid();
  }
  return process.getuid?.() ?? 0;
}

export function euid(): number {
  return currentEuid();
}

function errnoOf(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "";
}

/**
 * Totally ordered temp names inside one directory. O_EXCL makes creation
 * atomic; a bounded retry covers adversarial pre-created collisions.
 */
let tempCounter: number = 0;

export function tempFileName(prefix: string): string {
  tempCounter += 1;
  const random: string = crypto.randomBytes(4).toString("hex");
  return `.${prefix}.${process.pid}.${tempCounter}.${random}.tmp`;
}

export interface FsPoints {
  write: "fs.write";
  fsyncFile: "fs.fsync.file";
  rename: "fs.rename";
  fsyncDirectory: "fs.fsync.directory";
}

async function probeFs(
  faults: FaultProbe | null,
  point: "fs.write" | "fs.fsync.file" | "fs.rename" | "fs.fsync.directory",
): Promise<void> {
  if (faults !== null) {
    await faults.probe(point);
  }
}

function writeAllSync(fd: number, content: Uint8Array): void {
  let offset: number = 0;
  const buffer: Buffer = Buffer.from(content);
  while (offset < buffer.byteLength) {
    let written: number;
    try {
      written = fs.writeSync(fd, buffer, offset);
    } catch {
      throw new StorageError("io_failure");
    }
    if (written <= 0) {
      throw new StorageError("io_failure");
    }
    offset += written;
  }
}

/**
 * Durably install content at dir/targetName. Temp creation uses O_EXCL
 * 0600; failures before rename leave the old target untouched.
 */
export async function durableInstallFile(
  dir: string,
  targetName: string,
  content: Uint8Array,
  faults: FaultProbe | null,
): Promise<void> {
  let tempName: string = "";
  let fd: number = -1;
  for (let attempt: number = 0; attempt < 10; attempt += 1) {
    tempName = tempFileName(targetName);
    try {
      fd = fs.openSync(
        path.join(dir, tempName),
        fs.constants.O_CREAT |
          fs.constants.O_EXCL |
          fs.constants.O_WRONLY |
          fs.constants.O_NOFOLLOW,
        0o600,
      );
      break;
    } catch (error) {
      if (errnoOf(error) === "EEXIST") {
        continue;
      }
      throw new StorageError("io_failure");
    }
  }
  if (fd < 0) {
    throw new StorageError("io_failure");
  }
  const tempPath: string = path.join(dir, tempName);
  let closeFailed: boolean = false;
  try {
    await probeFs(faults, "fs.write");
    writeAllSync(fd, content);
    await probeFs(faults, "fs.fsync.file");
    try {
      fs.fsyncSync(fd);
    } catch {
      throw new StorageError("io_failure");
    }
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      closeFailed = true;
    }
  }
  if (closeFailed) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // Best effort; stale temps are never read as state.
    }
    throw new StorageError("io_failure");
  }
  try {
    await probeFs(faults, "fs.fsync.directory");
    fsyncDirectory(dir);
    await probeFs(faults, "fs.rename");
    fs.renameSync(tempPath, path.join(dir, targetName));
    await probeFs(faults, "fs.fsync.directory");
    fsyncDirectory(dir);
  } catch (error) {
    if (error instanceof StorageError) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Best effort; stale temps are never read as state.
      }
      throw error;
    }
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // Best effort; stale temps are never read as state.
    }
    throw new StorageError("io_failure");
  }
}

export function fsyncDirectory(dir: string): void {
  let fd: number = -1;
  let failed: boolean = false;
  try {
    fd = fs.openSync(
      dir,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW,
    );
    fs.fsyncSync(fd);
  } catch {
    failed = true;
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {
        failed = true;
      }
    }
  }
  if (failed) {
    throw new StorageError("io_failure");
  }
}

/**
 * Read a whole regular file with pre-allocation gates. Regular file,
 * euid-owned, exact 0600, nlink 1; size bounded before allocation.
 */
export function readWholeFile(
  filePath: string,
  maxBytes: number,
  missingCode: "store_missing",
): Buffer {
  let fd: number;
  try {
    fd = fs.openSync(
      filePath,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK,
    );
  } catch (error) {
    if (errnoOf(error) === "ENOENT") {
      throw new StorageError(missingCode);
    }
    throw new StorageError("io_failure");
  }
  try {
    const st: fs.Stats = fs.fstatSync(fd);
    validateRegularFileStat(st);
    if (st.size > maxBytes) {
      throw new StorageError("store_corrupt");
    }
    const out: Buffer = Buffer.alloc(st.size);
    let offset: number = 0;
    while (offset < out.byteLength) {
      let read: number;
      try {
        read = fs.readSync(fd, out, offset, out.byteLength - offset, null);
      } catch {
        throw new StorageError("io_failure");
      }
      if (read <= 0) {
        throw new StorageError("store_corrupt");
      }
      offset += read;
    }
    return out;
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {
        // Read already completed or failed safely; closing cannot change that.
      }
    }
  }
}

export function validateRegularFileStat(st: fs.Stats | fs.BigIntStats): void {
  const mode: bigint = typeof st.mode === "bigint" ? st.mode : BigInt(st.mode);
  const uid: bigint = typeof st.uid === "bigint" ? st.uid : BigInt(st.uid);
  const nlink: bigint = typeof st.nlink === "bigint" ? st.nlink : BigInt(st.nlink);
  if (
    !st.isFile() ||
    nlink !== BigInt(1) ||
    uid !== BigInt(currentEuid()) ||
    (mode & BigInt(0o777)) !== BigInt(0o600)
  ) {
    throw new StorageError("io_failure");
  }
}

export function validateDirStat(st: fs.Stats | fs.BigIntStats): void {
  const mode: bigint = typeof st.mode === "bigint" ? st.mode : BigInt(st.mode);
  const uid: bigint = typeof st.uid === "bigint" ? st.uid : BigInt(st.uid);
  if (!st.isDirectory() || uid !== BigInt(currentEuid()) || (mode & BigInt(0o77)) !== BigInt(0)) {
    throw new StorageError("io_failure");
  }
}

export function statIdentityOfPath(targetPath: string, followFinal: boolean): FileIdentity {
  let st: fs.BigIntStats;
  try {
    st = followFinal
      ? fs.statSync(targetPath, { bigint: true })
      : fs.lstatSync(targetPath, { bigint: true });
  } catch (error) {
    if (errnoOf(error) === "ENOENT") {
      throw new StorageError("store_missing");
    }
    throw new StorageError("io_failure");
  }
  return { dev: st.dev.toString(10), ino: st.ino.toString(10) };
}

/**
 * Trusted-ancestor traversal gate for an absolute path. Every existing
 * component must be a symlink-free directory that is root-owned or
 * euid-owned, or carry the sticky bit (the sticky system-temp exception
 * for isolated fixtures); non-sticky group- or other-writable ancestors
 * fail. This is a pre-check, not a race-free traversal claim: the authoritative
 * open uses O_NOFOLLOW and identity revalidation, and concurrent
 * same-UID ancestor swaps inside one syscall window are excluded.
 */
export function assertSafeAncestors(absolutePath: string): void {
  const checkOne = (dirPath: string): "present" | "absent" => {
    let st: fs.Stats;
    try {
      st = fs.lstatSync(dirPath);
    } catch (error) {
      if (errnoOf(error) === "ENOENT") {
        return "absent";
      }
      throw new StorageError("io_failure");
    }
    if (st.isSymbolicLink() || !st.isDirectory()) {
      throw new StorageError("io_failure");
    }
    const sticky: boolean = (st.mode & 0o1000) !== 0;
    const ownerOk: boolean = st.uid === 0 || st.uid === currentEuid();
    if (!ownerOk && !sticky) {
      throw new StorageError("io_failure");
    }
    if ((st.mode & 0o022) !== 0 && !sticky) {
      throw new StorageError("io_failure");
    }
    return "present";
  };
  if (checkOne(path.sep) !== "present") {
    throw new StorageError("io_failure");
  }
  const parts: string[] = absolutePath.split(path.sep);
  let prefix: string = path.sep;
  for (const part of parts) {
    if (part === "") {
      continue;
    }
    prefix = path.join(prefix, part);
    if (checkOne(prefix) === "absent") {
      return;
    }
  }
}

/**
 * Lease discovery: exactly one file description in this process must hold a
 * WRITE FLOCK lease on the expected (dev, ino). Zero or multiple matches
 * deny before any key/data IO. No PID/time reasoning, no fixed fd guess.
 */
export function assertSingleWriteFlockLease(expectedDev: string, expectedIno: string): void {
  if (countWriteFlockLeases("self", expectedDev, expectedIno) !== 1) {
    throw new StorageError("commit_ambiguous");
  }
}

/**
 * Count WRITE FLOCK leases on (dev, ino) held by one process, identified by
 * exact bigint stat identities. Used for self verification and for proving
 * a spawned guard process holds exclusion before destructive cleanup.
 */
export function countWriteFlockLeases(
  pid: string,
  expectedDev: string,
  expectedIno: string,
): number {
  if (!/^(self|[0-9]+)$/.test(pid)) {
    throw new StorageError("io_failure");
  }
  let entries: string[];
  try {
    entries = fs.readdirSync(`/proc/${pid}/fd`);
  } catch {
    throw new StorageError("io_failure");
  }
  let matches: number = 0;
  for (const entry of entries) {
    if (!/^[0-9]+$/.test(entry)) {
      continue;
    }
    let st: fs.BigIntStats;
    try {
      st = fs.statSync(`/proc/${pid}/fd/${entry}`, { bigint: true });
    } catch {
      continue;
    }
    const dev: string = st.dev.toString(10);
    const ino: string = st.ino.toString(10);
    if (dev !== expectedDev || ino !== expectedIno) {
      continue;
    }
    let info: string;
    try {
      info = fs.readFileSync(`/proc/${pid}/fdinfo/${entry}`, "utf8");
    } catch {
      continue;
    }
    for (const line of info.split("\n")) {
      const fields: string[] = line.trim().split(/\s+/);
      if (
        fields[0] === "lock:" &&
        fields[1] === "1:" &&
        fields[2] === "FLOCK" &&
        fields[3] === "ADVISORY" &&
        fields[4] === "WRITE"
      ) {
        matches += 1;
        break;
      }
    }
  }
  return matches;
}

/**
 * Remove a directory tree without following symlinks. Used only for issued
 * diagnostic roots and same-directory temp sweeps under lease.
 */
export function removeTree(root: string): void {
  let st: fs.Stats;
  try {
    st = fs.lstatSync(root);
  } catch (error) {
    if (errnoOf(error) === "ENOENT") {
      return;
    }
    throw new StorageError("io_failure");
  }
  if (st.isSymbolicLink()) {
    throw new StorageError("io_failure");
  }
  if (!st.isDirectory()) {
    try {
      fs.unlinkSync(root);
    } catch (error) {
      if (errnoOf(error) !== "ENOENT") {
        throw new StorageError("io_failure");
      }
    }
    return;
  }
  let entries: string[];
  try {
    entries = fs.readdirSync(root);
  } catch {
    throw new StorageError("io_failure");
  }
  for (const entry of entries) {
    removeTree(path.join(root, entry));
  }
  try {
    fs.rmdirSync(root);
  } catch (error) {
    if (errnoOf(error) !== "ENOENT") {
      throw new StorageError("io_failure");
    }
  }
}

export function sweepTempFiles(dir: string): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (/^\.[^/]+\.[0-9]+\.[0-9]+\.[0-9a-f]+\.tmp$/.test(entry)) {
      try {
        fs.unlinkSync(path.join(dir, entry));
      } catch {
        // Best effort only.
      }
    }
  }
}

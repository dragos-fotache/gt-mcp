/**
 * T08-S1 protected startup file loader plus strict metadata JSON parsing.
 *
 * Supported S1 loader is Linux only. Selected files must be regular files
 * (rejected before opening, so a FIFO/device selection can never block an
 * open), single-link, owned by the effective user, with mode 0400 or 0600.
 * Symlinks in files and path components are rejected, including dangling
 * links. Ancestor directories must be owned by the user or root and not
 * writable by group/others; a root-owned sticky shared ancestor (such as a
 * system temporary directory) is allowed only with a user-owned private
 * 0700 subtree below it. A missing selection is reported only after its
 * ancestry is validated: a symlinked or unsafe ancestor behind an absent
 * file remains fatal, not "missing".
 *
 * Checks run against opened/pinned identities, not merely pre-open path
 * text: files open with O_NOFOLLOW, the descriptor is revalidated with
 * fstat, the path is re-examined without following links, and pinned
 * ancestor dev/ino identities are rechecked, so detected file/ancestor
 * substitution fails closed rather than following a replacement. Reads
 * accumulate in bounded chunks against the inclusive limit plus an
 * overflow sentinel. Every native failure maps to a fixed sanitized
 * ReadRuntimeError(configuration_required) with no paths or native detail.
 * This is private-file hygiene, not protection against a privileged
 * same-user process or a whole-machine rollback adversary.
 *
 * Metadata JSON is strict UTF-8, duplicate-key-free at every object level
 * (escaped-key duplicates included), with no BOM and no coercion. Size
 * bounds reject oversize selections before and during accumulation.
 * Importing this module performs no IO; only the explicit loader reads.
 */

import { constants, promises as fs } from "node:fs";
import type { BigIntStats } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { isReadRuntimeError, ReadRuntimeError } from "./errors.js";

export type ProtectedLoadOutcome =
  { readonly status: "missing" } | { readonly status: "ok"; readonly bytes: Uint8Array };

function failConfiguration(): never {
  throw new ReadRuntimeError("configuration_required");
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "ENOENT"
  );
}

interface AncestorIdentity {
  readonly dir: string;
  readonly dev: bigint;
  readonly ino: bigint;
  readonly uid: number;
  readonly mode: number;
}

function ancestorsOf(selectedPath: string): Array<string> {
  const chain: Array<string> = [];
  let dir: string = path.posix.dirname(selectedPath);
  for (;;) {
    chain.push(dir);
    if (dir === "/") {
      return chain;
    }
    const parent: string = path.posix.dirname(dir);
    if (parent === dir) {
      chain.push("/");
      return chain;
    }
    dir = parent;
  }
}

function checkAncestorEntry(dir: string, entry: BigIntStats, euid: number): AncestorIdentity {
  if (entry.isSymbolicLink() || !entry.isDirectory()) {
    failConfiguration();
  }
  // UIDs and modes are small exact integers; dev/ino stay pinned bigints.
  const uid: number = Number(entry.uid);
  const mode: number = Number(entry.mode);
  if (uid !== euid && uid !== 0) {
    failConfiguration();
  }
  return { dir, dev: entry.dev, ino: entry.ino, uid, mode };
}

/**
 * Validate traversal ancestry. In strict mode every ancestor must exist
 * (absence is a race, hence fatal); in missing mode absent ancestors are
 * tolerated while every present ancestor must still pass link/type/
 * ownership/mode rules, so an unsafe ancestor behind an absent file stays
 * fatal. Returns pinned dev/ino identities for post-open revalidation.
 */
async function collectAncestors(
  selectedPath: string,
  euid: number,
  strict: boolean,
): Promise<Array<AncestorIdentity>> {
  const out: Array<AncestorIdentity> = [];
  for (const dir of ancestorsOf(selectedPath)) {
    let entry: BigIntStats;
    try {
      entry = await fs.lstat(dir, { bigint: true });
    } catch (error: unknown) {
      if (!strict && isEnoent(error)) {
        continue;
      }
      failConfiguration();
    }
    out.push(checkAncestorEntry(dir, entry as BigIntStats, euid));
  }
  return out;
}

function ancestorsAllow(chain: Array<AncestorIdentity>, euid: number): boolean {
  for (let index = 0; index < chain.length; index += 1) {
    const current: AncestorIdentity | undefined = chain[index];
    if (current === undefined) {
      return false;
    }
    if ((current.mode & 0o022) === 0) {
      continue;
    }
    // Group/other-writable ancestors are allowed only as a root-owned
    // sticky shared directory with a user-owned private 0700 subtree
    // strictly below it on the path to the selected file.
    if (current.uid !== 0 || (current.mode & 0o1000) === 0) {
      return false;
    }
    let sheltered = false;
    for (let below = 0; below < index; below += 1) {
      const inner: AncestorIdentity | undefined = chain[below];
      if (inner !== undefined && inner.uid === euid && (inner.mode & 0o777) === 0o700) {
        sheltered = true;
        break;
      }
    }
    if (!sheltered) {
      return false;
    }
  }
  return true;
}

async function revalidateAncestors(pinned: Array<AncestorIdentity>): Promise<void> {
  for (const identity of pinned) {
    let live: BigIntStats;
    try {
      live = await fs.lstat(identity.dir, { bigint: true });
    } catch {
      failConfiguration();
    }
    const current: BigIntStats = live as BigIntStats;
    const liveUid: number = Number(current.uid);
    if (
      current.isSymbolicLink() ||
      !current.isDirectory() ||
      current.dev !== identity.dev ||
      current.ino !== identity.ino ||
      liveUid !== identity.uid ||
      Number(current.mode) !== identity.mode
    ) {
      failConfiguration();
    }
  }
}

const READ_CHUNK_BYTES = 65536;

async function readBounded(handle: FileHandle, maxBytes: number): Promise<Uint8Array> {
  const chunks: Array<Buffer> = [];
  let total = 0;
  let position = 0;
  const limit: number = maxBytes + 1;
  for (;;) {
    const want: number = Math.min(READ_CHUNK_BYTES, limit - total);
    if (want <= 0) {
      failConfiguration();
    }
    const buffer: Buffer = Buffer.alloc(want);
    let bytesRead = 0;
    try {
      const result = await handle.read(buffer, 0, want, position);
      bytesRead = result.bytesRead;
    } catch {
      failConfiguration();
    }
    if (bytesRead === 0) {
      break;
    }
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
    position += bytesRead;
    if (total > maxBytes) {
      failConfiguration();
    }
  }
  return new Uint8Array(Buffer.concat(chunks, total));
}

/**
 * Load one protected startup file. A genuinely absent selected file reports
 * "missing" (the caller treats a missing config as unconfigured) only after
 * its ancestry validates; every other unsafe/malformed/oversize condition,
 * and every native IO failure, throws a fixed sanitized
 * ReadRuntimeError(configuration_required).
 */
export async function loadProtectedFile(
  selectedPath: string,
  maxBytes: number,
): Promise<ProtectedLoadOutcome> {
  try {
    return await loadProtectedFileInner(selectedPath, maxBytes);
  } catch (error: unknown) {
    if (isReadRuntimeError(error)) {
      throw error;
    }
    failConfiguration();
  }
}

async function loadProtectedFileInner(
  selectedPath: string,
  maxBytes: number,
): Promise<ProtectedLoadOutcome> {
  let handle: FileHandle | undefined;
  try {
    if (process.platform !== "linux") {
      failConfiguration();
    }
    if (typeof process.geteuid !== "function") {
      failConfiguration();
    }
    const euid: number = process.geteuid();
    let selected: BigIntStats;
    try {
      selected = await fs.lstat(selectedPath, { bigint: true });
    } catch (error: unknown) {
      if (isEnoent(error)) {
        const missingChain: Array<AncestorIdentity> = await collectAncestors(
          selectedPath,
          euid,
          false,
        );
        if (!ancestorsAllow(missingChain, euid)) {
          failConfiguration();
        }
        return { status: "missing" };
      }
      failConfiguration();
    }
    const entry: BigIntStats = selected as BigIntStats;
    if (entry.isSymbolicLink()) {
      failConfiguration();
    }
    if (!entry.isFile()) {
      // Nonregular selections (directories, FIFOs, devices, sockets)
      // reject before opening, so opening can never block on them.
      failConfiguration();
    }
    // Pin the pre-open selected identity; the opened descriptor and the
    // live path entry must both match it below.
    const preDev: bigint = entry.dev;
    const preIno: bigint = entry.ino;
    const pinned: Array<AncestorIdentity> = await collectAncestors(selectedPath, euid, true);
    if (!ancestorsAllow(pinned, euid)) {
      failConfiguration();
    }
    try {
      // Nonblocking open: a regular-to-FIFO substitution between the
      // pre-open type check and the open must not hang before fstat.
      handle = await fs.open(
        selectedPath,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
    } catch {
      failConfiguration();
    }
    const active: FileHandle = handle as FileHandle;
    const descriptor: BigIntStats = await active.stat({ bigint: true });
    const descriptorUid: number = Number(descriptor.uid);
    const descriptorMode: number = Number(descriptor.mode);
    if (
      !descriptor.isFile() ||
      descriptor.dev !== preDev ||
      descriptor.ino !== preIno ||
      descriptor.nlink !== BigInt(1) ||
      descriptorUid !== euid ||
      ((descriptorMode & 0o777) !== 0o400 && (descriptorMode & 0o777) !== 0o600)
    ) {
      failConfiguration();
    }
    // Re-examine the path without following links: the final component
    // must still be a non-link with the pinned identity and live-safe
    // ownership/mode/link count, and every pinned ancestor must still
    // hold its identity, so detected file/ancestor substitution or
    // permission drift fails closed.
    let live: BigIntStats;
    try {
      live = await fs.lstat(selectedPath, { bigint: true });
    } catch {
      failConfiguration();
    }
    const current: BigIntStats = live as BigIntStats;
    const liveUid: number = Number(current.uid);
    const liveMode: number = Number(current.mode);
    if (
      current.isSymbolicLink() ||
      !current.isFile() ||
      current.dev !== preDev ||
      current.ino !== preIno ||
      current.nlink !== BigInt(1) ||
      liveUid !== euid ||
      ((liveMode & 0o777) !== 0o400 && (liveMode & 0o777) !== 0o600)
    ) {
      failConfiguration();
    }
    await revalidateAncestors(pinned);
    if (descriptor.size > BigInt(maxBytes)) {
      failConfiguration();
    }
    const bytes: Uint8Array = await readBounded(active, maxBytes);
    try {
      await active.close();
    } catch {
      failConfiguration();
    }
    handle = undefined;
    return { status: "ok", bytes };
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch {
        // Best-effort owned cleanup; settlement already decided above.
      }
    }
  }
}

/**
 * Parse strict metadata JSON: strict UTF-8, no BOM, duplicate-key-free
 * objects (escaped-key duplicates included), and a top-level object root.
 * Anything else throws ReadRuntimeError(configuration_required) without
 * parser excerpts or exception messages. Structural tracking in the
 * duplicate scan is lenient: genuine syntax errors fall through to the
 * native parse, which rejects them; only an observed duplicate key in
 * otherwise well-formed structure rejects early.
 */
export function parseStrictMetadataJson(bytes: Uint8Array): Record<string, unknown> {
  try {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      failConfiguration();
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      failConfiguration();
    }
    const decoded: string = text as string;
    if (decoded.startsWith("﻿")) {
      failConfiguration();
    }
    assertDuplicateKeyFree(decoded);
    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      failConfiguration();
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      failConfiguration();
    }
    return parsed as Record<string, unknown>;
  } catch (error: unknown) {
    if (isReadRuntimeError(error)) {
      throw error;
    }
    failConfiguration();
  }
}

function readJsonString(text: string, start: number): { value: string; end: number } | null {
  let out = "";
  let pos = start + 1;
  for (;;) {
    if (pos >= text.length) {
      return null;
    }
    const unit: string | undefined = text[pos];
    if (unit === undefined) {
      return null;
    }
    if (unit === '"') {
      return { value: out, end: pos + 1 };
    }
    if (unit === "\\") {
      pos += 1;
      const esc: string | undefined = text[pos];
      if (esc === undefined) {
        return null;
      }
      if (esc === "u") {
        const hex: string = text.slice(pos + 1, pos + 5);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          return null;
        }
        out += String.fromCharCode(parseInt(hex, 16));
        pos += 5;
        continue;
      }
      if (
        esc === '"' ||
        esc === "\\" ||
        esc === "/" ||
        esc === "b" ||
        esc === "f" ||
        esc === "n" ||
        esc === "r" ||
        esc === "t"
      ) {
        out +=
          esc === "b"
            ? ""
            : esc === "f"
              ? ""
              : esc === "n"
                ? "\n"
                : esc === "r"
                  ? "\r"
                  : esc === "t"
                    ? "	"
                    : esc;
        pos += 1;
        continue;
      }
      return null;
    }
    out += unit;
    pos += 1;
  }
}

function assertDuplicateKeyFree(text: string): void {
  // Stack of per-object key sets; only structural characters outside
  // strings affect tracking. A string directly followed (past whitespace)
  // by ':' is an object key in valid JSON; in malformed input the native
  // parse still decides. Any scan confusion bails out silently.
  const stack: Array<{ kind: "object" | "array"; keys: Set<string> }> = [];
  let pendingKey: string | null = null;
  let pos = 0;
  const bail = (): void => {
    pos = text.length;
  };
  while (pos < text.length) {
    const unit: string | undefined = text[pos];
    if (unit === undefined) {
      return;
    }
    if (unit === '"' && pendingKey === null) {
      const read: { value: string; end: number } | null = readJsonString(text, pos);
      if (read === null) {
        bail();
        return;
      }
      pos = read.end;
      let probe: number = pos;
      while (
        probe < text.length &&
        (text[probe] === " " || text[probe] === "	" || text[probe] === "\n" || text[probe] === "\r")
      ) {
        probe += 1;
      }
      if (text[probe] === ":") {
        pendingKey = read.value;
      }
      continue;
    }
    if (unit === "{") {
      stack.push({ kind: "object", keys: new Set<string>() });
      pendingKey = null;
      pos += 1;
      continue;
    }
    if (unit === "[") {
      stack.push({ kind: "array", keys: new Set<string>() });
      pendingKey = null;
      pos += 1;
      continue;
    }
    if (unit === "}" || unit === "]") {
      const frame: { kind: "object" | "array"; keys: Set<string> } | undefined = stack.pop();
      if (frame === undefined || frame.kind !== (unit === "}" ? "object" : "array")) {
        bail();
        return;
      }
      pendingKey = null;
      pos += 1;
      continue;
    }
    if (unit === ":") {
      const top: { kind: "object" | "array"; keys: Set<string> } | undefined =
        stack[stack.length - 1];
      if (top === undefined || top.kind !== "object" || pendingKey === null) {
        bail();
        return;
      }
      if (top.keys.has(pendingKey)) {
        failConfiguration();
      }
      top.keys.add(pendingKey);
      pendingKey = null;
      pos += 1;
      continue;
    }
    if (unit === "\\") {
      // A stray backslash outside a string is malformed; leave it to JSON.parse.
      bail();
      return;
    }
    pos += 1;
  }
}

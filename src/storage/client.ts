/**
 * T04 protected storage — shared parent-side IPC session client (internal).
 *
 * Used by the production entry (holder worker) and the diagnostic entry
 * (diagnostic worker). The proxy validates and copies every argument before
 * sending, enforces whole-call deadlines (expiry terminates the
 * lease-owning worker before reporting), reconstructs sanitized errors, and
 * fences on malformed worker records. It never decrypts payloads or holds
 * key material. extraPid carries the diagnostic worker pid when the worker
 * supplies it; production holders never do.
 */

import fs from "node:fs";
import path from "node:path";
import type { ChildProcess } from "node:child_process";
import { StorageError } from "./errors.js";
import { euid as currentEuid, assertSafeAncestors, fsyncDirectory } from "./fsutil.js";
import { ParentChannel, spawnLeaseHolder, FLOCK_CONFLICT_EXIT, type SpawnResult } from "./ipc.js";
import type { ProfileSession, StorageBinding } from "./types.js";
import {
  assertBinding,
  assertByteView,
  assertStoreUpdate,
  assertUuid,
  captureShape,
  copyBytes,
  optionalField,
  requiredField,
} from "./validate.js";
import type { CapturedEntries } from "./validate.js";

export class IpcSession implements ProfileSession {
  readonly binding: StorageBinding;
  readonly extraPid: number | null;
  private readonly channel: ParentChannel;
  private readonly callTimeoutMs: number;
  private closed: boolean;
  private oldCapture: boolean;

  constructor(
    binding: StorageBinding,
    channel: ParentChannel,
    callTimeoutMs: number,
    extraPid: number | null,
  ) {
    this.binding = binding;
    this.channel = channel;
    this.callTimeoutMs = callTimeoutMs;
    this.extraPid = extraPid;
    this.closed = false;
    this.oldCapture = false;
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new StorageError("not_owner");
    }
  }

  private ensureCurrent(): void {
    this.ensureOpen();
    if (this.oldCapture) {
      throw new StorageError("generation_mismatch");
    }
  }

  private deadline(): number {
    return Date.now() + this.callTimeoutMs;
  }

  private async expectBytes(result: unknown): Promise<Uint8Array> {
    if (!(result instanceof Uint8Array)) {
      await this.channel.terminate();
      throw new StorageError("commit_ambiguous");
    }
    return copyBytes(result);
  }

  private async expectBinding(result: unknown): Promise<StorageBinding> {
    try {
      return assertBinding(result);
    } catch {
      await this.channel.terminate();
      throw new StorageError("commit_ambiguous");
    }
  }

  /**
   * Transition results must equal the exact requested next binding
   * (account/origin/profile/generation), not merely any shape-valid
   * binding from the worker. Anything else quarantines the channel.
   */
  private async expectTransition(
    result: unknown,
    expected: StorageBinding,
  ): Promise<StorageBinding> {
    let next: StorageBinding;
    try {
      next = assertBinding(result);
    } catch {
      await this.channel.terminate();
      throw new StorageError("commit_ambiguous");
    }
    if (
      next.origin !== expected.origin ||
      next.accountUuid !== expected.accountUuid ||
      next.sessionGeneration !== expected.sessionGeneration ||
      next.profileGenerationId !== expected.profileGenerationId
    ) {
      await this.channel.terminate();
      throw new StorageError("commit_ambiguous");
    }
    return next;
  }

  private async expectVoid(result: unknown): Promise<void> {
    if (result !== null && result !== undefined) {
      await this.channel.terminate();
      throw new StorageError("commit_ambiguous");
    }
  }

  async readVaultBytes(): Promise<Uint8Array> {
    const deadlineMs: number = this.deadline();
    this.ensureCurrent();
    const result: unknown = await this.channel.send(
      "readVault",
      {
        captureGeneration: this.binding.sessionGeneration,
        deadlineMs,
      },
      deadlineMs,
    );
    return this.expectBytes(result);
  }

  async readOperationStoreBytes(): Promise<Uint8Array> {
    const deadlineMs: number = this.deadline();
    this.ensureCurrent();
    const result: unknown = await this.channel.send(
      "readOps",
      {
        captureGeneration: this.binding.sessionGeneration,
        deadlineMs,
      },
      deadlineMs,
    );
    return this.expectBytes(result);
  }

  async commit(update: { vaultBytes?: Uint8Array; operationBytes?: Uint8Array }): Promise<void> {
    const deadlineMs: number = this.deadline();
    this.ensureCurrent();
    const checked: {
      vaultBytes?: Uint8Array;
      operationBytes?: Uint8Array;
    } = assertStoreUpdate(update);
    const updateParams: Record<string, unknown> = {};
    if (checked.vaultBytes !== undefined) {
      updateParams["vaultBytes"] = checked.vaultBytes;
    }
    if (checked.operationBytes !== undefined) {
      updateParams["operationBytes"] = checked.operationBytes;
    }
    const result: unknown = await this.channel.send(
      "commit",
      {
        captureGeneration: this.binding.sessionGeneration,
        deadlineMs,
        update: updateParams,
      },
      deadlineMs,
    );
    await this.expectVoid(result);
  }

  async bindAccount(
    accountUuid: string,
    replacementVaultBytes: Uint8Array,
  ): Promise<StorageBinding> {
    const deadlineMs: number = this.deadline();
    this.ensureCurrent();
    const uuid: string = assertUuid(accountUuid);
    const vault: Uint8Array = copyBytes(assertByteView(replacementVaultBytes, true));
    const result: unknown = await this.channel.send(
      "bind",
      {
        captureGeneration: this.binding.sessionGeneration,
        deadlineMs,
        accountUuid: uuid,
        vaultBytes: vault,
      },
      deadlineMs,
    );
    const next: StorageBinding = await this.expectTransition(result, {
      origin: this.binding.origin,
      accountUuid: uuid,
      sessionGeneration: 1,
      profileGenerationId: this.binding.profileGenerationId,
    });
    this.oldCapture = true;
    return next;
  }

  async advanceSessionGeneration(replacementVaultBytes: Uint8Array): Promise<StorageBinding> {
    const deadlineMs: number = this.deadline();
    this.ensureCurrent();
    if (this.binding.accountUuid === null) {
      throw new StorageError("binding_mismatch");
    }
    const vault: Uint8Array = copyBytes(assertByteView(replacementVaultBytes, true));
    const result: unknown = await this.channel.send(
      "advance",
      {
        captureGeneration: this.binding.sessionGeneration,
        deadlineMs,
        vaultBytes: vault,
      },
      deadlineMs,
    );
    const next: StorageBinding = await this.expectTransition(result, {
      origin: this.binding.origin,
      accountUuid: this.binding.accountUuid,
      sessionGeneration: this.binding.sessionGeneration + 1,
      profileGenerationId: this.binding.profileGenerationId,
    });
    this.oldCapture = true;
    return next;
  }

  async keyedIntentDigest(identityMaterialUtf8: Uint8Array): Promise<Uint8Array> {
    const deadlineMs: number = this.deadline();
    this.ensureCurrent();
    const material: Uint8Array = copyBytes(assertByteView(identityMaterialUtf8, true));
    const result: unknown = await this.channel.send(
      "digest",
      {
        captureGeneration: this.binding.sessionGeneration,
        deadlineMs,
        identityBytes: material,
      },
      deadlineMs,
    );
    return this.expectBytes(result);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    try {
      const deadlineMs: number = this.deadline();
      const result: unknown = await this.channel.send("close", { deadlineMs }, deadlineMs);
      await this.expectVoid(result);
    } catch {
      // Close releases stale/fenced handles alike; worker death is fine.
    }
    await this.channel.terminate();
  }
}

export interface FirstReply {
  binding: StorageBinding;
  holderPid: number | null;
}

export function readFirstReply(result: unknown, requirePid: boolean): FirstReply {
  let entries: CapturedEntries;
  try {
    entries = captureShape(result, ["binding", "holderPid"]);
  } catch {
    throw new StorageError("commit_ambiguous");
  }
  let binding: StorageBinding;
  try {
    binding = assertBinding(requiredField(entries, "binding"));
  } catch {
    throw new StorageError("commit_ambiguous");
  }
  const pidRaw: unknown = optionalField(entries, "holderPid");
  if (pidRaw === undefined) {
    if (requirePid) {
      throw new StorageError("commit_ambiguous");
    }
    return { binding, holderPid: null };
  }
  if (typeof pidRaw !== "number" || !Number.isSafeInteger(pidRaw) || pidRaw <= 0) {
    throw new StorageError("commit_ambiguous");
  }
  return { binding, holderPid: pidRaw };
}

function closeFdQuiet(fd: number): void {
  try {
    fs.closeSync(fd);
  } catch {
    // Best effort.
  }
}

export interface LockBootstrap {
  fd: number;
  identity: { dev: string; ino: string };
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

function classifyMissingRoot(profileRoot: string, code: string): StorageError {
  if (code !== "ENOENT") {
    return new StorageError("io_failure");
  }
  try {
    fs.lstatSync(profileRoot);
    return new StorageError("anchor_missing");
  } catch (error) {
    if (errnoOf(error) === "ENOENT") {
      return new StorageError("not_provisioned");
    }
    return new StorageError("io_failure");
  }
}

/**
 * Nonsecret lock bootstrap. Ensures the anchor root and lock file exist
 * (provision) or exist already (open), validates type/ownership/mode/link
 * count without following symlinks, and returns the open descriptor plus
 * its bigint-derived identity. No payload, key, or anchor IO happens here.
 */
export function bootstrapLock(
  anchorRoot: string,
  profileRoot: string,
  create: boolean,
): LockBootstrap {
  assertSafeAncestors(anchorRoot);
  try {
    const st: fs.Stats = fs.lstatSync(anchorRoot);
    if (st.isSymbolicLink()) {
      throw new StorageError("io_failure");
    }
    if (!st.isDirectory() || st.uid !== currentEuid() || (st.mode & 0o77) !== 0) {
      throw new StorageError("io_failure");
    }
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    if (errnoOf(error) === "ENOENT" && create) {
      try {
        fs.mkdirSync(anchorRoot, { mode: 0o700, recursive: false });
      } catch {
        throw new StorageError("io_failure");
      }
      fsyncDirectory(path.dirname(anchorRoot));
    } else {
      throw classifyMissingRoot(profileRoot, errnoOf(error));
    }
  }
  const lockPath: string = path.join(anchorRoot, "owner.lock");
  let fd: number;
  try {
    fd = fs.openSync(
      lockPath,
      create
        ? fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW
        : fs.constants.O_RDWR | fs.constants.O_NOFOLLOW,
      0o600,
    );
  } catch (error) {
    if (errnoOf(error) === "ENOENT" && !create) {
      throw classifyMissingRoot(profileRoot, "ENOENT");
    }
    throw new StorageError("io_failure");
  }
  try {
    const st: fs.BigIntStats = fs.fstatSync(fd, { bigint: true });
    if (
      !st.isFile() ||
      st.nlink !== BigInt(1) ||
      st.uid !== BigInt(currentEuid()) ||
      (st.mode & BigInt(0o777)) !== BigInt(0o600)
    ) {
      throw new StorageError("io_failure");
    }
    if (create) {
      // Flush lock-file metadata needed for acknowledged durable
      // provisioning (open paths skip this: nothing new was created).
      try {
        fs.fsyncSync(fd);
      } catch {
        throw new StorageError("io_failure");
      }
      fsyncDirectory(anchorRoot);
    }
    return {
      fd,
      identity: { dev: st.dev.toString(10), ino: st.ino.toString(10) },
    };
  } catch (error) {
    closeFdQuiet(fd);
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("io_failure");
  }
}

/**
 * Spawn the lease holder on an already-bootstrapped lock descriptor,
 * deliver the first command, and return the live session. The parent's
 * descriptor copy closes immediately after spawn. Flock conflict exit 73
 * maps to locked_by_other_owner; other pre-reply exits map to io_failure.
 */
export async function launchIpcSession(args: {
  workerJsPath: string;
  lockFd: number;
  op: "provision" | "open";
  params: Record<string, unknown>;
  timeoutMs: number;
  deadlineMs: number;
  requirePid: boolean;
}): Promise<IpcSession> {
  let child: ChildProcess;
  try {
    const spawned: SpawnResult = spawnLeaseHolder(args.workerJsPath, args.lockFd);
    child = spawned.child;
  } catch {
    closeFdQuiet(args.lockFd);
    throw new StorageError("io_failure");
  }
  closeFdQuiet(args.lockFd);
  const channel: ParentChannel = new ParentChannel(child);
  const firstReply: Promise<unknown> = channel.send(args.op, args.params, args.deadlineMs);
  // Spawn-failure watcher only: process-spawn errors surface as 'error'
  // without 'exit'. All started-process outcomes flow through firstReply
  // and the deterministic catch classification below; no exit mapping
  // races the reply, so a delivered primary diagnostic can never be
  // stolen by a secondary shutdown observation.
  const spawnFailed: Promise<never> = new Promise<never>((_resolve, reject) => {
    child.once("error", () => {
      reject(new StorageError("io_failure"));
    });
  });
  try {
    const result: unknown = await Promise.race([firstReply, spawnFailed]);
    const first: FirstReply = readFirstReply(result, args.requirePid);
    return new IpcSession(first.binding, channel, args.timeoutMs, first.holderPid);
  } catch (error) {
    await channel.terminate();
    // Deterministic startup classification: when the worker process is
    // dead without ever delivering a first reply, the exit code decides.
    // Actual kernel conflict exit 73 proves contention (the lease was
    // never acquired), so it reports locked_by_other_owner regardless of
    // exit/IPC event timing; any other nonzero exit is a definite startup
    // failure, never an uncertain lease claim. A live (or parent-killed)
    // worker keeps the original error, including deadline fencing.
    const exitCode: number | null = child.exitCode;
    if (exitCode !== null && exitCode !== 0) {
      throw exitCode === FLOCK_CONFLICT_EXIT
        ? new StorageError("locked_by_other_owner")
        : new StorageError("io_failure");
    }
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("io_failure");
  }
}

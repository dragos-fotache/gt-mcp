/**
 * T04 protected storage — isolated diagnostic test facility (separate entry).
 *
 * Exact runtime exports: createStorageTestFacility,
 * attachStorageTestFacility. Never imported by the production barrel or
 * holder. Creation mints one restrictive OS-temp facility root with an
 * issued ticket/cookie, a fixture-only plaintext synthetic key, durable
 * fault/key-state controls, and fixed profile/anchor children. Sessions
 * spawn the separate diagnostic worker (same persistence/lease engine,
 * synthetic key backend, file-backed faults, tmpfs-tolerant policy) under
 * a real flock lease. Production keys are never written here or exposed;
 * tickets permit QA subprocess/restart tests, never production switching.
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delayTimeout } from "node:timers";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapLock, launchIpcSession, type IpcSession, type LockBootstrap } from "./client.js";
import { StorageError, type StorageErrorCode } from "./errors.js";
import { countWriteFlockLeases, removeTree, validateDirStat } from "./fsutil.js";
import type {
  DiagnosticSession,
  StorageBinding,
  StorageFault,
  StorageFaultPoint,
  StorageLocation,
  StorageTestFacility,
  TestFacilityTicket,
} from "./types.js";
import {
  assertBinding,
  assertOrigin,
  assertUuid,
  captureShape,
  optionalField,
  requiredField,
  DEFAULT_TIMEOUT_MS,
} from "./validate.js";
import type { CapturedEntries } from "./validate.js";

export type {
  DiagnosticSession,
  StorageBinding,
  StorageFault,
  StorageFaultPoint,
  StorageLocation,
  StorageTestFacility,
  TestFacilityTicket,
};

import {
  CONTROLS_JSON,
  FAULT_POINTS,
  KEY_STATES,
  SYNTHETIC_KEY,
  SYNTHETIC_KEY_LEN,
  readControls,
  readJsonFile,
  writeControls,
  type FacilityControls,
  type SyntheticKeyState,
} from "./diag-support.js";

const FACILITY_JSON: string = "facility.json";
const PROFILE_CHILD: string = "profile";
const ANCHOR_CHILD: string = "anchor";
interface FacilityRecord {
  ticket: string;
  capability: string;
  profileGenerationId: string;
}

function readFacilityRecord(root: string, mismatchCode: StorageErrorCode): FacilityRecord {
  let parsed: unknown;
  try {
    parsed = readJsonFile(path.join(root, FACILITY_JSON));
  } catch {
    throw new StorageError(mismatchCode);
  }
  let captured: CapturedEntries;
  try {
    captured = captureShape(parsed, ["ticket", "capability", "profileGenerationId"]);
  } catch {
    throw new StorageError(mismatchCode);
  }
  const ticket: unknown = requiredField(captured, "ticket");
  const capability: unknown = requiredField(captured, "capability");
  const profileGenerationId: unknown = requiredField(captured, "profileGenerationId");
  if (
    typeof ticket !== "string" ||
    typeof capability !== "string" ||
    typeof profileGenerationId !== "string"
  ) {
    throw new StorageError(mismatchCode);
  }
  return { ticket, capability, profileGenerationId };
}

/**
 * Validate an issued facility root. Unsafe conditions (symlinks,
 * ownership, modes) always fail io_failure. Absent roots and content
 * mismatches map to mismatchCode: invalid_argument for ticket attach
 * (absent/nonissued/wrong content), io_failure for cleanup (a replacement
 * root must never be removed).
 */
function validateFacilityRoot(root: string, mismatchCode: StorageErrorCode): FacilityRecord {
  if (!path.isAbsolute(root) || root.includes("\0")) {
    throw new StorageError("invalid_argument");
  }
  let entries: string[];
  try {
    entries = fs.readdirSync(root);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "ENOENT"
    ) {
      throw new StorageError(mismatchCode);
    }
    throw new StorageError("io_failure");
  }
  const expected: readonly string[] = [
    FACILITY_JSON,
    SYNTHETIC_KEY,
    CONTROLS_JSON,
    PROFILE_CHILD,
    ANCHOR_CHILD,
  ];
  if (
    entries.length !== expected.length ||
    !expected.every((name: string): boolean => entries.includes(name))
  ) {
    throw new StorageError(mismatchCode);
  }
  for (const name of expected) {
    const child: string = path.join(root, name);
    let st: fs.Stats;
    try {
      st = fs.lstatSync(child);
    } catch {
      throw new StorageError("io_failure");
    }
    if (st.isSymbolicLink()) {
      throw new StorageError("io_failure");
    }
  }
  const profileSt: fs.Stats = (() => {
    try {
      return fs.lstatSync(path.join(root, PROFILE_CHILD));
    } catch {
      throw new StorageError(mismatchCode);
    }
  })();
  const anchorSt: fs.Stats = (() => {
    try {
      return fs.lstatSync(path.join(root, ANCHOR_CHILD));
    } catch {
      throw new StorageError(mismatchCode);
    }
  })();
  try {
    validateDirStat(profileSt);
    validateDirStat(anchorSt);
  } catch {
    throw new StorageError("io_failure");
  }
  return readFacilityRecord(root, mismatchCode);
}

function diagWorkerJsPath(): string {
  return fileURLToPath(new URL("./diag-worker.js", import.meta.url));
}

class FacilitySession implements DiagnosticSession {
  readonly holderPid: number;
  private readonly inner: IpcSession;

  constructor(inner: IpcSession, holderPid: number) {
    this.inner = inner;
    this.holderPid = holderPid;
  }

  get binding(): StorageBinding {
    return this.inner.binding;
  }

  readVaultBytes(): Promise<Uint8Array> {
    return this.inner.readVaultBytes();
  }

  readOperationStoreBytes(): Promise<Uint8Array> {
    return this.inner.readOperationStoreBytes();
  }

  commit(update: { vaultBytes?: Uint8Array; operationBytes?: Uint8Array }): Promise<void> {
    return this.inner.commit(update);
  }

  bindAccount(accountUuid: string, replacementVaultBytes: Uint8Array): Promise<StorageBinding> {
    return this.inner.bindAccount(accountUuid, replacementVaultBytes);
  }

  advanceSessionGeneration(replacementVaultBytes: Uint8Array): Promise<StorageBinding> {
    return this.inner.advanceSessionGeneration(replacementVaultBytes);
  }

  keyedIntentDigest(identityMaterialUtf8: Uint8Array): Promise<Uint8Array> {
    return this.inner.keyedIntentDigest(identityMaterialUtf8);
  }

  close(): Promise<void> {
    return this.inner.close();
  }
}

class Facility implements StorageTestFacility {
  readonly ticket: TestFacilityTicket;
  readonly locations: StorageLocation;
  readonly profileGenerationId: string;
  private readonly facilityRoot: string;

  constructor(
    ticket: TestFacilityTicket,
    locations: StorageLocation,
    profileGenerationId: string,
    facilityRoot: string,
  ) {
    this.ticket = ticket;
    this.locations = locations;
    this.profileGenerationId = profileGenerationId;
    this.facilityRoot = facilityRoot;
  }

  private async launch(
    op: "provision" | "open",
    params: Record<string, unknown>,
    createLock: boolean,
  ): Promise<FacilitySession> {
    const deadlineMs: number = Date.now() + DEFAULT_TIMEOUT_MS;
    const bootstrap: LockBootstrap = bootstrapLock(
      this.locations.anchorRoot,
      this.locations.profileRoot,
      createLock,
    );
    const fullParams: Record<string, unknown> = {
      ...params,
      profileRoot: this.locations.profileRoot,
      anchorRoot: this.locations.anchorRoot,
      facilityRoot: this.facilityRoot,
      profileGenerationId: this.profileGenerationId,
      expectedLock: bootstrap.identity,
      deadlineMs,
    };
    const inner: IpcSession = await launchIpcSession({
      workerJsPath: diagWorkerJsPath(),
      lockFd: bootstrap.fd,
      op,
      params: fullParams,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      deadlineMs,
      requirePid: true,
    });
    if (inner.extraPid === null) {
      await inner.close();
      throw new StorageError("commit_ambiguous");
    }
    return new FacilitySession(inner, inner.extraPid);
  }

  async provision(origin: string): Promise<DiagnosticSession> {
    const checkedOrigin: string = assertOrigin(origin);
    return this.launch("provision", { origin: checkedOrigin }, true);
  }

  async open(expectedBinding: StorageBinding): Promise<DiagnosticSession> {
    const expected: StorageBinding = assertBinding(expectedBinding);
    return this.launch("open", { expectedBinding: { ...expected } }, false);
  }

  async armFault(fault: StorageFault): Promise<void> {
    const captured: CapturedEntries = captureShape(fault, ["point", "action", "occurrence"]);
    const point: unknown = requiredField(captured, "point");
    const action: unknown = requiredField(captured, "action");
    const occurrenceRaw: unknown = optionalField(captured, "occurrence");
    if (
      typeof point !== "string" ||
      !(FAULT_POINTS as readonly string[]).includes(point) ||
      (action !== "throw" && action !== "kill-holder")
    ) {
      throw new StorageError("invalid_argument");
    }
    const occurrence: number = occurrenceRaw === undefined ? 1 : (occurrenceRaw as number);
    if (typeof occurrence !== "number" || !Number.isSafeInteger(occurrence) || occurrence < 1) {
      throw new StorageError("invalid_argument");
    }
    const controls: FacilityControls = readControls(this.facilityRoot);
    await writeControls(this.facilityRoot, {
      fault: {
        point: point as StorageFaultPoint,
        action,
        occurrence,
      },
      keyState: controls.keyState,
      keyCreated: controls.keyCreated,
      seq: controls.seq + 1,
    });
  }

  async clearFault(): Promise<void> {
    const controls: FacilityControls = readControls(this.facilityRoot);
    await writeControls(this.facilityRoot, {
      fault: null,
      keyState: controls.keyState,
      keyCreated: controls.keyCreated,
      seq: controls.seq + 1,
    });
  }

  async setKeyState(state: SyntheticKeyState): Promise<void> {
    if (!(KEY_STATES as readonly string[]).includes(state)) {
      throw new StorageError("invalid_argument");
    }
    const controls: FacilityControls = readControls(this.facilityRoot);
    await writeControls(this.facilityRoot, {
      fault: controls.fault,
      keyState: state,
      keyCreated: controls.keyCreated,
      seq: controls.seq,
    });
  }

  /**
   * Remove the issued facility root. Absent roots succeed idempotently.
   * The issued marker/cookie is revalidated first, so a same-path
   * replacement root is never removed (io_failure). Exclusion is held by
   * a spawned flock guard for the entire deletion: contention reports
   * locked_by_other_owner. Only the guard child (spawned here) is ever
   * signaled, never an inferred owner process.
   */
  async cleanup(): Promise<void> {
    try {
      fs.lstatSync(this.facilityRoot);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "ENOENT"
      ) {
        return;
      }
      throw new StorageError("io_failure");
    }
    const stored: FacilityRecord = validateFacilityRoot(this.facilityRoot, "io_failure");
    const presented: Buffer = Buffer.from(this.ticket.capability, "utf8");
    const expected: Buffer = Buffer.from(stored.capability, "utf8");
    if (
      presented.byteLength !== expected.byteLength ||
      !crypto.timingSafeEqual(presented, expected)
    ) {
      throw new StorageError("io_failure");
    }
    const lockPath: string = path.join(this.locations.anchorRoot, "owner.lock");
    let lockPresent: boolean = true;
    try {
      fs.lstatSync(lockPath);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "ENOENT"
      ) {
        lockPresent = false;
      } else {
        throw new StorageError("io_failure");
      }
    }
    if (!lockPresent) {
      removeTree(this.facilityRoot);
      return;
    }
    const lockId: { dev: string; ino: string } = (() => {
      try {
        const st: fs.BigIntStats = fs.lstatSync(lockPath, { bigint: true });
        return { dev: st.dev.toString(10), ino: st.ino.toString(10) };
      } catch {
        throw new StorageError("io_failure");
      }
    })();
    let guard: ChildProcess;
    try {
      // --no-fork: the tracked guard PID execs into sleep itself and is
      // the sole lease holder. A default-fork supervisor would leave its
      // exec'd sleep child holding a duplicate of the lease after the
      // supervisor is reaped (orphan lease); no descendant survives here.
      guard = spawn(
        "flock",
        ["--no-fork", "--nonblock", "--conflict-exit-code", "73", lockPath, "sleep", "600"],
        {
          stdio: "ignore",
        },
      );
    } catch {
      throw new StorageError("io_failure");
    }
    try {
      await this.awaitGuardLease(guard, lockId);
    } catch (error) {
      await this.reapGuard(guard);
      throw error;
    }
    try {
      removeTree(this.facilityRoot);
    } finally {
      await this.reapGuard(guard);
    }
    try {
      fs.lstatSync(this.facilityRoot);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "ENOENT"
      ) {
        return;
      }
    }
    throw new StorageError("io_failure");
  }

  private async awaitGuardLease(
    guard: ChildProcess,
    lockId: { dev: string; ino: string },
  ): Promise<void> {
    const deadline: number = Date.now() + DEFAULT_TIMEOUT_MS;
    for (;;) {
      if (guard.exitCode !== null || guard.signalCode !== null) {
        if (guard.exitCode === 73) {
          throw new StorageError("locked_by_other_owner");
        }
        throw new StorageError("io_failure");
      }
      if (guard.pid === undefined) {
        throw new StorageError("io_failure");
      }
      let leases: number;
      try {
        leases = countWriteFlockLeases(String(guard.pid), lockId.dev, lockId.ino);
      } catch {
        throw new StorageError("io_failure");
      }
      if (leases === 1) {
        return;
      }
      if (leases > 1) {
        throw new StorageError("io_failure");
      }
      if (Date.now() >= deadline) {
        throw new StorageError("io_failure");
      }
      await new Promise<void>((resolve) => {
        delayTimeout(resolve, 5);
      });
    }
  }

  private async reapGuard(guard: ChildProcess): Promise<void> {
    try {
      guard.kill("SIGKILL");
    } catch {
      // Fall through to verified observation below.
    }
    if (guard.exitCode !== null || guard.signalCode !== null) {
      return;
    }
    await new Promise<void>((resolve) => {
      guard.once("close", () => {
        resolve();
      });
    });
  }
}

function writeFileRestrictive(filePath: string, content: Uint8Array): void {
  const fd: number = fs.openSync(
    filePath,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW,
    0o600,
  );
  try {
    let offset: number = 0;
    const buffer: Buffer = Buffer.from(content);
    while (offset < buffer.byteLength) {
      const written: number = fs.writeSync(fd, buffer, offset);
      if (written <= 0) {
        throw new StorageError("io_failure");
      }
      offset += written;
    }
    fs.fsyncSync(fd);
  } catch (error) {
    try {
      fs.closeSync(fd);
    } catch {
      // Best effort.
    }
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("io_failure");
  }
  try {
    fs.closeSync(fd);
  } catch {
    throw new StorageError("io_failure");
  }
}

export async function createStorageTestFacility(): Promise<StorageTestFacility> {
  const root: string = fs.mkdtempSync(path.join(os.tmpdir(), "gtms-facility-"));
  try {
    const ticket: string = crypto.randomUUID();
    const capability: string = crypto.randomBytes(32).toString("hex");
    const profileGenerationId: string = crypto.randomUUID();
    const profileRoot: string = path.join(root, PROFILE_CHILD);
    const anchorRoot: string = path.join(root, ANCHOR_CHILD);
    fs.mkdirSync(profileRoot, { mode: 0o700 });
    fs.mkdirSync(anchorRoot, { mode: 0o700 });
    writeFileRestrictive(
      path.join(root, FACILITY_JSON),
      Buffer.from(JSON.stringify({ ticket, capability, profileGenerationId }), "utf8"),
    );
    writeFileRestrictive(path.join(root, SYNTHETIC_KEY), crypto.randomBytes(SYNTHETIC_KEY_LEN));
    await writeControls(root, {
      fault: null,
      keyState: "available",
      keyCreated: false,
      seq: 0,
    });
    return new Facility(
      Object.freeze({ root, capability }),
      Object.freeze({ profileRoot, anchorRoot }),
      profileGenerationId,
      root,
    );
  } catch (error) {
    try {
      removeTree(root);
    } catch {
      // Best effort.
    }
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("io_failure");
  }
}

export async function attachStorageTestFacility(
  ticket: TestFacilityTicket,
): Promise<StorageTestFacility> {
  if (typeof ticket !== "object" || ticket === null) {
    throw new StorageError("invalid_argument");
  }
  const captured: CapturedEntries = captureShape(ticket, ["root", "capability"]);
  const root: unknown = requiredField(captured, "root");
  const capability: unknown = requiredField(captured, "capability");
  if (typeof root !== "string" || typeof capability !== "string" || !path.isAbsolute(root)) {
    throw new StorageError("invalid_argument");
  }
  const stored: FacilityRecord = validateFacilityRoot(root, "invalid_argument");
  if (stored.ticket.length !== 36) {
    throw new StorageError("io_failure");
  }
  const presented: Buffer = Buffer.from(capability, "utf8");
  const expected: Buffer = Buffer.from(stored.capability, "utf8");
  if (
    presented.byteLength !== expected.byteLength ||
    !crypto.timingSafeEqual(presented, expected)
  ) {
    throw new StorageError("invalid_argument");
  }
  const facilityGeneration: string = assertUuid(stored.profileGenerationId);
  return new Facility(
    Object.freeze({ root, capability }),
    Object.freeze({
      profileRoot: path.join(root, PROFILE_CHILD),
      anchorRoot: path.join(root, ANCHOR_CHILD),
    }),
    facilityGeneration,
    root,
  );
}

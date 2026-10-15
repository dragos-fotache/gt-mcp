/**
 * T04 protected storage — internal production lease-holder worker.
 *
 * Spawned only as `flock --no-fork ... <node> holder.js` with the lock
 * descriptor inheritable and a private IPC channel. Direct invocation
 * without an IPC parent exits silently before any protected IO. The first
 * message must be provision/open; it carries the expected lock identity,
 * canonical roots, bus address, and deadline. The engine is wired to the
 * real Secret Service backend, a no-op fault probe, and the ext4-only
 * filesystem policy. Replies carry sanitized codes only.
 */

import { serveWorker, type WorkerHandler } from "./ipc.js";
import type { StorageBinding } from "./types.js";
import { StorageEngine, mintRandomMaster, type EngineOptions } from "./engine.js";
import { StorageError } from "./errors.js";
import { NoopFaultProbe } from "./faults.js";
import { SecretMasterKey } from "./keyring.js";
import {
  assertBinding,
  assertBusAddress,
  assertByteView,
  assertLocationRoots,
  assertOrigin,
  assertStoreUpdate,
  assertUuid,
  captureShape,
  copyBytes,
  requiredField,
} from "./validate.js";
import type { CapturedEntries } from "./validate.js";

const PRODUCTION_FILESYSTEMS: readonly string[] = ["ext4"];

interface WorkerState {
  engine: StorageEngine | null;
}

const state: WorkerState = { engine: null };

function assertDeadlineMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new StorageError("invalid_argument");
  }
  return value;
}

function assertLockIdentity(value: unknown): { dev: string; ino: string } {
  const captured: CapturedEntries = captureShape(value, ["dev", "ino"]);
  const dev: unknown = requiredField(captured, "dev");
  const ino: unknown = requiredField(captured, "ino");
  if (
    typeof dev !== "string" ||
    typeof ino !== "string" ||
    !/^(0|[1-9][0-9]*)$/.test(dev) ||
    !/^(0|[1-9][0-9]*)$/.test(ino)
  ) {
    throw new StorageError("invalid_argument");
  }
  return { dev, ino };
}

function baseOptions(captured: CapturedEntries): Omit<
  EngineOptions,
  "generationId" | "keyAccess"
> & {
  busAddress: string;
  deadlineMs: number;
} {
  const roots: { profileRoot: string; anchorRoot: string } = assertLocationRoots(
    requiredField(captured, "profileRoot"),
    requiredField(captured, "anchorRoot"),
  );
  const access: { socketPath: string; address: string } = assertBusAddress(
    requiredField(captured, "busAddress"),
  );
  return {
    profileRoot: roots.profileRoot,
    anchorRoot: roots.anchorRoot,
    expectedLock: assertLockIdentity(requiredField(captured, "expectedLock")),
    faults: new NoopFaultProbe(),
    allowedFilesystems: PRODUCTION_FILESYSTEMS,
    mintMaster: mintRandomMaster,
    busAddress: access.address,
    deadlineMs: assertDeadlineMs(requiredField(captured, "deadlineMs")),
  };
}

function socketPathOf(busAddress: string): string {
  return assertBusAddress(busAddress).socketPath;
}

function shape(params: Record<string, unknown>, allowed: readonly string[]): CapturedEntries {
  return captureShape(params, allowed);
}

const handlers: Record<string, WorkerHandler | undefined> = {
  provision: async (params: Record<string, unknown>): Promise<unknown> => {
    if (state.engine !== null) {
      throw new StorageError("invalid_argument");
    }
    const captured: CapturedEntries = shape(params, [
      "profileRoot",
      "anchorRoot",
      "origin",
      "profileGenerationId",
      "busAddress",
      "expectedLock",
      "deadlineMs",
    ]);
    const base: Omit<EngineOptions, "generationId" | "keyAccess"> & {
      busAddress: string;
      deadlineMs: number;
    } = baseOptions(captured);
    const origin: string = assertOrigin(requiredField(captured, "origin"));
    const generationId: string = assertUuid(requiredField(captured, "profileGenerationId"));
    const engine: StorageEngine = new StorageEngine({
      profileRoot: base.profileRoot,
      anchorRoot: base.anchorRoot,
      expectedLock: base.expectedLock,
      generationId,
      keyAccess: new SecretMasterKey(socketPathOf(base.busAddress), generationId),
      faults: base.faults,
      allowedFilesystems: base.allowedFilesystems,
      mintMaster: base.mintMaster,
    });
    const binding: StorageBinding = await engine.provision(origin, generationId, base.deadlineMs);
    state.engine = engine;
    return { binding: { ...binding } };
  },

  open: async (params: Record<string, unknown>): Promise<unknown> => {
    if (state.engine !== null) {
      throw new StorageError("invalid_argument");
    }
    const captured: CapturedEntries = shape(params, [
      "profileRoot",
      "anchorRoot",
      "expectedBinding",
      "busAddress",
      "expectedLock",
      "deadlineMs",
    ]);
    const base: Omit<EngineOptions, "generationId" | "keyAccess"> & {
      busAddress: string;
      deadlineMs: number;
    } = baseOptions(captured);
    const expected: {
      origin: string;
      accountUuid: string | null;
      sessionGeneration: number;
      profileGenerationId: string;
    } = assertBinding(requiredField(captured, "expectedBinding"));
    const engine: StorageEngine = new StorageEngine({
      profileRoot: base.profileRoot,
      anchorRoot: base.anchorRoot,
      expectedLock: base.expectedLock,
      generationId: expected.profileGenerationId,
      keyAccess: new SecretMasterKey(socketPathOf(base.busAddress), expected.profileGenerationId),
      faults: base.faults,
      allowedFilesystems: base.allowedFilesystems,
      mintMaster: base.mintMaster,
    });
    const binding: {
      origin: string;
      accountUuid: string | null;
      sessionGeneration: number;
      profileGenerationId: string;
    } = await engine.open(expected, base.deadlineMs);
    state.engine = engine;
    return { binding: { ...binding } };
  },

  readVault: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = shape(params, ["captureGeneration", "deadlineMs"]);
    const engine: StorageEngine = requireEngine();
    return copyBytes(await engine.readVault(assertCapture(captured), assertCallDeadline(captured)));
  },

  readOps: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = shape(params, ["captureGeneration", "deadlineMs"]);
    const engine: StorageEngine = requireEngine();
    return copyBytes(await engine.readOps(assertCapture(captured), assertCallDeadline(captured)));
  },

  commit: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = shape(params, ["captureGeneration", "deadlineMs", "update"]);
    const engine: StorageEngine = requireEngine();
    const update: {
      vaultBytes?: Uint8Array;
      operationBytes?: Uint8Array;
    } = assertStoreUpdate(requiredField(captured, "update"));
    await engine.commit(assertCapture(captured), update, assertCallDeadline(captured));
    return null;
  },

  bind: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = shape(params, [
      "captureGeneration",
      "deadlineMs",
      "accountUuid",
      "vaultBytes",
    ]);
    const engine: StorageEngine = requireEngine();
    const next: {
      origin: string;
      accountUuid: string | null;
      sessionGeneration: number;
      profileGenerationId: string;
    } = await engine.bindAccount(
      assertCapture(captured),
      assertUuid(requiredField(captured, "accountUuid")),
      copyBytes(assertByteView(requiredField(captured, "vaultBytes"), true)),
      assertCallDeadline(captured),
    );
    return { ...next };
  },

  advance: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = shape(params, [
      "captureGeneration",
      "deadlineMs",
      "vaultBytes",
    ]);
    const engine: StorageEngine = requireEngine();
    const next: {
      origin: string;
      accountUuid: string | null;
      sessionGeneration: number;
      profileGenerationId: string;
    } = await engine.advanceGeneration(
      assertCapture(captured),
      copyBytes(assertByteView(requiredField(captured, "vaultBytes"), true)),
      assertCallDeadline(captured),
    );
    return { ...next };
  },

  digest: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = shape(params, [
      "captureGeneration",
      "deadlineMs",
      "identityBytes",
    ]);
    const engine: StorageEngine = requireEngine();
    return copyBytes(
      await engine.intentDigest(
        assertCapture(captured),
        copyBytes(assertByteView(requiredField(captured, "identityBytes"), true)),
        assertCallDeadline(captured),
      ),
    );
  },

  close: async (): Promise<unknown> => {
    if (state.engine !== null) {
      state.engine.closeEngine();
      state.engine = null;
    }
    return null;
  },
};

function requireEngine(): StorageEngine {
  if (state.engine === null) {
    throw new StorageError("not_owner");
  }
  return state.engine;
}

function assertCapture(captured: CapturedEntries): number {
  const value: unknown = requiredField(captured, "captureGeneration");
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new StorageError("invalid_argument");
  }
  return value;
}

function assertCallDeadline(captured: CapturedEntries): number {
  return assertDeadlineMs(requiredField(captured, "deadlineMs"));
}

if (import.meta.main === true) {
  serveWorker(handlers);
}

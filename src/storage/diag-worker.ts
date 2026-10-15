/**
 * T04 protected storage — internal diagnostic worker (separate artifact).
 *
 * Spawned only by the diagnostic facility through the same flock(1)
 * --no-fork lease topology as production. Wires the shared engine to the
 * fixture-only synthetic key backend, the file-backed fault probe, and a
 * tmpfs-tolerant filesystem policy. Diagnostic IPC carries no bus field:
 * the synthetic backend never contacts Secret Service. Replies carry
 * sanitized codes only; the synthetic key file is fixture plaintext by
 * specification and is never a production master key.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { serveWorker, type WorkerHandler } from "./ipc.js";
import { StorageEngine } from "./engine.js";
import { StorageError } from "./errors.js";
import { FileFaultProbe, SyntheticMasterKey, readIssuedKeyFile } from "./diag-support.js";
import {
  assertBinding,
  assertByteView,
  assertLocationRoots,
  assertOrigin,
  assertStoreUpdate,
  assertUuid,
  captureShape,
  copyBytes,
  optionalField,
  requiredField,
} from "./validate.js";
import type { CapturedEntries } from "./validate.js";

const DIAGNOSTIC_FILESYSTEMS: readonly string[] = ["ext4", "tmpfs"];

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

function assertFacilityPaths(captured: CapturedEntries): {
  facilityRoot: string;
  profileRoot: string;
  anchorRoot: string;
} {
  const facilityRoot: unknown = requiredField(captured, "facilityRoot");
  const roots: { profileRoot: string; anchorRoot: string } = assertLocationRoots(
    requiredField(captured, "profileRoot"),
    requiredField(captured, "anchorRoot"),
  );
  if (
    typeof facilityRoot !== "string" ||
    roots.profileRoot !== `${facilityRoot}/profile` ||
    roots.anchorRoot !== `${facilityRoot}/anchor`
  ) {
    throw new StorageError("invalid_argument");
  }
  // Safe validated fixture identity: the worker only serves issued roots
  // carrying the facility marker, synthetic key, and controls files.
  for (const name of ["facility.json", "synthetic.key", "controls.json"]) {
    try {
      const st: fs.Stats = fs.lstatSync(path.join(facilityRoot, name));
      if (st.isSymbolicLink() || !st.isFile()) {
        throw new StorageError("invalid_argument");
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError("invalid_argument");
    }
  }
  return {
    facilityRoot,
    profileRoot: roots.profileRoot,
    anchorRoot: roots.anchorRoot,
  };
}

function baseEngine(
  captured: CapturedEntries,
  generationId: string,
): { engine: StorageEngine; deadlineMs: number } {
  const paths: {
    facilityRoot: string;
    profileRoot: string;
    anchorRoot: string;
  } = assertFacilityPaths(captured);
  if (optionalField(captured, "busAddress") !== undefined) {
    throw new StorageError("invalid_argument");
  }
  const deadlineMs: number = assertDeadlineMs(requiredField(captured, "deadlineMs"));
  const facilityRoot: string = paths.facilityRoot;
  const engine: StorageEngine = new StorageEngine({
    profileRoot: paths.profileRoot,
    anchorRoot: paths.anchorRoot,
    expectedLock: assertLockIdentity(requiredField(captured, "expectedLock")),
    generationId,
    keyAccess: new SyntheticMasterKey(facilityRoot),
    faults: new FileFaultProbe(facilityRoot),
    allowedFilesystems: DIAGNOSTIC_FILESYSTEMS,
    mintMaster: () => new Uint8Array(readIssuedKeyFile(facilityRoot)),
  });
  return { engine, deadlineMs };
}

function withPid(binding: unknown): { binding: Record<string, unknown>; holderPid: number } {
  if (typeof binding !== "object" || binding === null) {
    throw new StorageError("provider_failure");
  }
  return {
    binding: binding as Record<string, unknown>,
    holderPid: process.pid,
  };
}

const handlers: Record<string, WorkerHandler | undefined> = {
  provision: async (params: Record<string, unknown>): Promise<unknown> => {
    if (state.engine !== null) {
      throw new StorageError("invalid_argument");
    }
    const captured: CapturedEntries = captureShape(params, [
      "profileRoot",
      "anchorRoot",
      "facilityRoot",
      "origin",
      "profileGenerationId",
      "expectedLock",
      "deadlineMs",
    ]);
    const origin: string = assertOrigin(requiredField(captured, "origin"));
    const generationId: string = assertUuid(requiredField(captured, "profileGenerationId"));
    const built: { engine: StorageEngine; deadlineMs: number } = baseEngine(captured, generationId);
    const binding: unknown = await built.engine.provision(origin, generationId, built.deadlineMs);
    state.engine = built.engine;
    return withPid(binding);
  },

  open: async (params: Record<string, unknown>): Promise<unknown> => {
    if (state.engine !== null) {
      throw new StorageError("invalid_argument");
    }
    const captured: CapturedEntries = captureShape(params, [
      "profileRoot",
      "anchorRoot",
      "facilityRoot",
      "expectedBinding",
      "profileGenerationId",
      "expectedLock",
      "deadlineMs",
    ]);
    const expected: {
      origin: string;
      accountUuid: string | null;
      sessionGeneration: number;
      profileGenerationId: string;
    } = assertBinding(requiredField(captured, "expectedBinding"));
    const generationId: string = assertUuid(requiredField(captured, "profileGenerationId"));
    if (generationId !== expected.profileGenerationId) {
      throw new StorageError("invalid_argument");
    }
    const built: { engine: StorageEngine; deadlineMs: number } = baseEngine(captured, generationId);
    const binding: unknown = await built.engine.open(expected, built.deadlineMs);
    state.engine = built.engine;
    return withPid(binding);
  },

  readVault: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = captureShape(params, ["captureGeneration", "deadlineMs"]);
    const engine: StorageEngine = requireEngine();
    return copyBytes(await engine.readVault(assertCapture(captured), assertCallDeadline(captured)));
  },

  readOps: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = captureShape(params, ["captureGeneration", "deadlineMs"]);
    const engine: StorageEngine = requireEngine();
    return copyBytes(await engine.readOps(assertCapture(captured), assertCallDeadline(captured)));
  },

  commit: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = captureShape(params, [
      "captureGeneration",
      "deadlineMs",
      "update",
    ]);
    const engine: StorageEngine = requireEngine();
    const update: {
      vaultBytes?: Uint8Array;
      operationBytes?: Uint8Array;
    } = assertStoreUpdate(requiredField(captured, "update"));
    await engine.commit(assertCapture(captured), update, assertCallDeadline(captured));
    return null;
  },

  bind: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = captureShape(params, [
      "captureGeneration",
      "deadlineMs",
      "accountUuid",
      "vaultBytes",
    ]);
    const engine: StorageEngine = requireEngine();
    const next: unknown = await engine.bindAccount(
      assertCapture(captured),
      assertUuid(requiredField(captured, "accountUuid")),
      copyBytes(assertByteView(requiredField(captured, "vaultBytes"), true)),
      assertCallDeadline(captured),
    );
    if (typeof next !== "object" || next === null) {
      throw new StorageError("provider_failure");
    }
    return { ...(next as Record<string, unknown>) };
  },

  advance: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = captureShape(params, [
      "captureGeneration",
      "deadlineMs",
      "vaultBytes",
    ]);
    const engine: StorageEngine = requireEngine();
    const next: unknown = await engine.advanceGeneration(
      assertCapture(captured),
      copyBytes(assertByteView(requiredField(captured, "vaultBytes"), true)),
      assertCallDeadline(captured),
    );
    if (typeof next !== "object" || next === null) {
      throw new StorageError("provider_failure");
    }
    return { ...(next as Record<string, unknown>) };
  },

  digest: async (params: Record<string, unknown>): Promise<unknown> => {
    const captured: CapturedEntries = captureShape(params, [
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

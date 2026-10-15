/**
 * T04 protected storage — diagnostic worker support (internal).
 *
 * Fixture-only synthetic key backend, file-backed fault probe, and durable
 * controls helpers shared by the diagnostic entry and the diagnostic
 * worker. Never imported by production code. The synthetic key file is
 * labeled fixture plaintext by specification; it never carries a
 * production master key.
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { StorageError } from "./errors.js";
import { FaultArmed, type FaultProbe } from "./faults.js";
import { durableInstallFile, readWholeFile, validateRegularFileStat } from "./fsutil.js";
import type { MasterKeyAccess } from "./keyring.js";
import type { StorageFaultPoint } from "./types.js";
import { captureShape, requiredField } from "./validate.js";
import type { CapturedEntries } from "./validate.js";

export const SYNTHETIC_KEY: string = "synthetic.key";
export const CONTROLS_JSON: string = "controls.json";
export const SYNTHETIC_KEY_LEN: number = 32;

export const FAULT_POINTS: readonly StorageFaultPoint[] = [
  "lock.acquired",
  "provision.marker.durable",
  "provision.key.stored",
  "provision.stores.durable",
  "provision.anchor.committed",
  "provision.marker.removed",
  "commit.before.prepare",
  "commit.anchor.prepared",
  "commit.vault.renamed",
  "commit.vault.synced",
  "commit.operations.renamed",
  "commit.operations.synced",
  "commit.anchor.committed",
  "commit.anchor.synced",
  "commit.reply",
  "fs.write",
  "fs.fsync.file",
  "fs.rename",
  "fs.fsync.directory",
];

export const KEY_STATES: readonly string[] = [
  "available",
  "missing",
  "locked",
  "ambiguous",
  "unavailable",
];

export type SyntheticKeyState = "available" | "missing" | "locked" | "ambiguous" | "unavailable";

export interface FacilityControls {
  fault: {
    point: StorageFaultPoint;
    action: "throw" | "kill-holder";
    occurrence: number;
  } | null;
  keyState: SyntheticKeyState;
  keyCreated: boolean;
  // Monotonic rule epoch: arm/clear bump it so a worker resets occurrence
  // counting for a newly armed rule in the same holder. Consumption writes
  // keep the epoch, so consumed rules stay consumed across kill/restart.
  seq: number;
}

export function readJsonFile(filePath: string): unknown {
  const bytes: Buffer = readWholeFile(filePath, 65536, "store_missing");
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new StorageError("io_failure");
  }
}

function assertControlsShape(value: unknown): FacilityControls {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new StorageError("io_failure");
  }
  const captured: CapturedEntries = captureShape(value, ["fault", "keyState", "keyCreated", "seq"]);
  let fault: FacilityControls["fault"] = null;
  const faultRaw: unknown = requiredField(captured, "fault");
  if (faultRaw !== null) {
    const faultCaptured: CapturedEntries = captureShape(faultRaw, [
      "point",
      "action",
      "occurrence",
    ]);
    const point: unknown = requiredField(faultCaptured, "point");
    const action: unknown = requiredField(faultCaptured, "action");
    const occurrence: unknown = requiredField(faultCaptured, "occurrence");
    if (
      typeof point !== "string" ||
      !(FAULT_POINTS as readonly string[]).includes(point) ||
      (action !== "throw" && action !== "kill-holder") ||
      typeof occurrence !== "number" ||
      !Number.isSafeInteger(occurrence) ||
      occurrence < 1
    ) {
      throw new StorageError("io_failure");
    }
    fault = {
      point: point as StorageFaultPoint,
      action,
      occurrence,
    };
  }
  const keyState: unknown = requiredField(captured, "keyState");
  if (typeof keyState !== "string" || !(KEY_STATES as readonly string[]).includes(keyState)) {
    throw new StorageError("io_failure");
  }
  if (typeof requiredField(captured, "keyCreated") !== "boolean") {
    throw new StorageError("io_failure");
  }
  const seq: unknown = requiredField(captured, "seq");
  if (typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 0) {
    throw new StorageError("io_failure");
  }
  return {
    fault,
    keyState: keyState as SyntheticKeyState,
    keyCreated: requiredField(captured, "keyCreated") as boolean,
    seq,
  };
}

export function readControls(root: string): FacilityControls {
  return assertControlsShape(readJsonFile(path.join(root, CONTROLS_JSON)));
}

export async function writeControls(root: string, controls: FacilityControls): Promise<void> {
  const text: string = JSON.stringify({
    fault: controls.fault,
    keyState: controls.keyState,
    keyCreated: controls.keyCreated,
    seq: controls.seq,
  });
  await durableInstallFile(root, CONTROLS_JSON, Buffer.from(text, "utf8"), null);
}

/**
 * Read the issued fixture master bytes. The synthetic.key content is
 * stable for the issued profile-generation from facility creation
 * through provision/bind/advance/reopen; backends initialize and reserve
 * this same key, never generate or replace it.
 */
export function readIssuedKeyFile(facilityRoot: string): Buffer {
  const keyPath: string = path.join(facilityRoot, SYNTHETIC_KEY);
  let fd: number = -1;
  try {
    fd = fs.openSync(
      keyPath,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK,
    );
    const st: fs.Stats = fs.fstatSync(fd);
    validateRegularFileStat(st);
    if (st.size !== SYNTHETIC_KEY_LEN) {
      throw new StorageError("provider_failure");
    }
    const out: Buffer = Buffer.alloc(SYNTHETIC_KEY_LEN);
    const read: number = fs.readSync(fd, out, 0, SYNTHETIC_KEY_LEN, null);
    if (read !== SYNTHETIC_KEY_LEN) {
      throw new StorageError("provider_failure");
    }
    return out;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("provider_failure");
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best effort.
      }
    }
  }
}

export class SyntheticMasterKey implements MasterKeyAccess {
  private readonly facilityRoot: string;

  constructor(facilityRoot: string) {
    this.facilityRoot = facilityRoot;
  }

  private readKeyFile(): Buffer {
    return readIssuedKeyFile(this.facilityRoot);
  }

  async loadMaster(): Promise<Uint8Array> {
    const controls: FacilityControls = readControls(this.facilityRoot);
    switch (controls.keyState) {
      case "available":
        break;
      case "missing":
        throw new StorageError("key_not_found");
      case "locked":
        throw new StorageError("key_locked");
      case "ambiguous":
        throw new StorageError("key_ambiguous");
      case "unavailable":
        throw new StorageError("key_unavailable");
    }
    return new Uint8Array(this.readKeyFile());
  }

  async createMaster(key: Uint8Array): Promise<void> {
    const controls: FacilityControls = readControls(this.facilityRoot);
    switch (controls.keyState) {
      case "available":
        break;
      case "missing":
        throw new StorageError("key_not_found");
      case "locked":
        throw new StorageError("key_locked");
      case "ambiguous":
        throw new StorageError("key_ambiguous");
      case "unavailable":
        throw new StorageError("key_unavailable");
    }
    if (controls.keyCreated) {
      throw new StorageError("already_provisioned");
    }
    if (key.byteLength !== SYNTHETIC_KEY_LEN) {
      throw new StorageError("invalid_argument");
    }
    const stored: Buffer = this.readKeyFile();
    try {
      if (stored.byteLength !== key.byteLength || !crypto.timingSafeEqual(stored, key)) {
        throw new StorageError("provider_failure");
      }
    } finally {
      stored.fill(0);
    }
    await writeControls(this.facilityRoot, {
      fault: controls.fault,
      keyState: controls.keyState,
      keyCreated: true,
      seq: controls.seq,
    });
  }
}

export class FileFaultProbe implements FaultProbe {
  private readonly facilityRoot: string;
  private readonly seen: Map<StorageFaultPoint, { seq: number; count: number }>;

  constructor(facilityRoot: string) {
    this.facilityRoot = facilityRoot;
    this.seen = new Map<StorageFaultPoint, { seq: number; count: number }>();
  }

  async probe(point: StorageFaultPoint): Promise<void> {
    const controls: FacilityControls = readControls(this.facilityRoot);
    const fault: FacilityControls["fault"] = controls.fault;
    if (fault === null || fault.point !== point) {
      return;
    }
    const tracked: { seq: number; count: number } | undefined = this.seen.get(point);
    // A newly armed rule (bumped epoch) resets occurrence counting in the
    // same holder; consumption keeps its epoch so it stays consumed.
    const count: number =
      tracked !== undefined && tracked.seq === controls.seq ? tracked.count + 1 : 1;
    this.seen.set(point, { seq: controls.seq, count });
    if (count < fault.occurrence) {
      return;
    }
    // Consume before acting so a killed worker never re-arms the rule.
    await writeControls(this.facilityRoot, {
      fault: null,
      keyState: controls.keyState,
      keyCreated: controls.keyCreated,
      seq: controls.seq,
    });
    if (fault.action === "kill-holder") {
      process.kill(process.pid, "SIGKILL");
      return;
    }
    throw new FaultArmed(point);
  }
}

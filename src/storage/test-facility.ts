/** Isolated issued synthetic store. Never imported from the production entry. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { StorageError } from "./errors.js";
import { ParentChannel, spawnLeaseHolder } from "./ipc.js";
import {
  countWriteFlockLeases,
  removeTree,
  assertSafeAncestors,
  validateRegularFileStat,
} from "./fsutil.js";
import { bootstrap, knownFiles } from "./credential/files.js";
import { CredentialSession } from "./credential/client.js";
import { assertBinding, assertOrigin, captureShape, requiredField } from "./validate.js";
import {
  validateTicket,
  readControls,
  writeControls,
  FAULT_POINTS,
  KEY_STATES,
} from "./diag-support.js";
import type {
  DiagnosticSession,
  StorageBinding,
  StorageFault,
  StorageTestFacility,
  TestFacilityTicket,
} from "./types.js";
export type {
  DiagnosticSession,
  StorageBinding,
  StorageFault,
  StorageFaultPoint,
  StorageTestFacility,
  TestFacilityTicket,
} from "./types.js";

class Facility implements StorageTestFacility {
  readonly locations: { readonly profileRoot: string };
  constructor(readonly ticket: TestFacilityTicket) {
    this.locations = Object.freeze({ profileRoot: path.join(ticket.root, "profile") });
  }
  get profileGenerationId(): string {
    return validateTicket(this.ticket.root, this.ticket.capability).profileGenerationId;
  }
  private async launch(origin: string, action: "open" | "provision"): Promise<DiagnosticSession> {
    validateTicket(this.ticket.root, this.ticket.capability);
    assertSafeAncestors(this.ticket.root);
    const { fd, ownership } = bootstrap(this.locations.profileRoot, action === "provision");
    let child;
    try {
      child = spawnLeaseHolder(
        fileURLToPath(new URL("./diag-worker.js", import.meta.url)),
        fd,
      ).child;
    } finally {
      fs.closeSync(fd);
    }
    const channel = new ParentChannel(child);
    const failed = new Promise<never>((_resolve, reject) => {
      child.once("error", () => reject(new StorageError("io_failure")));
    });
    try {
      const deadlineMs = Date.now() + 10000;
      const raw = await Promise.race([
        failed,
        channel.send(
          action,
          {
            location: {
              profileRoot: this.locations.profileRoot,
              origin,
              secretServiceBusAddress: "unix:path=/synthetic-fixture-only.sock",
              timeoutMs: 10000,
            },
            ownership,
            deadlineMs,
            ticket: this.ticket,
          },
          deadlineMs,
        ),
      ]);
      const binding = assertBinding((raw as { binding: unknown }).binding);
      const inner = new CredentialSession(binding, channel, 10000);
      if (action === "provision") {
        const marker = path.join(this.ticket.root, "facility.json");
        const record = JSON.parse(fs.readFileSync(marker, "utf8")) as Record<string, unknown>;
        fs.writeFileSync(
          marker,
          JSON.stringify({ ...record, profileGenerationId: binding.profileGenerationId }),
        );
      }
      return Object.freeze({
        get binding() {
          return inner.binding;
        },
        holderPid: child.pid!,
        readVaultBytes: inner.readVaultBytes.bind(inner),
        commit: inner.commit.bind(inner),
        bindAccount: inner.bindAccount.bind(inner),
        advanceSessionGeneration: inner.advanceSessionGeneration.bind(inner),
        removeProfile: inner.removeProfile.bind(inner),
        close: inner.close.bind(inner),
      });
    } catch (error) {
      await channel.terminate();
      if (child.exitCode === 73) throw new StorageError("locked_by_other_owner");
      if (error instanceof StorageError) throw error;
      throw new StorageError("io_failure");
    }
  }
  provision(origin: string): Promise<DiagnosticSession> {
    return this.launch(assertOrigin(origin), "provision");
  }
  async open(expectedBinding: StorageBinding): Promise<DiagnosticSession> {
    const expected = assertBinding(expectedBinding);
    const session = await this.launch(expected.origin, "open");
    const actual = session.binding;
    if (
      actual.profileGenerationId !== expected.profileGenerationId ||
      actual.accountUuid !== expected.accountUuid ||
      actual.sessionGeneration !== expected.sessionGeneration
    ) {
      await session.close();
      throw new StorageError(
        actual.sessionGeneration !== expected.sessionGeneration
          ? "generation_mismatch"
          : "binding_mismatch",
      );
    }
    return session;
  }
  async armFault(fault: StorageFault): Promise<void> {
    validateTicket(this.ticket.root, this.ticket.capability);
    const fields = captureShape(fault, ["point", "action", "occurrence"]);
    const checked = Object.fromEntries(fields) as unknown as StorageFault;
    if (
      !FAULT_POINTS.includes(requiredField(fields, "point") as StorageFault["point"]) ||
      (checked.action !== "throw" && checked.action !== "kill-holder") ||
      (checked.occurrence !== undefined &&
        (!Number.isSafeInteger(checked.occurrence) || checked.occurrence < 1))
    )
      throw new StorageError("invalid_argument");
    const controls = readControls(this.ticket.root);
    await writeControls(this.ticket.root, {
      ...controls,
      seq: controls.seq + 1,
      fault: { ...checked, occurrence: checked.occurrence ?? 1 },
    });
  }
  async clearFault(): Promise<void> {
    validateTicket(this.ticket.root, this.ticket.capability);
    const controls = readControls(this.ticket.root);
    await writeControls(this.ticket.root, { ...controls, seq: controls.seq + 1, fault: null });
  }
  async setKeyState(
    state: "available" | "missing" | "locked" | "ambiguous" | "unavailable",
  ): Promise<void> {
    validateTicket(this.ticket.root, this.ticket.capability);
    if (!KEY_STATES.includes(state)) throw new StorageError("invalid_argument");
    await writeControls(this.ticket.root, { ...readControls(this.ticket.root), keyState: state });
  }
  async cleanup(): Promise<void> {
    if (!fs.existsSync(this.ticket.root)) return;
    validateTicket(this.ticket.root, this.ticket.capability);
    const lock = path.join(this.locations.profileRoot, "owner.lock");
    if (!fs.existsSync(lock)) {
      removeTree(this.ticket.root);
      return;
    }
    knownFiles(this.locations.profileRoot);
    const st = fs.lstatSync(lock, { bigint: true });
    validateRegularFileStat(st);
    // Guard process is owned here; never infer/signals another owner's PID.
    const guard = spawn(
      "flock",
      ["--no-fork", "--nonblock", "--conflict-exit-code", "73", lock, "sleep", "600"],
      { stdio: "ignore" },
    );
    const exited = new Promise<void>((resolve) => {
      guard.once("close", () => resolve());
    });
    try {
      const until = Date.now() + 5000;
      while (true) {
        if (guard.exitCode !== null)
          throw new StorageError(guard.exitCode === 73 ? "locked_by_other_owner" : "io_failure");
        try {
          if (
            guard.pid !== undefined &&
            countWriteFlockLeases(String(guard.pid), String(st.dev), String(st.ino)) === 1
          )
            break;
        } catch {
          /* guard may still be starting */
        }
        if (Date.now() > until) throw new StorageError("io_failure");
        await delay(10);
      }
      validateTicket(this.ticket.root, this.ticket.capability);
      removeTree(this.ticket.root);
    } finally {
      if (guard.exitCode === null) guard.kill("SIGKILL");
      await exited;
    }
  }
}
export async function createStorageTestFacility(): Promise<StorageTestFacility> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gymtracka-storage-test-"));
  fs.chmodSync(root, 0o700);
  const capability = crypto.randomBytes(32).toString("hex");
  const st = fs.lstatSync(root, { bigint: true });
  const ticket = Object.freeze({ root, capability });
  fs.writeFileSync(
    path.join(root, "facility.json"),
    JSON.stringify({
      version: 1,
      dev: String(st.dev),
      ino: String(st.ino),
      capability,
      profileGenerationId: crypto.randomUUID(),
    }),
    { mode: 0o600 },
  );
  fs.writeFileSync(path.join(root, "synthetic.key"), crypto.randomBytes(32), { mode: 0o600 });
  await writeControls(root, { fault: null, keyState: "available", keyCreated: false, seq: 0 });
  return new Facility(ticket);
}
export async function attachStorageTestFacility(
  ticket: TestFacilityTicket,
): Promise<StorageTestFacility> {
  const fields = captureShape(ticket, ["root", "capability"]);
  const root = requiredField(fields, "root"),
    capability = requiredField(fields, "capability");
  if (typeof root !== "string" || typeof capability !== "string")
    throw new StorageError("invalid_argument");
  validateTicket(root, capability);
  return new Facility(Object.freeze({ root, capability }));
}

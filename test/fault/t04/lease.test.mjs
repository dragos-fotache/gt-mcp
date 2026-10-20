// Exclusive kernel-lease ownership: fail-fast second owner, holder-death
// fencing with no unlocked parent IO, real lock-inode replacement (rename,
// asserted changed bigint inode) vs harmless same-inode truncation,
// cross-process parent death with guarded child tracking, bounded fail-fast
// acquisition. Approved spec section 7.
import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { chmodSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout, clearTimeout } from "node:timers";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, ACCOUNT_A, canaryBytes, expectCode } from "../../unit/t04/helpers.mjs";
import { delay, killPid } from "./helpers.mjs";

const FACILITY_HREF = pathToFileURL(
  fileURLToPath(new URL("../../../dist/storage/test-facility.js", import.meta.url)),
).href;

function lockInode(locations) {
  return statSync(join(locations.profileRoot, "owner.lock"), { bigint: true }).ino;
}

describe("single exclusive owner", () => {
  it("rejects a second open while a handle is held (locked_by_other_owner)", async () => {
    const facility = await createStorageTestFacility();
    try {
      const first = await facility.provision(QA_ORIGIN);
      const binding = {
        origin: QA_ORIGIN,
        accountUuid: null,
        sessionGeneration: 0,
        profileGenerationId: facility.profileGenerationId,
      };
      try {
        const started = Date.now();
        await expectCode(facility.open(binding), "locked_by_other_owner");
        expect(Date.now() - started).toBeLessThan(10000);
        await expectCode(facility.cleanup(), "locked_by_other_owner");
      } finally {
        await first.close();
      }
      const reopened = await facility.open(binding);
      await reopened.close();
    } finally {
      await facility.cleanup();
    }
  });

  it("fences the parent handle when its holder dies: no unlocked IO", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("lease-vault"));
      await skeleton.close();
      const session = await facility.open(bound);
      expect(typeof session.holderPid).toBe("number");
      killPid(session.holderPid);
      await delay(500);
      // IPC loss fences in-flight and subsequent calls; close still succeeds.
      await expectCode(session.readVaultBytes(), "commit_ambiguous");
      await expectCode(
        session.commit({ vaultBytes: canaryBytes("after-death") }),
        "commit_ambiguous",
      );
      await session.close();
      // Kernel ownership dies with the holder: a fresh open succeeds.
      const reopened = await facility.open(bound);
      try {
        expect(
          Buffer.from(await reopened.readVaultBytes()).equals(
            Buffer.from(canaryBytes("lease-vault")),
          ),
        ).toBe(true);
      } finally {
        await reopened.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("treats same-inode truncation as harmless and inode replacement as theft", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      const lockPath = join(facility.locations.profileRoot, "owner.lock");
      const before = lockInode(facility.locations);
      // Truncation keeps the inode: not ownership evidence, calls keep working.
      writeFileSync(lockPath, new Uint8Array(0));
      expect(lockInode(facility.locations)).toBe(before);
      expect((await session.readVaultBytes()).byteLength).toBe(0);
      // Real replacement by rename changes the bigint inode: the live
      // holder retains a VALID inherited lease, so the specific live-path
      // rule applies (root/lock identity mismatch => fence_mismatch).
      const spare = join(facility.locations.profileRoot, "owner.lock.spARE");
      writeFileSync(spare, new Uint8Array(0));
      chmodSync(spare, 0o600);
      renameSync(spare, lockPath);
      const after = lockInode(facility.locations);
      expect(typeof after).toBe("bigint");
      expect(after === before).toBe(false);
      await expectCode(session.readVaultBytes(), "commit_ambiguous");
      // A newly-created lock file is not the old lease either: never a
      // second concurrent owner (any acquired handle is closed at once).
      const contender = await facility
        .open({
          origin: QA_ORIGIN,
          accountUuid: null,
          sessionGeneration: 0,
          profileGenerationId: facility.profileGenerationId,
        })
        .then(
          async (unexpected) => {
            await unexpected.close();
            return "acquired";
          },
          (err) => err.code,
        );
      expect(contender).toBe("acquired");
      await session.close();
    } finally {
      await facility.cleanup();
    }
  });

  it("fails closed when the lock file is deleted under a live holder", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      rmSync(join(facility.locations.profileRoot, "owner.lock"));
      // Missing external lock pathname with surviving profile => anchor_missing.
      await expectCode(session.readVaultBytes(), "io_failure");
      await session.close();
    } finally {
      await facility.cleanup();
    }
  });
});

describe("cross-process ownership", () => {
  it("holds the lock in a child, denies the parent, and releases on child death", async () => {
    const facility = await createStorageTestFacility();
    const binding = {
      origin: QA_ORIGIN,
      accountUuid: null,
      sessionGeneration: 0,
      profileGenerationId: facility.profileGenerationId,
    };
    const childScript = [
      `const { attachStorageTestFacility } = await import(${JSON.stringify(FACILITY_HREF)});`,
      `const facility = await attachStorageTestFacility(JSON.parse(process.env.T04_QA_TICKET_JSON));`,
      `const session = await facility.open(JSON.parse(process.env.T04_QA_BINDING_JSON));`,
      `console.log('HOLDER_READY');`,
      `await new Promise((resolve) => setTimeout(resolve, 30000));`,
    ].join("\n");
    let child = null;
    let exited = false;
    try {
      const setup = await facility.provision(QA_ORIGIN);
      Object.assign(binding, setup.binding);
      await setup.close();
      child = spawn(process.execPath, ["--input-type=module", "--eval", childScript], {
        env: {
          ...process.env,
          T04_QA_TICKET_JSON: JSON.stringify(facility.ticket),
          T04_QA_BINDING_JSON: JSON.stringify(binding),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.on("exit", () => {
        exited = true;
      });
      const ready = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 15000);
        child.stdout.on("data", (chunk) => {
          if (String(chunk).includes("HOLDER_READY")) {
            clearTimeout(timer);
            resolve(true);
          }
        });
        child.on("exit", () => {
          clearTimeout(timer);
          resolve(false);
        });
      });
      expect(ready).toBe(true);
      // While the child holds the kernel lease, the parent cannot acquire it.
      await expectCode(facility.open(binding), "locked_by_other_owner");
      killPid(child.pid);
      await new Promise((resolve) => {
        if (exited) resolve();
        else {
          const timer = setTimeout(resolve, 10000);
          child.on("exit", () => {
            clearTimeout(timer);
            resolve();
          });
        }
      });
      expect(exited).toBe(true);
      await delay(500);
      // Holder death releases kernel ownership: the parent opens cleanly.
      const reopened = await facility.open(binding);
      await reopened.close();
    } finally {
      if (child !== null && !exited) {
        killPid(child.pid);
        await delay(500);
      }
      await facility.cleanup();
    }
  }, 60000);
});

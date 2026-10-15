// Commit crash boundaries with hooks that actually fire (approved spec
// sections 6, 9): commits never reacquire their lifetime lease, so
// lock.acquired is a provision/open-only point; changed-store rename/sync
// points require that store to change, so fault commits change BOTH stores.
// Pre-PREPARED failures keep old COMMITTED state usable with io_failure;
// anchor/rename-phase failures fence with commit_ambiguous; PREPARED reopen
// rejects commit_ambiguous exactly; fully COMMITTED/synced/replied reopens
// expose the NEW target exactly (never an old-or-new set, never the prior
// manifest). First data-temp write/file-fsync/parent-fsync faults precede
// the anchor attempt; the first anchor rename occurs within that attempt.
import { describe, it, expect } from "vitest";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, ACCOUNT_A, canaryBytes, expectCode } from "../../unit/t04/helpers.mjs";
import { storeFiles, snapshotFiles, listDirNames } from "./helpers.mjs";

// Fresh BOUND session: provision, bind, close the stale skeleton, reopen.
// Every transition below starts from a current capture on a held lease.
async function provisionBound(facility, vaultLabel, opsLabel) {
  const skeleton = await facility.provision(QA_ORIGIN);
  const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes(vaultLabel));
  await skeleton.close();
  const session = await facility.open(bound);
  await session.commit({ operationBytes: canaryBytes(opsLabel) });
  return session;
}

function bothChanged(tag) {
  return {
    vaultBytes: canaryBytes(`${tag}-vault-new`),
    operationBytes: canaryBytes(`${tag}-ops-new`),
  };
}

describe("pre-PREPARED failures keep old state usable", () => {
  it("commit.before.prepare => io_failure with old image intact", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await provisionBound(facility, "pre-vault", "pre-ops");
      const anchorBefore = snapshotFiles(storeFiles(facility.locations));
      expect(anchorBefore.size).toBe(3);
      await facility.armFault({ point: "commit.before.prepare", action: "throw" });
      await expectCode(session.commit(bothChanged("lost")), "io_failure");
      await facility.clearFault();
      expect(
        Buffer.from(await session.readVaultBytes()).equals(Buffer.from(canaryBytes("pre-vault"))),
      ).toBe(true);
      expect(
        Buffer.from(await session.readOperationStoreBytes()).equals(
          Buffer.from(canaryBytes("pre-ops")),
        ),
      ).toBe(true);
      await session.close();
      const reopened = await facility.open(session.binding);
      try {
        expect(
          Buffer.from(await reopened.readVaultBytes()).equals(
            Buffer.from(canaryBytes("pre-vault")),
          ),
        ).toBe(true);
      } finally {
        await reopened.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  for (const [point, occurrence] of [
    ["fs.write", 1],
    ["fs.fsync.file", 1],
    ["fs.fsync.directory", 1],
  ]) {
    it(`first ${point} (data-temp phase) => io_failure with old image intact`, async () => {
      const facility = await createStorageTestFacility();
      try {
        const session = await provisionBound(facility, "fst-vault", "fst-ops");
        await facility.armFault({ point, action: "throw", occurrence });
        await expectCode(session.commit(bothChanged("fst")), "io_failure");
        await facility.clearFault();
        expect(
          Buffer.from(await session.readVaultBytes()).equals(Buffer.from(canaryBytes("fst-vault"))),
        ).toBe(true);
        await session.close();
      } finally {
        await facility.cleanup();
      }
    });
  }
});

describe("anchor/rename-phase failures fence the handle (PREPARED reopen => commit_ambiguous)", () => {
  for (const point of [
    "commit.anchor.prepared",
    "commit.vault.renamed",
    "commit.vault.synced",
    "commit.operations.renamed",
    "commit.operations.synced",
  ]) {
    it(`${point} => commit_ambiguous; reopen rejects commit_ambiguous exactly`, async () => {
      const facility = await createStorageTestFacility();
      try {
        const session = await provisionBound(facility, "amb-vault", "amb-ops");
        const binding = session.binding;
        await facility.armFault({ point, action: "throw", occurrence: 1 });
        await expectCode(session.commit(bothChanged("amb")), "commit_ambiguous");
        await facility.clearFault();
        await expectCode(session.readVaultBytes(), "commit_ambiguous");
        await expectCode(session.commit(bothChanged("amb-retry")), "commit_ambiguous");
        await session.close();
        // The anchor is PREPARED/uncertain: reopen rejects commit_ambiguous exactly.
        await expectCode(facility.open(binding), "commit_ambiguous");
      } finally {
        await facility.cleanup();
      }
    });
  }

  it("fs.rename occurrence 1 throws BEFORE the PREPARED anchor rename: fenced call, OLD reopen", async () => {
    // No unconditional PREPARED state may be inferred from an unexecuted
    // rename: the current anchor remains authentically COMMITTED old state.
    // The current handle still fences conservatively because an anchor-write
    // attempt began. The separate durable-PREPARED oracle above is unchanged.
    const facility = await createStorageTestFacility();
    try {
      const session = await provisionBound(facility, "rn-vault", "rn-ops");
      const binding = session.binding;
      await facility.armFault({ point: "fs.rename", action: "throw", occurrence: 1 });
      await expectCode(session.commit(bothChanged("rn")), "commit_ambiguous");
      await facility.clearFault();
      await expectCode(session.readVaultBytes(), "commit_ambiguous");
      await session.close();
      const reopened = await facility.open(binding);
      try {
        expect(
          Buffer.from(await reopened.readVaultBytes()).equals(Buffer.from(canaryBytes("rn-vault"))),
        ).toBe(true);
        expect(
          Buffer.from(await reopened.readOperationStoreBytes()).equals(
            Buffer.from(canaryBytes("rn-ops")),
          ),
        ).toBe(true);
      } finally {
        await reopened.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("kill-holder at commit.anchor.prepared fences without silent repair", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await provisionBound(facility, "kill-vault", "kill-ops");
      const binding = session.binding;
      await facility.armFault({ point: "commit.anchor.prepared", action: "kill-holder" });
      await expectCode(session.commit(bothChanged("kill")), "commit_ambiguous");
      await facility.clearFault();
      await session.close();
      await expectCode(facility.open(binding), "commit_ambiguous");
    } finally {
      await facility.cleanup();
    }
  });
});

describe("fully published commits reopen the NEW target exactly", () => {
  for (const point of ["commit.anchor.committed", "commit.anchor.synced"]) {
    it(`${point} => fenced call, reopen exposes the new target (never prior manifest)`, async () => {
      const facility = await createStorageTestFacility();
      try {
        const session = await provisionBound(facility, "pub-vault", "pub-ops");
        const binding = session.binding;
        const update = bothChanged("pub");
        await facility.armFault({ point, action: "throw" });
        await expectCode(session.commit(update), "commit_ambiguous");
        await facility.clearFault();
        await session.close();
        const reopened = await facility.open(binding);
        try {
          expect(
            Buffer.from(await reopened.readVaultBytes()).equals(Buffer.from(update.vaultBytes)),
          ).toBe(true);
          expect(
            Buffer.from(await reopened.readOperationStoreBytes()).equals(
              Buffer.from(update.operationBytes),
            ),
          ).toBe(true);
        } finally {
          await reopened.close();
        }
      } finally {
        await facility.cleanup();
      }
    });
  }

  it("kill after the durable commit/reply boundary reopens exact current state", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await provisionBound(facility, "reply-vault", "reply-ops");
      const binding = session.binding;
      const current = bothChanged("reply");
      await facility.armFault({ point: "commit.reply", action: "kill-holder" });
      await expectCode(session.commit(current), "commit_ambiguous");
      await facility.clearFault();
      await session.close();
      const reopened = await facility.open(binding);
      try {
        expect(
          Buffer.from(await reopened.readVaultBytes()).equals(Buffer.from(current.vaultBytes)),
        ).toBe(true);
        expect(
          Buffer.from(await reopened.readOperationStoreBytes()).equals(
            Buffer.from(current.operationBytes),
          ),
        ).toBe(true);
      } finally {
        await reopened.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("consumed kill faults do not re-arm: the next worker commits cleanly", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await provisionBound(facility, "rearm-vault", "rearm-ops");
      const binding = session.binding;
      const first = bothChanged("rearm-1");
      await facility.armFault({ point: "commit.reply", action: "kill-holder", occurrence: 1 });
      await expectCode(session.commit(first), "commit_ambiguous");
      await session.close();
      // The reply boundary was durably reached: reopen exposes the first
      // update exactly, and the replacement worker commits a second update
      // deterministically, proving the consumed fault did not re-arm.
      const reopened = await facility.open(binding);
      try {
        expect(
          Buffer.from(await reopened.readVaultBytes()).equals(Buffer.from(first.vaultBytes)),
        ).toBe(true);
        const second = bothChanged("rearm-2");
        await reopened.commit(second);
        expect(
          Buffer.from(await reopened.readVaultBytes()).equals(Buffer.from(second.vaultBytes)),
        ).toBe(true);
      } finally {
        await reopened.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

describe("fault controls", () => {
  it("clearFault resolves before subsequent calls observe it", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await provisionBound(facility, "clear-vault", "clear-ops");
      await facility.armFault({ point: "commit.before.prepare", action: "throw" });
      await facility.clearFault();
      const update = bothChanged("clear");
      await session.commit(update);
      expect(
        Buffer.from(await session.readVaultBytes()).equals(Buffer.from(update.vaultBytes)),
      ).toBe(true);
      await session.close();
    } finally {
      await facility.cleanup();
    }
  });

  it("unused temps never read as state and add no phantom stores", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await provisionBound(facility, "temp-vault", "temp-ops");
      await facility.armFault({ point: "commit.vault.renamed", action: "throw" });
      await expectCode(session.commit(bothChanged("temp")), "commit_ambiguous");
      await facility.clearFault();
      await session.close();
      for (const name of listDirNames(facility.locations.profileRoot)) {
        if (name !== "vault.bin" && name !== "operations.bin")
          expect(name.endsWith(".bin")).toBe(false);
      }
      for (const name of listDirNames(facility.locations.anchorRoot)) {
        if (name !== "anchor.bin" && name !== "owner.lock" && name !== "INCOMPLETE") {
          expect(name.endsWith(".bin")).toBe(false);
        }
      }
    } finally {
      await facility.cleanup();
    }
  });
});

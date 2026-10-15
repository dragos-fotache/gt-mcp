// Stale-store vs current-anchor detection (supported) and whole-state
// restore handling (explicitly unsupported: no automatic detection, no
// silent rewrite, no auto-reconciliation). Approved spec sections 1, 5, 6.
//
// Oracle rule: supported stale tests restore ONLY vault/operations store
// files and assert the retained current anchor bytes never change. A
// whole-state copy (stores AND anchor) is a separate unsupported case.
import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, ACCOUNT_A, canaryBytes, expectCode } from "../../unit/t04/helpers.mjs";
import { storeFiles, snapshotFiles, restoreFiles } from "./helpers.mjs";

function bindingFor(facility, accountUuid = null, sessionGeneration = 0) {
  return {
    origin: QA_ORIGIN,
    accountUuid,
    sessionGeneration,
    profileGenerationId: facility.profileGenerationId,
  };
}

function vaultOpPaths(locations) {
  return [join(locations.profileRoot, "vault.bin"), join(locations.profileRoot, "operations.bin")];
}

function digestFiles(paths) {
  const hash = createHash("sha256");
  for (const p of paths) hash.update(readFileSync(p));
  return hash.digest("hex");
}

describe("supported stale-store vs current-anchor detection", () => {
  it("rejects old store files restored under the current anchor (anchor untouched)", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      await skeleton.close();
      const writer = await facility.open(bindingFor(facility));
      try {
        await writer.commit({ vaultBytes: canaryBytes("anchor-old-vault") });
      } finally {
        await writer.close();
      }
      const locations = facility.locations;
      const committedStores = snapshotFiles(vaultOpPaths(locations));
      const writer2 = await facility.open(bindingFor(facility));
      try {
        await writer2.commit({ vaultBytes: canaryBytes("anchor-new-vault") });
      } finally {
        await writer2.close();
      }
      // The current anchor advanced with the second commit: capture it now.
      const anchorBefore = readFileSync(join(locations.anchorRoot, "anchor.bin"));
      // Restore ONLY the stores; the current anchor stays exactly in place.
      restoreFiles(committedStores);
      expect(
        Buffer.from(readFileSync(join(locations.anchorRoot, "anchor.bin"))).equals(anchorBefore),
      ).toBe(true);
      await expectCode(facility.open(bindingFor(facility)), "fence_mismatch");
      expect(
        Buffer.from(readFileSync(join(locations.anchorRoot, "anchor.bin"))).equals(anchorBefore),
      ).toBe(true);
    } finally {
      await facility.cleanup();
    }
  });

  it("rejects missing store entries against the current anchor (no phantom stores)", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        await session.commit({ vaultBytes: canaryBytes("phantom-vault") });
      } finally {
        await session.close();
      }
      rmSync(join(facility.locations.profileRoot, "operations.bin"));
      await expectCode(facility.open(bindingFor(facility)), "store_missing");
    } finally {
      await facility.cleanup();
    }
  });

  it("treats a present INCOMPLETE marker as incomplete_provision", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        await session.commit({ vaultBytes: canaryBytes("inc-vault") });
      } finally {
        await session.close();
      }
      writeFileSync(join(facility.locations.anchorRoot, "INCOMPLETE"), new Uint8Array(0));
      // A present marker blocks open even though COMMITTED bytes are valid,
      // and reprovision reports incomplete_provision (not already_provisioned).
      await expectCode(facility.open(bindingFor(facility)), "incomplete_provision");
      await expectCode(facility.provision(QA_ORIGIN), "incomplete_provision");
    } finally {
      await facility.cleanup();
    }
  });

  it("keeps bound-account evidence fenced but intact across generation advance", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("gen-vault"));
      await skeleton.close();
      const session = await facility.open(bound);
      const ops = canaryBytes("gen-ops");
      await session.commit({ operationBytes: ops });
      const next = await session.advanceSessionGeneration(canaryBytes("gen-vault-2"));
      await session.close();
      // Old generation capture no longer opens anything usable.
      await expectCode(
        facility.open({
          origin: QA_ORIGIN,
          accountUuid: ACCOUNT_A,
          sessionGeneration: 1,
          profileGenerationId: facility.profileGenerationId,
        }),
        "generation_mismatch",
      );
      const reopened = await facility.open(next);
      try {
        expect(Buffer.from(await reopened.readOperationStoreBytes()).equals(Buffer.from(ops))).toBe(
          true,
        );
      } finally {
        await reopened.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

describe("unsupported whole-state restore (no automatic inference)", () => {
  it("performs no silent rewrite or auto-reconciliation of a restored old root", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      await skeleton.close();
      const paths = storeFiles(facility.locations);
      const opener = await facility.open(bindingFor(facility));
      try {
        await opener.commit({ vaultBytes: canaryBytes("whole-old-vault") });
      } finally {
        await opener.close();
      }
      const oldImage = snapshotFiles(paths);
      const writer = await facility.open(bindingFor(facility));
      try {
        await writer.commit({ vaultBytes: canaryBytes("whole-new-vault") });
      } finally {
        await writer.close();
      }
      // Whole-state rollback: restore stores AND anchor together. This case
      // is explicitly unsupported: no automatic detection is asserted, only
      // the absence of silent rewrite/reconciliation.
      restoreFiles(oldImage);
      const digestsAfterRestore = digestFiles(paths);
      const attempt = await facility.open(bindingFor(facility)).then(
        (s) => ({ session: s }),
        (err) => ({ error: err }),
      );
      if (attempt.session) {
        try {
          const image = Buffer.from(await attempt.session.readVaultBytes());
          expect(image.equals(Buffer.from(canaryBytes("whole-new-vault")))).toBe(false);
        } finally {
          await attempt.session.close();
        }
      } else {
        expect(attempt.error.name).toBe("StorageError");
      }
      expect(digestFiles(paths)).toBe(digestsAfterRestore);
    } finally {
      await facility.cleanup();
    }
  });
});

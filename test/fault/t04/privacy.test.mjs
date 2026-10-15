// At-rest privacy: no canary, origin, UUID, generation ID or root path
// bytes in any store/anchor file; errors carry no private values.
// Approved spec sections 5 and 9. Synthetic canaries only. Transitions
// close the stale capture before reopening the returned new binding.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  QA_ORIGIN,
  ACCOUNT_A,
  canaryBytes,
  expectCode,
  tempRoot,
  removeRoot,
} from "../../unit/t04/helpers.mjs";

describe("no plaintext private bytes at rest", () => {
  it("keeps canaries, bindings and paths out of vault/operations/anchor files", async () => {
    const facility = await createStorageTestFacility();
    const outside = tempRoot("t04-qa-privacy-");
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("privacy-vault"));
      await skeleton.close();
      const session = await facility.open(bound);
      const ops = canaryBytes("privacy-ops");
      await session.commit({ operationBytes: ops });
      const next = await session.advanceSessionGeneration(canaryBytes("privacy-vault-2"));
      await session.close();
      const reopened = await facility.open(next);
      await reopened.close();
      const files = [
        readFileSync(join(facility.locations.profileRoot, "vault.bin")),
        readFileSync(join(facility.locations.profileRoot, "operations.bin")),
        readFileSync(join(facility.locations.anchorRoot, "anchor.bin")),
      ];
      const forbidden = [
        Buffer.from("t04-qa-canary", "utf8"),
        Buffer.from(QA_ORIGIN, "utf8"),
        Buffer.from(ACCOUNT_A, "utf8"),
        Buffer.from(facility.profileGenerationId, "utf8"),
        Buffer.from(facility.locations.profileRoot, "utf8"),
        Buffer.from(facility.locations.anchorRoot, "utf8"),
        Buffer.from(outside, "utf8"),
      ];
      for (const file of files) {
        for (const needle of forbidden) {
          expect(file.includes(needle)).toBe(false);
        }
      }
    } finally {
      removeRoot(outside);
      await facility.cleanup();
    }
  });

  it("keeps private values out of failure outputs across the fault surface", async () => {
    const facility = await createStorageTestFacility();
    const captured = [];
    const scrubTargets = [ACCOUNT_A, QA_ORIGIN, facility.profileGenerationId];
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("privacy-err-vault"));
      await skeleton.close();
      const session = await facility.open(bound);
      captured.push(
        await expectCode(session.bindAccount(ACCOUNT_A, canaryBytes("x")), "binding_mismatch"),
      );
      await session.close();
      captured.push(
        await facility
          .open({
            origin: "https://storage-qa-other.example.invalid",
            accountUuid: ACCOUNT_A,
            sessionGeneration: 0,
            profileGenerationId: facility.profileGenerationId,
          })
          .then(
            () => null,
            (err) => err,
          ),
      );
      expect(captured[1]).not.toBeNull();
      expect(captured[1].code).toBe("binding_mismatch");
    } finally {
      await facility.cleanup();
    }
    for (const err of captured) {
      const text = `${err.message}\n${err.stack}\n${JSON.stringify(err)}`;
      for (const secret of scrubTargets) expect(text).not.toContain(secret);
      expect(text).not.toContain("t04-qa-canary");
    }
  });
});

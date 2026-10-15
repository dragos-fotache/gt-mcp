// Sanitized-error coverage across representatives: exact strings, no echo,
// no private values, immutable codes. Approved spec sections 3 and 9.
// Lifecycle rule: transitions invalidate the calling capture, so every
// post-transition step below runs on a freshly opened binding.
import { describe, it, expect } from "vitest";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, ACCOUNT_A, canaryBytes, expectCode, tempRoot, removeRoot } from "./helpers.mjs";

const SECRET_STRINGS = [ACCOUNT_A, QA_ORIGIN, "t04-qa-canary"];

function assertSanitized(err, facility) {
  const text = `${err.message}\n${err.stack}\n${JSON.stringify(err)}`;
  for (const secret of SECRET_STRINGS) expect(text).not.toContain(secret);
  if (facility) {
    expect(text).not.toContain(facility.locations.profileRoot);
    expect(text).not.toContain(facility.locations.anchorRoot);
    expect(text).not.toContain(facility.profileGenerationId);
  }
}

describe("sanitized errors", () => {
  it("keeps every representative failure free of private values", async () => {
    const facility = await createStorageTestFacility();
    const seen = [];
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("vault-hygiene"));
      await expectCode(skeleton.commit({}), "generation_mismatch");
      await skeleton.close();
      const session = await facility.open(bound);
      seen.push(
        await expectCode(session.bindAccount(ACCOUNT_A, canaryBytes("x")), "binding_mismatch"),
      );
      seen.push(await expectCode(session.commit({}), "invalid_argument"));
      const next = await session.advanceSessionGeneration(canaryBytes("vault-hygiene-2"));
      seen.push(await expectCode(session.readVaultBytes(), "generation_mismatch"));
      await session.close();
      seen.push(await expectCode(session.readVaultBytes(), "not_owner"));
      const reopened = await facility.open(next);
      try {
        rmSync(join(facility.locations.profileRoot, "vault.bin"));
        seen.push(await expectCode(reopened.readVaultBytes(), "store_missing"));
      } finally {
        await reopened.close();
      }
      seen.push(await expectCode(facility.provision(QA_ORIGIN), "already_provisioned"));
    } finally {
      await facility.cleanup();
    }
    for (const err of seen) assertSanitized(err, facility);
  });

  it("never echoes invalid input through invalid_argument", async () => {
    const root = tempRoot();
    try {
      const { provisionProfile } = await import("../../../dist/storage/index.js");
      const marker = `t04-qa-marker-${ACCOUNT_A}`;
      const err = await provisionProfile({
        profileRoot: join(root, "profile"),
        anchorRoot: join(root, "anchor"),
        origin: marker,
        profileGenerationId: "not-a-uuid",
        secretServiceBusAddress: "unix:path=/tmp/t04-qa-nonexistent.sock",
      }).then(
        () => null,
        (caught) => caught,
      );
      expect(err).not.toBeNull();
      expect(err.code).toBe("invalid_argument");
      expect(`${err.message}\n${err.stack}`).not.toContain(marker);
      expect(`${err.message}\n${err.stack}`).not.toContain(ACCOUNT_A);
    } finally {
      removeRoot(root);
    }
  });
});

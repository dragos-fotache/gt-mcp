// Pre-auth skeleton, one-way bind, generation advance with old-capture
// invalidation, async digest, safe close. Approved spec sections 3, 4, 8.
//
// Lifecycle rule applied throughout: every bind/advance invalidates the
// calling capture immediately. The old handle keeps its ORIGINAL frozen
// binding (skeleton stays null/0); all its methods except close reject
// generation_mismatch. Callers close the old handle BEFORE opening the
// returned new binding (otherwise ownership contention).
import { describe, it, expect } from "vitest";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, ACCOUNT_A, ACCOUNT_B, canaryBytes, expectCode } from "./helpers.mjs";

describe("pre-auth skeleton and one-way bind", () => {
  it("provisions an origin-bound null-account skeleton with empty stores", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      try {
        expect(skeleton.binding.origin).toBe(QA_ORIGIN);
        expect(skeleton.binding.accountUuid).toBeNull();
        expect(skeleton.binding.sessionGeneration).toBe(0);
        expect(skeleton.binding.profileGenerationId).toBe(facility.profileGenerationId);
        expect(Object.isFrozen(skeleton.binding)).toBe(true);
        expect((await skeleton.readVaultBytes()).byteLength).toBe(0);
        expect((await skeleton.readOperationStoreBytes()).byteLength).toBe(0);
        await expectCode(
          skeleton.keyedIntentDigest(canaryBytes("skeleton-digest")),
          "binding_mismatch",
        );
      } finally {
        await skeleton.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("bindAccount installs the vault atomically; the old skeleton stays null/0 and rejects", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const vaultA = canaryBytes("bound-vault");
      const bound = await skeleton.bindAccount(ACCOUNT_A, vaultA);
      try {
        expect(bound).toMatchObject({
          origin: QA_ORIGIN,
          accountUuid: ACCOUNT_A,
          sessionGeneration: 1,
          profileGenerationId: facility.profileGenerationId,
        });
        // Original getter never changes: still the null/0 skeleton capture.
        expect(skeleton.binding.accountUuid).toBeNull();
        expect(skeleton.binding.sessionGeneration).toBe(0);
        await expectCode(skeleton.readVaultBytes(), "generation_mismatch");
        await expectCode(
          skeleton.commit({ vaultBytes: canaryBytes("stale") }),
          "generation_mismatch",
        );
      } finally {
        await skeleton.close();
      }
      const session = await facility.open(bound);
      try {
        expect(Buffer.from(await session.readVaultBytes()).equals(Buffer.from(vaultA))).toBe(true);
        expect((await session.readOperationStoreBytes()).byteLength).toBe(0);
        // Rebinding an already-bound profile rejects even to the same account.
        await expectCode(
          session.bindAccount(ACCOUNT_A, canaryBytes("rebind-same")),
          "binding_mismatch",
        );
        await expectCode(
          session.bindAccount(ACCOUNT_B, canaryBytes("rebind-other")),
          "binding_mismatch",
        );
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

describe("generation advance retains operations and invalidates old captures", () => {
  it("advances exactly one generation with identical operation bytes", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("vault-before-advance"));
      await expectCode(skeleton.readVaultBytes(), "generation_mismatch");
      await skeleton.close();
      const session = await facility.open(bound);
      const ops = canaryBytes("ops-retained-across-advance");
      await session.commit({ operationBytes: ops });
      const cleared = canaryBytes("vault-cleared-on-signout");
      const next = await session.advanceSessionGeneration(cleared);
      try {
        expect(next.sessionGeneration).toBe(2);
        expect(next.accountUuid).toBe(ACCOUNT_A);
        expect(next.profileGenerationId).toBe(facility.profileGenerationId);
        // Old capture fenced: getter still shows generation 1.
        expect(session.binding.sessionGeneration).toBe(1);
        await expectCode(session.readVaultBytes(), "generation_mismatch");
      } finally {
        await session.close();
      }
      const reopened = await facility.open(next);
      try {
        expect(Buffer.from(await reopened.readVaultBytes()).equals(Buffer.from(cleared))).toBe(
          true,
        );
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

  it("old-capture methods except close fail generation_mismatch after advance", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("vault-v1"));
      await skeleton.close();
      const session = await facility.open(bound);
      const next = await session.advanceSessionGeneration(canaryBytes("vault-v2"));
      expect(next.sessionGeneration).toBe(2);
      await expectCode(session.readVaultBytes(), "generation_mismatch");
      await expectCode(session.readOperationStoreBytes(), "generation_mismatch");
      await expectCode(
        session.commit({ vaultBytes: canaryBytes("stale-commit") }),
        "generation_mismatch",
      );
      await expectCode(
        session.keyedIntentDigest(canaryBytes("stale-digest")),
        "generation_mismatch",
      );
      await expectCode(
        session.advanceSessionGeneration(canaryBytes("stale-advance")),
        "generation_mismatch",
      );
      await expectCode(
        session.bindAccount(ACCOUNT_B, canaryBytes("stale-bind")),
        "generation_mismatch",
      );
      await session.close();
      await expectCode(session.readVaultBytes(), "not_owner");
      const reopened = await facility.open(next);
      await reopened.close();
    } finally {
      await facility.cleanup();
    }
  });

  it("double close succeeds and methods after close fail not_owner", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      await session.close();
      await session.close();
      await expectCode(session.readVaultBytes(), "not_owner");
      await expectCode(session.commit({ vaultBytes: canaryBytes("x") }), "not_owner");
    } finally {
      await facility.cleanup();
    }
  });

  it("close releases a fenced handle without finalizing uncertainty", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      await facility.armFault({ point: "commit.anchor.prepared", action: "throw" });
      await expectCode(session.commit({ vaultBytes: canaryBytes("fenced") }), "commit_ambiguous");
      await session.close();
      await facility.clearFault();
    } finally {
      await facility.cleanup();
    }
  });
});

describe("async holder digest", () => {
  it("is stable across same-account generations and sensitive to exact input", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("vault-digest"));
      await skeleton.close();
      const session = await facility.open(bound);
      const input = canaryBytes("intent-material");
      const before = await session.keyedIntentDigest(input);
      expect(before).toBeInstanceOf(Uint8Array);
      expect(before.byteLength).toBe(32);
      const next = await session.advanceSessionGeneration(canaryBytes("vault-digest-2"));
      await session.close();
      const reopened = await facility.open(next);
      try {
        const after = await reopened.keyedIntentDigest(Buffer.from(input));
        expect(Buffer.from(after).equals(Buffer.from(before))).toBe(true);
        const other = await reopened.keyedIntentDigest(canaryBytes("intent-material "));
        expect(Buffer.from(other).equals(Buffer.from(before))).toBe(false);
        const upper = await reopened.keyedIntentDigest(
          Buffer.from("T04-QA-CANARY:INTENT-MATERIAL:DEADBEEF", "utf8"),
        );
        expect(Buffer.from(upper).equals(Buffer.from(before))).toBe(false);
      } finally {
        await reopened.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("returns independent copies that callers cannot mutate", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("vault-copy"));
      await skeleton.close();
      const session = await facility.open(bound);
      try {
        const first = await session.keyedIntentDigest(canaryBytes("copy-input"));
        const second = await session.keyedIntentDigest(canaryBytes("copy-input"));
        expect(first).not.toBe(second);
        first.fill(0);
        expect(Buffer.from(second).equals(Buffer.from(first))).toBe(false);
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

// Isolated real Secret Service provider through the PRODUCTION adapter:
// positive encrypted-session round trip, generation lifecycle with
// close-before-reopen discipline, explicit negative mappings on valid
// provisioned state, real locked/duplicate collection cases via QA-owned
// private-bus helpers, bounded silent-bus failure. Relay supplies
// T04_PROVIDER_BUS + verified ext4 T04_PROVIDER_PARENT. Absence is an
// explicit blocked failure, never a skip or a mock-only pass.
// Approved spec sections 1, 2, 8, 10.
import { describe, it, expect } from "vitest";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { cpSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { provisionProfile, openProfile } from "../../../dist/storage/index.js";
import { QA_ORIGIN, ACCOUNT_A, canaryBytes, expectCode } from "../../unit/t04/helpers.mjs";
import {
  requireProviderEnv,
  assertExt4Parent,
  makeRoots,
  busctlLock,
  providerReset,
  verifyUnlocked,
  secretToolStoreDuplicate,
  secretToolClearDuplicate,
} from "./provider-helpers.mjs";
import { removeRoot } from "../../unit/t04/helpers.mjs";

function skeletonBinding(profileGenerationId) {
  return { origin: QA_ORIGIN, accountUuid: null, sessionGeneration: 0, profileGenerationId };
}

describe("production adapter on the isolated provider", () => {
  it("runs provision/close/reopen round trip with exact bytes and generation fence", async () => {
    const { bus, parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const { base, profileRoot, anchorRoot } = makeRoots(parent, "t04-qa-provider-");
    const profileGenerationId = randomUUID();
    try {
      const skeleton = await provisionProfile({
        profileRoot,
        anchorRoot,
        origin: QA_ORIGIN,
        profileGenerationId,
        secretServiceBusAddress: bus,
      });
      expect(skeleton.binding).toMatchObject({ ...skeletonBinding(profileGenerationId) });
      // Explicit 0700 roots / 0600 files on the production layout.
      expect(statSync(profileRoot).mode & 0o777).toBe(0o700);
      expect(statSync(anchorRoot).mode & 0o777).toBe(0o700);
      const vault = canaryBytes("provider-vault");
      const ops = canaryBytes("provider-ops");
      await skeleton.commit({ vaultBytes: vault, operationBytes: ops });
      await skeleton.close();
      const reopened = await openProfile({
        profileRoot,
        anchorRoot,
        expectedBinding: skeletonBinding(profileGenerationId),
        secretServiceBusAddress: bus,
      });
      expect(statSync(join(profileRoot, "vault.bin")).mode & 0o777).toBe(0o600);
      expect(statSync(join(anchorRoot, "anchor.bin")).mode & 0o777).toBe(0o600);
      expect(Buffer.from(await reopened.readVaultBytes()).equals(Buffer.from(vault))).toBe(true);
      await reopened.close();
      const bound1 = await openProfile({
        profileRoot,
        anchorRoot,
        expectedBinding: skeletonBinding(profileGenerationId),
        secretServiceBusAddress: bus,
      });
      const bound = await bound1.bindAccount(ACCOUNT_A, canaryBytes("provider-bound-vault"));
      await bound1.close();
      expect(bound.sessionGeneration).toBe(1);
      const gen1 = await openProfile({
        profileRoot,
        anchorRoot,
        expectedBinding: bound,
        secretServiceBusAddress: bus,
      });
      const advanced = await gen1.advanceSessionGeneration(canaryBytes("provider-advanced-vault"));
      await gen1.close();
      expect(advanced.sessionGeneration).toBe(2);
      const gen2 = await openProfile({
        profileRoot,
        anchorRoot,
        expectedBinding: advanced,
        secretServiceBusAddress: bus,
      });
      try {
        expect(Buffer.from(await gen2.readOperationStoreBytes()).equals(Buffer.from(ops))).toBe(
          true,
        );
        const digestA = await gen2.keyedIntentDigest(canaryBytes("provider-intent"));
        expect(digestA.byteLength).toBe(32);
      } finally {
        await gen2.close();
      }
    } finally {
      removeRoot(base);
    }
  }, 60000);

  it("reports key_not_found for an unknown generation on valid provisioned roots", async () => {
    const { bus, parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const { base, profileRoot, anchorRoot } = makeRoots(parent, "t04-qa-provider-");
    try {
      const skeleton = await provisionProfile({
        profileRoot,
        anchorRoot,
        origin: QA_ORIGIN,
        profileGenerationId: randomUUID(),
        secretServiceBusAddress: bus,
      });
      await skeleton.close();
      await expectCode(
        openProfile({
          profileRoot,
          anchorRoot,
          expectedBinding: skeletonBinding(randomUUID()),
          secretServiceBusAddress: bus,
        }),
        "key_not_found",
      );
    } finally {
      removeRoot(base);
    }
  }, 30000);

  it("reports not_provisioned when both roots are absent", async () => {
    const { bus, parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const base = join(parent, `t04-qa-provider-absent-${Date.now()}-${process.pid}`);
    mkdirSync(base, { recursive: true, mode: 0o700 });
    try {
      await expectCode(
        openProfile({
          profileRoot: join(base, "profile"),
          anchorRoot: join(base, "anchor"),
          expectedBinding: skeletonBinding(randomUUID()),
          secretServiceBusAddress: bus,
        }),
        "not_provisioned",
      );
    } finally {
      removeRoot(base);
    }
  }, 30000);

  it("reports key_unavailable for a valid-syntax unreachable bus on valid roots", async () => {
    const { parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const { bus } = requireProviderEnv();
    const { base, profileRoot, anchorRoot } = makeRoots(parent, "t04-qa-provider-");
    try {
      const skeleton = await provisionProfile({
        profileRoot,
        anchorRoot,
        origin: QA_ORIGIN,
        profileGenerationId: randomUUID(),
        secretServiceBusAddress: bus,
      });
      await skeleton.close();
      await expectCode(
        openProfile({
          profileRoot,
          anchorRoot,
          expectedBinding: skeletonBinding(randomUUID()),
          secretServiceBusAddress: `unix:path=${base}/absent.sock`,
        }),
        "key_unavailable",
      );
    } finally {
      removeRoot(base);
    }
  }, 30000);

  it("bounds a connected-but-silent provider as provider_failure on valid roots", async () => {
    const { bus, parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const { base, profileRoot, anchorRoot } = makeRoots(parent, "t04-qa-provider-");
    const dir = join(base, "blackhole");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const sock = join(dir, "blackhole.sock");
    const server = createServer((socket) => {
      socket.on("error", () => {});
    });
    await new Promise((resolve, reject) => {
      server.on("error", reject);
      server.listen(sock, resolve);
    });
    const started = Date.now();
    try {
      const skeleton = await provisionProfile({
        profileRoot,
        anchorRoot,
        origin: QA_ORIGIN,
        profileGenerationId: randomUUID(),
        secretServiceBusAddress: bus,
      });
      await skeleton.close();
      await expectCode(
        openProfile({
          profileRoot,
          anchorRoot,
          expectedBinding: skeletonBinding(randomUUID()),
          secretServiceBusAddress: `unix:path=${sock}`,
          timeoutMs: 1000,
        }),
        "provider_failure",
      );
    } finally {
      server.close();
      removeRoot(base);
    }
    expect(Date.now() - started).toBeLessThan(15000);
  }, 30000);

  it("reserves a provisioned generation across roots (already_provisioned, no regeneration)", async () => {
    const { bus, parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const first = makeRoots(parent, "t04-qa-provider-");
    const second = makeRoots(parent, "t04-qa-provider-");
    const profileGenerationId = randomUUID();
    try {
      const session = await provisionProfile({
        profileRoot: first.profileRoot,
        anchorRoot: first.anchorRoot,
        origin: QA_ORIGIN,
        profileGenerationId,
        secretServiceBusAddress: bus,
      });
      await session.close();
      await expectCode(
        provisionProfile({
          profileRoot: second.profileRoot,
          anchorRoot: second.anchorRoot,
          origin: QA_ORIGIN,
          profileGenerationId,
          secretServiceBusAddress: bus,
        }),
        "already_provisioned",
      );
    } finally {
      removeRoot(first.base);
      removeRoot(second.base);
    }
  }, 60000);

  it("rejects a relocated profile root against its anchor commitments (fence_mismatch)", async () => {
    const { bus, parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const { base, profileRoot, anchorRoot } = makeRoots(parent, "t04-qa-provider-");
    const profileGenerationId = randomUUID();
    try {
      const session = await provisionProfile({
        profileRoot,
        anchorRoot,
        origin: QA_ORIGIN,
        profileGenerationId,
        secretServiceBusAddress: bus,
      });
      try {
        await session.commit({ vaultBytes: canaryBytes("relocated-vault") });
      } finally {
        await session.close();
      }
      const moved = join(base, "profile-moved");
      cpSync(profileRoot, moved, { recursive: true });
      await expectCode(
        openProfile({
          profileRoot: moved,
          anchorRoot,
          expectedBinding: skeletonBinding(profileGenerationId),
          secretServiceBusAddress: bus,
        }),
        "fence_mismatch",
      );
    } finally {
      removeRoot(base);
    }
  }, 60000);

  it("reports key_ambiguous for a synthetic duplicate item, then recovers after clear", async () => {
    const { bus, parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const { base, profileRoot, anchorRoot } = makeRoots(parent, "t04-qa-provider-");
    const profileGenerationId = randomUUID();
    try {
      const skeleton = await provisionProfile({
        profileRoot,
        anchorRoot,
        origin: QA_ORIGIN,
        profileGenerationId,
        secretServiceBusAddress: bus,
      });
      await skeleton.close();
      const session = await openProfile({
        profileRoot,
        anchorRoot,
        expectedBinding: skeletonBinding(profileGenerationId),
        secretServiceBusAddress: bus,
      });
      try {
        expect((await session.readVaultBytes()).byteLength).toBe(0);
        // Fixture-only extra attribute: libsecret stores a second item with
        // the same reserved attributes instead of replacing the first.
        secretToolStoreDuplicate(bus, profileGenerationId);
        try {
          await expectCode(session.readVaultBytes(), "key_ambiguous");
        } finally {
          secretToolClearDuplicate(bus);
        }
        expect((await session.readVaultBytes()).byteLength).toBe(0);
      } finally {
        await session.close();
      }
    } finally {
      removeRoot(base);
    }
  }, 60000);

  // ISOLATED LAST CASE: locking the private collection cannot be undone by
  // any production unlock/prompt (busctl Unlock is explicitly unqualified:
  // status 0 with a pending prompt while Locked stays true). Restoration
  // runs ONLY the relay-supplied T04_PROVIDER_RESET_COMMAND when present
  // (absolute fixture control, zero secret args/env) with a Locked=false +
  // sentinel-retention state-check; otherwise the locked bus is terminal
  // for this disposable fixture and teardown follows.
  it("denies reads while the private login collection is locked (isolated last case)", async () => {
    const { bus, parent } = requireProviderEnv();
    assertExt4Parent(parent);
    const { base, profileRoot, anchorRoot } = makeRoots(parent, "t04-qa-provider-");
    const profileGenerationId = randomUUID();
    const binding = skeletonBinding(profileGenerationId);
    try {
      const skeleton = await provisionProfile({
        profileRoot,
        anchorRoot,
        origin: QA_ORIGIN,
        profileGenerationId,
        secretServiceBusAddress: bus,
      });
      await skeleton.close();
      const session = await openProfile({
        profileRoot,
        anchorRoot,
        expectedBinding: binding,
        secretServiceBusAddress: bus,
      });
      try {
        expect((await session.readVaultBytes()).byteLength).toBe(0);
        // Qualified PASS control: Lock applies and Locked verifies true.
        busctlLock(bus);
        // Per-call recheck on the same valid handle: no cached-key fallback.
        await expectCode(session.readVaultBytes(), "key_locked");
      } finally {
        // Close remains possible while locked.
        await session.close();
      }
      // A fresh open while locked also denies with key_locked.
      await expectCode(
        openProfile({
          profileRoot,
          anchorRoot,
          expectedBinding: binding,
          secretServiceBusAddress: bus,
        }),
        "key_locked",
      );
      if (providerReset()) {
        // Qualified recovery path: verify unlocked + sentinel retained.
        verifyUnlocked(bus);
        const recovered = await openProfile({
          profileRoot,
          anchorRoot,
          expectedBinding: binding,
          secretServiceBusAddress: bus,
        });
        try {
          expect((await recovered.readVaultBytes()).byteLength).toBe(0);
        } finally {
          await recovered.close();
        }
      }
    } finally {
      removeRoot(base);
    }
  }, 60000);
});

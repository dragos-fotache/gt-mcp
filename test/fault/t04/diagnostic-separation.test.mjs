// Diagnostic separation: production rejects test/provider switching,
// tickets gate subprocess restarts (not production config), cleanup removes
// only the issued root, synthetic keys never touch production state.
// Approved spec section 9.
import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createStorageTestFacility,
  attachStorageTestFacility,
} from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, expectCode, tempRoot, removeRoot } from "../../unit/t04/helpers.mjs";

describe("production/test boundary", () => {
  it("rejects unknown test/provider fields on production factories", async () => {
    const root = tempRoot();
    try {
      const { provisionProfile } = await import("../../../dist/storage/index.js");
      for (const extra of [
        { ticket: {} },
        { fault: {} },
        { keyState: "missing" },
        { provider: "x" },
      ]) {
        await expectCode(
          provisionProfile({
            profileRoot: join(root, "profile"),
            anchorRoot: join(root, "anchor"),
            origin: QA_ORIGIN,
            profileGenerationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            secretServiceBusAddress: "unix:path=/tmp/t04-qa-nonexistent.sock",
            ...extra,
          }),
          "invalid_argument",
        );
      }
    } finally {
      removeRoot(root);
    }
  });

  it("keeps synthetic keys inside the issued facility root only", async () => {
    const facility = await createStorageTestFacility();
    try {
      const keyPath = join(facility.ticket.root, "synthetic.key");
      // Issued synthetic.key is stable from issuance through its generation.
      const issued = Buffer.from(readFileSync(keyPath));
      expect(issued.byteLength).toBe(32);
      expect(existsSync(keyPath)).toBe(true);
      expect(readFileSync(keyPath).byteLength).toBe(32);
      expect(statSync(keyPath).mode & 0o777).toBe(0o600);
      expect(existsSync(join(facility.locations.profileRoot, "synthetic.key"))).toBe(false);
      expect(existsSync(join(facility.locations.anchorRoot, "synthetic.key"))).toBe(false);
      const session = await facility.provision(QA_ORIGIN);
      await session.close();
      // Still identical after provisioning: stable through its generation.
      expect(Buffer.from(readFileSync(keyPath)).equals(issued)).toBe(true);
    } finally {
      await facility.cleanup();
    }
  });

  it("gates attach on the issued marker, cookie and canonical children", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      await session.close();
      const attached = await attachStorageTestFacility(facility.ticket);
      const reopened = await attached.open({
        origin: QA_ORIGIN,
        accountUuid: null,
        sessionGeneration: 0,
        profileGenerationId: facility.profileGenerationId,
      });
      await reopened.close();
      await expectCode(
        attachStorageTestFacility({ root: facility.ticket.root, capability: "wrong-cookie" }),
        "invalid_argument",
      );
      await expectCode(
        attachStorageTestFacility({ root: "/tmp/t04-qa-no-such-root-xyz", capability: "x" }),
        "invalid_argument",
      );
    } finally {
      await facility.cleanup();
    }
  });

  it("removes only the issued root on cleanup; cleanup is idempotent and never takes a replacement root", async () => {
    const facility = await createStorageTestFacility();
    const outside = tempRoot("t04-qa-outside-");
    const marker = join(outside, "marker.txt");
    try {
      writeFileSync(marker, "outside");
      const session = await facility.provision(QA_ORIGIN);
      try {
        await expectCode(facility.cleanup(), "locked_by_other_owner");
      } finally {
        await session.close();
      }
      const root = facility.ticket.root;
      await facility.cleanup();
      expect(existsSync(root)).toBe(false);
      expect(existsSync(marker)).toBe(true);
      // Idempotent for the originally issued object once its root is gone.
      await facility.cleanup();
      // A different replacement root at the same path is never removed:
      // cleanup refuses with io_failure and the decoy survives.
      mkdirSync(root, { recursive: true, mode: 0o700 });
      const decoy = join(root, "decoy.txt");
      writeFileSync(decoy, "replacement");
      await expectCode(facility.cleanup(), "io_failure");
      expect(existsSync(decoy)).toBe(true);
      removeRoot(root);
    } finally {
      removeRoot(outside);
    }
  });

  it("validates diagnostic argument shapes like production", async () => {
    const facility = await createStorageTestFacility();
    try {
      await expectCode(facility.provision("not-a-url"), "invalid_argument");
      await expectCode(facility.open(null), "invalid_argument");
      await expectCode(
        facility.armFault({ point: "no-such-point", action: "throw" }),
        "invalid_argument",
      );
      await expectCode(facility.setKeyState("meltdown"), "invalid_argument");
      await facility.cleanup();
    } catch (err) {
      await facility.cleanup().catch(() => {});
      throw err;
    }
  });
});

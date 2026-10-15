// Partial provisioning with phase-differentiated outcomes (approved spec
// section 6): lock.acquired precedes the first protected reservation, so a
// trusted retry may succeed and consumes no generation; reserved/incomplete
// stages deny retry/open; after marker removal a lost reply admits exact
// current open but denies reprovisioning. Failed factories reap their holder
// before rejecting. INCOMPLETE is empty existence-only 0600.
import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN } from "../../unit/t04/helpers.mjs";
import { expectCode, expectFailClosed } from "../../unit/t04/helpers.mjs";

function skeletonBinding(facility) {
  return {
    origin: QA_ORIGIN,
    accountUuid: null,
    sessionGeneration: 0,
    profileGenerationId: facility.profileGenerationId,
  };
}

function markerInfo(facility) {
  const marker = join(facility.locations.anchorRoot, "INCOMPLETE");
  if (!existsSync(marker)) return null;
  const st = statSync(marker);
  return { isFile: st.isFile(), size: st.size, mode: st.mode & 0o777 };
}

describe("bootstrap acquisition precedes reservation", () => {
  it("lock.acquired failure consumes nothing: trusted retry succeeds", async () => {
    const facility = await createStorageTestFacility();
    try {
      await facility.armFault({ point: "lock.acquired", action: "throw" });
      await expectFailClosed(facility.provision(QA_ORIGIN), "bootstrap-provision");
      await facility.clearFault();
      // Retry is allowed and provisions the same generation exactly once.
      const session = await facility.provision(QA_ORIGIN);
      try {
        expect(session.binding).toMatchObject({
          origin: QA_ORIGIN,
          accountUuid: null,
          sessionGeneration: 0,
          profileGenerationId: facility.profileGenerationId,
        });
        expect((await session.readVaultBytes()).byteLength).toBe(0);
      } finally {
        await session.close();
      }
      expect(markerInfo(facility)).toBeNull();
    } finally {
      await facility.cleanup();
    }
  });

  it("lock.acquired failure on open acquisition permits retry", async () => {
    const facility = await createStorageTestFacility();
    try {
      const setup = await facility.provision(QA_ORIGIN);
      await setup.close();
      await facility.armFault({ point: "lock.acquired", action: "throw" });
      await expectFailClosed(facility.open(skeletonBinding(facility)), "bootstrap-open");
      await facility.clearFault();
      const reopened = await facility.open(skeletonBinding(facility));
      await reopened.close();
    } finally {
      await facility.cleanup();
    }
  });
});

describe("reserved/incomplete stages deny retry and open", () => {
  for (const point of [
    "provision.marker.durable",
    "provision.key.stored",
    "provision.stores.durable",
    "provision.anchor.committed",
  ]) {
    for (const action of ["throw", "kill-holder"]) {
      it(`fails closed at ${point} (${action}) with a reserved generation`, async () => {
        const facility = await createStorageTestFacility();
        try {
          await facility.armFault({ point, action });
          await expectFailClosed(facility.provision(QA_ORIGIN), `provision@${point}/${action}`);
          await facility.clearFault();
          // Existing key, anchor, state or incomplete marker denies retry.
          const retry = await facility.provision(QA_ORIGIN).then(
            () => null,
            (err) => err,
          );
          expect(retry).not.toBeNull();
          expect(["already_provisioned", "incomplete_provision"]).toContain(retry.code);
          await expectFailClosed(facility.open(skeletonBinding(facility)), `open@${point}`);
          // Durable failure evidence is an empty 0600 marker when reached.
          const marker = markerInfo(facility);
          if (marker !== null) {
            expect(marker.isFile).toBe(true);
            expect(marker.size).toBe(0);
            expect(marker.mode).toBe(0o600);
          }
        } finally {
          await facility.cleanup();
        }
      });
    }
  }
});

describe("completed initialization with a lost reply", () => {
  it("provision.marker.removed admits exact current open, denies reprovisioning", async () => {
    const facility = await createStorageTestFacility();
    try {
      await facility.armFault({ point: "provision.marker.removed", action: "throw" });
      await expectFailClosed(facility.provision(QA_ORIGIN), "lost-reply-provision");
      await facility.clearFault();
      // Initialization is durably complete: exact current open works.
      const session = await facility.open(skeletonBinding(facility));
      try {
        expect(session.binding).toMatchObject({
          origin: QA_ORIGIN,
          accountUuid: null,
          sessionGeneration: 0,
          profileGenerationId: facility.profileGenerationId,
        });
        expect((await session.readVaultBytes()).byteLength).toBe(0);
        expect((await session.readOperationStoreBytes()).byteLength).toBe(0);
      } finally {
        await session.close();
      }
      expect(markerInfo(facility)).toBeNull();
      await expectCode(facility.provision(QA_ORIGIN), "already_provisioned");
    } finally {
      await facility.cleanup();
    }
  });
});

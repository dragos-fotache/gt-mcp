// Key-facility matrix with per-call rechecks and no cached fallback:
// missing => key_not_found, locked => key_locked, ambiguous =>
// key_ambiguous, unavailable => key_unavailable. Changed-key detection =>
// provider_failure. Close works without the key. Approved spec section 8.
// Every transition below closes the stale capture before opening the
// returned new binding; key-state faults run on current bound handles.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, ACCOUNT_A, canaryBytes, expectCode } from "../../unit/t04/helpers.mjs";
import { delay } from "./helpers.mjs";

const KEY_STATES = [
  ["missing", "key_not_found"],
  ["locked", "key_locked"],
  ["ambiguous", "key_ambiguous"],
  ["unavailable", "key_unavailable"],
];

async function openBound(facility, vaultLabel) {
  const skeleton = await facility.provision(QA_ORIGIN);
  const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes(vaultLabel));
  await skeleton.close();
  return facility.open(bound);
}

describe("synthetic key-state matrix", () => {
  for (const [state, code] of KEY_STATES) {
    it(`${state} denies the next protected read with ${code}`, async () => {
      const facility = await createStorageTestFacility();
      try {
        const session = await openBound(facility, `key-${state}`);
        try {
          await facility.setKeyState(state);
          await expectCode(session.readVaultBytes(), code);
        } finally {
          await session.close();
        }
      } finally {
        await facility.cleanup();
      }
    });
  }

  it("gates commits as well as reads (missing => key_not_found)", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        await facility.setKeyState("missing");
        await expectCode(
          session.commit({ vaultBytes: canaryBytes("gated-write") }),
          "key_not_found",
        );
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("rechecks on every call: no cached-key fallback after loss", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await openBound(facility, "recheck-vault");
      try {
        expect((await session.readVaultBytes()).byteLength).toBeGreaterThan(0);
        await facility.setKeyState("missing");
        await expectCode(session.readVaultBytes(), "key_not_found");
        await facility.setKeyState("available");
        expect((await session.readVaultBytes()).byteLength).toBeGreaterThan(0);
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("detects a changed key within an open holder as provider_failure", async () => {
    const facility = await createStorageTestFacility();
    const keyPath = join(facility.ticket.root, "synthetic.key");
    const original = Buffer.from(readFileSync(keyPath));
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        const rotated = Buffer.from(original);
        rotated[0] ^= 0xff;
        writeFileSync(keyPath, rotated);
        await expectCode(session.readVaultBytes(), "provider_failure");
      } finally {
        writeFileSync(keyPath, original);
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("closes cleanly without the key and stays quiet without calls", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      await facility.setKeyState("unavailable");
      await delay(300);
      await session.close();
      await session.close();
    } finally {
      await facility.cleanup();
    }
  });

  it("rejects digests while the key is locked (no unsigned fallback)", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await openBound(facility, "digest-key-vault");
      try {
        await facility.setKeyState("locked");
        await expectCode(session.keyedIntentDigest(canaryBytes("digest-input")), "key_locked");
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

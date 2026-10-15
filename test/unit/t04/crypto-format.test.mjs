// Envelope authentication, version precedence, swap/tamper mapping.
// Approved spec sections 3 and 5.
//
// Precedence encoded here (explicit spec order, not inferred from execution):
// recognized unknown envelope version => store_version_unsupported (precedes
// digest comparison); whole-file digest mismatch (swap, ciphertext damage,
// previous-ACK restore) => fence_mismatch; malformed magic/family/length or
// anchor AEAD damage => store_corrupt; missing data file vs valid anchor =>
// store_missing. Canonical root-commitment relocation is covered in the
// provider suite (it needs the production adapter + real key namespace).
import { describe, it, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, canaryBytes, expectCode } from "./helpers.mjs";

function vaultPath(locations) {
  return join(locations.profileRoot, "vault.bin");
}

function opsPath(locations) {
  return join(locations.profileRoot, "operations.bin");
}

function anchorPath(locations) {
  return join(locations.anchorRoot, "anchor.bin");
}

describe("envelope gates", () => {
  let facility;
  let healthy;

  function binding() {
    return {
      origin: QA_ORIGIN,
      accountUuid: null,
      sessionGeneration: 0,
      profileGenerationId: facility.profileGenerationId,
    };
  }

  function snapshot() {
    const locations = facility.locations;
    healthy = new Map(
      [vaultPath(locations), opsPath(locations), anchorPath(locations)].map((p) => [
        p,
        readFileSync(p),
      ]),
    );
  }

  function restore() {
    for (const [p, bytes] of healthy) writeFileSync(p, bytes);
  }

  beforeEach(async () => {
    facility = await createStorageTestFacility();
    const session = await facility.provision(QA_ORIGIN);
    try {
      await session.commit({
        vaultBytes: canaryBytes("fmt-vault"),
        operationBytes: canaryBytes("fmt-ops"),
      });
    } finally {
      await session.close();
    }
    snapshot();
  });

  afterEach(async () => {
    await facility.cleanup();
  });

  it("rejects a recognized unknown envelope version before digest comparison", async () => {
    const path = vaultPath(facility.locations);
    const bytes = Buffer.from(readFileSync(path));
    bytes.writeUInt16BE(2, 5);
    writeFileSync(path, bytes);
    await expectCode(facility.open(binding()), "store_version_unsupported");
    restore();
  });

  it("rejects damaged magic, family and length as store_corrupt", async () => {
    const mutations = [
      (b) => {
        b[0] ^= 0xff;
      },
      (b) => {
        b[7] = 9;
      },
      (b) => {
        b.writeBigUInt64BE(BigInt(b.byteLength), 52);
      },
    ];
    for (const mutate of mutations) {
      restore();
      const path = vaultPath(facility.locations);
      const bytes = Buffer.from(readFileSync(path));
      mutate(bytes);
      writeFileSync(path, bytes);
      await expectCode(facility.open(binding()), "store_corrupt");
    }
    restore();
  });

  it("rejects anchor AEAD damage as store_corrupt", async () => {
    const path = anchorPath(facility.locations);
    const bytes = Buffer.from(readFileSync(path));
    bytes[bytes.byteLength - 1] ^= 0x01;
    writeFileSync(path, bytes);
    await expectCode(facility.open(binding()), "store_corrupt");
    restore();
  });

  it("rejects vault/operations blob swaps as fence_mismatch", async () => {
    const vault = readFileSync(vaultPath(facility.locations));
    const ops = readFileSync(opsPath(facility.locations));
    writeFileSync(vaultPath(facility.locations), ops);
    writeFileSync(opsPath(facility.locations), vault);
    await expectCode(facility.open(binding()), "fence_mismatch");
    restore();
  });

  it("rejects ciphertext damage as fence_mismatch (digest compare precedes tag check)", async () => {
    const path = vaultPath(facility.locations);
    const bytes = Buffer.from(readFileSync(path));
    bytes[60] ^= 0x01;
    writeFileSync(path, bytes);
    await expectCode(facility.open(binding()), "fence_mismatch");
    restore();
  });

  it("maps a missing data file against a valid anchor to store_missing", async () => {
    rmSync(vaultPath(facility.locations));
    await expectCode(facility.open(binding()), "store_missing");
  });

  it("maps a missing anchor file to anchor_missing", async () => {
    rmSync(anchorPath(facility.locations));
    await expectCode(facility.open(binding()), "anchor_missing");
  });
});

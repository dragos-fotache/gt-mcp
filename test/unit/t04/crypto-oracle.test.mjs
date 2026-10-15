// Independent cryptographic oracle: reference HKDF-SHA256 / AES-256-GCM /
// HMAC-SHA256 computed from the issued synthetic.key under the public
// GTMS2/AAD/digest rules. Proves the specified keyed algorithm (an unkeyed
// SHA256 fake cannot pass), exact raw payloads per family, AAD binding,
// and unchanged operation ciphertext across generation advances.
// Approved spec sections 5 and 8. Uses node:crypto only — no new dependency,
// no production reads, no raw key output.
import { describe, it, expect } from "vitest";
import { createHash, createHmac, createDecipheriv, hkdfSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DIGEST_KEY_VERSION } from "../../../dist/storage/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, ACCOUNT_A, canaryBytes } from "./helpers.mjs";

function hkdf32(ikm, salt, info) {
  return Buffer.from(
    hkdfSync("sha256", Buffer.from(ikm), Buffer.from(salt), Buffer.from(info, "utf8"), 32),
  );
}

function parseEnvelope(bytes) {
  return {
    magic: bytes.subarray(0, 5).toString("latin1"),
    version: bytes.readUInt16BE(5),
    family: bytes[7],
    salt: bytes.subarray(8, 40),
    nonce: bytes.subarray(40, 52),
    plaintextLength: bytes.readBigUInt64BE(52),
    ciphertext: bytes.subarray(60, bytes.byteLength - 16),
    tag: bytes.subarray(bytes.byteLength - 16),
    header: bytes.subarray(0, 60),
  };
}

function dataAad(header, origin, accountUuid, profileGenerationId) {
  return Buffer.concat([
    header,
    Buffer.from(JSON.stringify([origin, accountUuid, profileGenerationId]), "utf8"),
  ]);
}

function referenceDecrypt(master, familyName, envelopeBytes, aad) {
  const env = parseEnvelope(envelopeBytes);
  const key = hkdf32(master, env.salt, `gymtracka-storage-v1:${familyName}`);
  const decipher = createDecipheriv("aes-256-gcm", key, env.nonce);
  decipher.setAAD(aad);
  decipher.setAuthTag(env.tag);
  return Buffer.concat([decipher.update(env.ciphertext), decipher.final()]);
}

function digestInfo(origin, accountUuid, profileGenerationId) {
  return Buffer.concat([
    Buffer.from("gymtracka-digest-v1", "utf8"),
    Buffer.from([0]),
    Buffer.from(origin, "utf8"),
    Buffer.from([0]),
    Buffer.from(accountUuid, "utf8"),
    Buffer.from([0]),
    Buffer.from(profileGenerationId, "utf8"),
  ]);
}

function referenceDigest(master, origin, accountUuid, profileGenerationId, input) {
  const digestKey = hkdf32(
    master,
    Buffer.alloc(0),
    digestInfo(origin, accountUuid, profileGenerationId),
  );
  return createHmac("sha256", digestKey)
    .update(
      Buffer.concat([
        Buffer.from(DIGEST_KEY_VERSION, "utf8"),
        Buffer.from([0]),
        Buffer.from(input),
      ]),
    )
    .digest();
}

describe("reference decryption of both data families", () => {
  it("recovers exact committed payloads with the specified AAD and family keys", async () => {
    const facility = await createStorageTestFacility();
    try {
      const master = Buffer.from(readFileSync(join(facility.ticket.root, "synthetic.key")));
      expect(master.byteLength).toBe(32);
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("oracle-vault"));
      await skeleton.close();
      const session = await facility.open(bound);
      const ops = canaryBytes("oracle-ops");
      try {
        await session.commit({ operationBytes: ops });
      } finally {
        await session.close();
      }
      const vaultBytes = readFileSync(join(facility.locations.profileRoot, "vault.bin"));
      const opsBytes = readFileSync(join(facility.locations.profileRoot, "operations.bin"));
      const aad = dataAad(
        parseEnvelope(vaultBytes).header,
        QA_ORIGIN,
        ACCOUNT_A,
        facility.profileGenerationId,
      );
      expect(
        referenceDecrypt(master, "vault", vaultBytes, aad).equals(
          Buffer.from(canaryBytes("oracle-vault")),
        ),
      ).toBe(true);
      const opsAad = dataAad(
        parseEnvelope(opsBytes).header,
        QA_ORIGIN,
        ACCOUNT_A,
        facility.profileGenerationId,
      );
      expect(
        referenceDecrypt(master, "operations", opsBytes, opsAad).equals(Buffer.from(ops)),
      ).toBe(true);
      // Wrong family key and wrong AAD both fail authentication.
      expect(() => referenceDecrypt(master, "operations", vaultBytes, aad)).toThrow();
      expect(() =>
        referenceDecrypt(
          master,
          "vault",
          vaultBytes,
          dataAad(
            parseEnvelope(vaultBytes).header,
            QA_ORIGIN,
            "bogus-account-uuid-x",
            facility.profileGenerationId,
          ),
        ),
      ).toThrow();
    } finally {
      await facility.cleanup();
    }
  });

  it("keeps operation ciphertext byte-identical across a generation advance", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("advance-vault"));
      await skeleton.close();
      const session = await facility.open(bound);
      await session.commit({ operationBytes: canaryBytes("advance-ops") });
      const opsBefore = Buffer.from(
        readFileSync(join(facility.locations.profileRoot, "operations.bin")),
      );
      const next = await session.advanceSessionGeneration(canaryBytes("advance-vault-2"));
      await session.close();
      const opsAfter = Buffer.from(
        readFileSync(join(facility.locations.profileRoot, "operations.bin")),
      );
      expect(opsAfter.equals(opsBefore)).toBe(true);
      const reopened = await facility.open(next);
      await reopened.close();
    } finally {
      await facility.cleanup();
    }
  });
});

describe("reference keyed digest", () => {
  it("matches the holder digest and is not an unkeyed hash", async () => {
    const facility = await createStorageTestFacility();
    try {
      const master = Buffer.from(readFileSync(join(facility.ticket.root, "synthetic.key")));
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("digest-vault"));
      await skeleton.close();
      const session = await facility.open(bound);
      try {
        const input = canaryBytes("digest-oracle-input");
        const actual = Buffer.from(await session.keyedIntentDigest(input));
        const expected = referenceDigest(
          master,
          QA_ORIGIN,
          ACCOUNT_A,
          facility.profileGenerationId,
          input,
        );
        expect(actual.equals(expected)).toBe(true);
        // An unkeyed SHA256 over the same material must NOT match.
        const unkeyed = createHash("sha256").update(Buffer.from(input)).digest();
        expect(actual.equals(unkeyed)).toBe(false);
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

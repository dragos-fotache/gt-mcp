// Exact opaque bytes, copy semantics, envelope math, operational capacity.
// Approved spec sections 3, 5, 9. MAX_STORE_BYTES is an operational budget,
// never a T03 domain cap: over-budget fails resource_exhausted before commit.
import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MAX_STORE_BYTES } from "../../../dist/storage/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN, ACCOUNT_A, canaryBytes, expectCode } from "./helpers.mjs";

function readDiskBytes(locations, name) {
  return readFileSync(join(locations.profileRoot, name));
}

describe("opaque byte round trips", () => {
  it("preserves byte-for-byte images across close and reopen", async () => {
    const facility = await createStorageTestFacility();
    const vectors = [
      ["empty-ops", new Uint8Array(0)],
      ["single-byte", new Uint8Array([7])],
      ["all-zero", new Uint8Array(64)],
      ["full-range", Uint8Array.from({ length: 256 }, (_, i) => i)],
      ["text-canary", canaryBytes("round-trip")],
      ["large", Uint8Array.from({ length: 65536 }, (_, i) => i & 0xff)],
    ];
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        for (const [label, bytes] of vectors) {
          await session.commit({ vaultBytes: bytes, operationBytes: canaryBytes(`ops-${label}`) });
          expect(Buffer.from(await session.readVaultBytes()).equals(Buffer.from(bytes))).toBe(true);
        }
      } finally {
        await session.close();
      }
      const binding = {
        origin: QA_ORIGIN,
        accountUuid: null,
        sessionGeneration: 0,
        profileGenerationId: facility.profileGenerationId,
      };
      const reopened = await facility.open(binding);
      try {
        expect(
          Buffer.from(await reopened.readVaultBytes()).equals(Buffer.from(vectors.at(-1)[1])),
        ).toBe(true);
        expect(
          Buffer.from(await reopened.readOperationStoreBytes()).equals(
            Buffer.from(canaryBytes(`ops-${vectors.at(-1)[0]}`)),
          ),
        ).toBe(true);
      } finally {
        await reopened.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("supports partial updates while keeping the untouched store exact", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        const vault = canaryBytes("vault-partial");
        const ops = canaryBytes("ops-partial");
        await session.commit({ vaultBytes: vault, operationBytes: ops });
        const ops2 = canaryBytes("ops-partial-2");
        await session.commit({ operationBytes: ops2 });
        expect(Buffer.from(await session.readVaultBytes()).equals(Buffer.from(vault))).toBe(true);
        expect(Buffer.from(await session.readOperationStoreBytes()).equals(Buffer.from(ops2))).toBe(
          true,
        );
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("never shares mutable buffers with callers", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        const input = canaryBytes("mutable-input");
        await session.commit({ vaultBytes: input });
        input.fill(0x41);
        expect(
          Buffer.from(await session.readVaultBytes()).equals(
            Buffer.from(canaryBytes("mutable-input")),
          ),
        ).toBe(true);
        const first = await session.readVaultBytes();
        const second = await session.readVaultBytes();
        expect(first).not.toBe(second);
        first.fill(0);
        expect(
          Buffer.from(await session.readVaultBytes()).equals(
            Buffer.from(canaryBytes("mutable-input")),
          ),
        ).toBe(true);
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("copies byte arguments before queueing: immediate mutation is harmless", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        const input = canaryBytes("immediate-copy");
        const pending = session.commit({ vaultBytes: input });
        input.fill(0xaa);
        await pending;
        expect(
          Buffer.from(await session.readVaultBytes()).equals(
            Buffer.from(canaryBytes("immediate-copy")),
          ),
        ).toBe(true);
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

describe("envelope math on disk", () => {
  it("stores exact 76+plaintextLength envelopes with GTMS2 magic and families", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        const payload = canaryBytes("envelope-math");
        await session.commit({ vaultBytes: payload, operationBytes: new Uint8Array(0) });
      } finally {
        await session.close();
      }
      const vault = readDiskBytes(facility.locations, "vault.bin");
      const ops = readDiskBytes(facility.locations, "operations.bin");
      expect(vault.byteLength).toBe(76 + canaryBytes("envelope-math").byteLength);
      expect(ops.byteLength).toBe(76);
      for (const [bytes, family] of [
        [vault, 1],
        [ops, 2],
      ]) {
        expect(bytes.subarray(0, 5).toString("latin1")).toBe("GTMS2");
        expect(bytes.readUInt16BE(5)).toBe(1);
        expect(bytes[7]).toBe(family);
        expect(bytes.readBigUInt64BE(52)).toBe(BigInt(bytes.byteLength - 76));
      }
      expect(statSync(join(facility.locations.anchorRoot, "anchor.bin")).isFile()).toBe(true);
    } finally {
      await facility.cleanup();
    }
  });
});

describe("operational capacity budget", () => {
  it("exposes the checkable constant and refuses over-budget before commit", async () => {
    expect(MAX_STORE_BYTES).toBe(268435456);
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        const keep = canaryBytes("kept-after-budget-refusal");
        await session.commit({ vaultBytes: keep });
        const tooBig = new Uint8Array(MAX_STORE_BYTES + 1);
        await expectCode(session.commit({ vaultBytes: tooBig }), "resource_exhausted");
        await expectCode(session.commit({ operationBytes: tooBig }), "resource_exhausted");
        expect(Buffer.from(await session.readVaultBytes()).equals(Buffer.from(keep))).toBe(true);
        expect((await session.readOperationStoreBytes()).byteLength).toBe(0);
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("bind and advance honor the same budget without eviction", async () => {
    const facility = await createStorageTestFacility();
    try {
      const skeleton = await facility.provision(QA_ORIGIN);
      const bound = await skeleton.bindAccount(ACCOUNT_A, canaryBytes("vault-small"));
      await expectCode(skeleton.readVaultBytes(), "generation_mismatch");
      await skeleton.close();
      const session = await facility.open(bound);
      try {
        await expectCode(
          session.advanceSessionGeneration(new Uint8Array(MAX_STORE_BYTES + 1)),
          "resource_exhausted",
        );
        expect(
          Buffer.from(await session.readVaultBytes()).equals(
            Buffer.from(canaryBytes("vault-small")),
          ),
        ).toBe(true);
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

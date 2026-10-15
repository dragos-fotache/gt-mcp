// Argument-shape validation: exact own-data shapes, no unknown fields or
// coercion. Approved spec section 3 precedence: malformed / overlapping /
// relative locations or bus syntax => invalid_argument. All cases reject
// before any provider contact. No personal data; synthetic fixtures only.
import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import * as storage from "../../../dist/storage/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  QA_ORIGIN,
  ACCOUNT_A,
  PGID_A,
  UNUSED_BUS,
  tempRoot,
  removeRoot,
  canaryBytes,
  expectCode,
} from "./helpers.mjs";

function provisionBase(root) {
  return {
    profileRoot: join(root, "profile"),
    anchorRoot: join(root, "anchor"),
    origin: QA_ORIGIN,
    profileGenerationId: PGID_A,
    secretServiceBusAddress: UNUSED_BUS,
  };
}

function openBase(root) {
  return {
    profileRoot: join(root, "profile"),
    anchorRoot: join(root, "anchor"),
    expectedBinding: {
      origin: QA_ORIGIN,
      accountUuid: null,
      sessionGeneration: 0,
      profileGenerationId: PGID_A,
    },
    secretServiceBusAddress: UNUSED_BUS,
  };
}

describe("request shape validation", () => {
  it("rejects unknown top-level and nested fields without side effects", async () => {
    const root = tempRoot();
    try {
      await expectCode(
        storage.provisionProfile({ ...provisionBase(root), extraFlag: true }),
        "invalid_argument",
      );
      await expectCode(
        storage.openProfile({
          ...openBase(root),
          expectedBinding: { ...openBase(root).expectedBinding, extra: 1 },
        }),
        "invalid_argument",
      );
      await expectCode(
        storage.provisionProfile({ ...provisionBase(root), testFault: {} }),
        "invalid_argument",
      );
      await expectCode(
        storage.provisionProfile({ ...provisionBase(root), provider: "x" }),
        "invalid_argument",
      );
      await expectCode(
        storage.provisionProfile({ ...provisionBase(root), ticket: {} }),
        "invalid_argument",
      );
      expect(existsSync(join(root, "profile"))).toBe(false);
      expect(existsSync(join(root, "anchor"))).toBe(false);
    } finally {
      removeRoot(root);
    }
  });

  it("rejects non-object and structurally wrong requests", async () => {
    const root = tempRoot();
    try {
      for (const bad of [null, undefined, "x", 42, []]) {
        await expectCode(storage.provisionProfile(bad), "invalid_argument");
        await expectCode(storage.openProfile(bad), "invalid_argument");
      }
      await expectCode(
        storage.provisionProfile({ ...provisionBase(root), expectedBinding: {} }),
        "invalid_argument",
      );
    } finally {
      removeRoot(root);
    }
  });

  it("rejects non-canonical origins (credentials/path/query/fragment/non-https)", async () => {
    const root = tempRoot();
    try {
      for (const origin of [
        "http://storage-qa.example.invalid",
        "https://storage-qa.example.invalid/path",
        "https://storage-qa.example.invalid?q=1",
        "https://storage-qa.example.invalid#frag",
        "https://user@storage-qa.example.invalid/",
        "HTTPS://storage-qa.example.invalid",
        "",
        "notaurl",
        "https://[::1/",
      ]) {
        await expectCode(
          storage.provisionProfile({ ...provisionBase(root), origin }),
          "invalid_argument",
        );
      }
    } finally {
      removeRoot(root);
    }
  });

  it("rejects malformed UUIDs and generations", async () => {
    const root = tempRoot();
    try {
      for (const profileGenerationId of [
        "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA",
        "short",
        "zzzzzzzz-zzzz-4zzz-8zzz-zzzzzzzzzzzz",
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa",
        "",
        42,
        null,
      ]) {
        await expectCode(
          storage.provisionProfile({ ...provisionBase(root), profileGenerationId }),
          "invalid_argument",
        );
      }
      for (const sessionGeneration of [-1, 1.5, NaN, Infinity, 2 ** 53, "1", null]) {
        await expectCode(
          storage.openProfile({
            ...openBase(root),
            expectedBinding: { ...openBase(root).expectedBinding, sessionGeneration },
          }),
          "invalid_argument",
        );
      }
      await expectCode(
        storage.openProfile({
          ...openBase(root),
          expectedBinding: { ...openBase(root).expectedBinding, accountUuid: 42 },
        }),
        "invalid_argument",
      );
    } finally {
      removeRoot(root);
    }
  });

  it("rejects relative, empty and overlapping roots (invalid_argument)", async () => {
    const root = tempRoot();
    try {
      const base = provisionBase(root);
      await expectCode(
        storage.provisionProfile({ ...base, profileRoot: "relative/path" }),
        "invalid_argument",
      );
      await expectCode(storage.provisionProfile({ ...base, anchorRoot: "" }), "invalid_argument");
      await expectCode(
        storage.provisionProfile({ ...base, anchorRoot: base.profileRoot }),
        "invalid_argument",
      );
      await expectCode(
        storage.provisionProfile({ ...base, anchorRoot: join(base.profileRoot, "nested") }),
        "invalid_argument",
      );
      await expectCode(
        storage.provisionProfile({ ...base, profileRoot: join(base.anchorRoot, "nested") }),
        "invalid_argument",
      );
    } finally {
      removeRoot(root);
    }
  });

  it("rejects symlink-component roots as unsafe links (io_failure)", async () => {
    const root = tempRoot();
    const real = join(root, "real");
    mkdirSync(real, { recursive: true });
    const link = join(root, "link");
    symlinkSync(real, link);
    try {
      await expectCode(
        storage.provisionProfile({
          ...provisionBase(root),
          profileRoot: join(link, "profile"),
          anchorRoot: join(real, "anchor"),
        }),
        "io_failure",
      );
    } finally {
      try {
        unlinkSync(link);
      } catch {
        // Best-effort cleanup only.
      }
      removeRoot(root);
    }
  });

  it("rejects malformed bus addresses and timeouts", async () => {
    const root = tempRoot();
    try {
      for (const secretServiceBusAddress of [
        "tcp:host=example.invalid,port=1",
        "unix:abstract=/tmp/t04-qa-abstract",
        "unixexec:path=/bin/false",
        "unix:path=/a;unix:path=/b",
        "",
        42,
        null,
      ]) {
        await expectCode(
          storage.provisionProfile({ ...provisionBase(root), secretServiceBusAddress }),
          "invalid_argument",
        );
      }
      for (const timeoutMs of [0, -1, 16000, 1.5, NaN, Infinity, "5000", null]) {
        await expectCode(
          storage.provisionProfile({ ...provisionBase(root), timeoutMs }),
          "invalid_argument",
        );
      }
    } finally {
      removeRoot(root);
    }
  });
});

describe("own-data shapes: accessors, cycles, prototypes, input purity", () => {
  it("rejects cycles and throwing accessors as invalid_argument", async () => {
    const root = tempRoot();
    try {
      const cyclic = provisionBase(root);
      cyclic.self = cyclic;
      await expectCode(storage.provisionProfile(cyclic), "invalid_argument");
      let invoked = false;
      const sneaky = provisionBase(root);
      Object.defineProperty(sneaky, "origin", {
        enumerable: true,
        get() {
          invoked = true;
          throw new Error("accessor must not be invoked");
        },
      });
      await expectCode(storage.provisionProfile(sneaky), "invalid_argument");
      expect(invoked).toBe(false);
    } finally {
      removeRoot(root);
    }
  });

  it("does not mutate caller-owned request objects", async () => {
    const root = tempRoot();
    try {
      const request = provisionBase(root);
      request.profileGenerationId = "not-a-uuid";
      const frozen = JSON.parse(JSON.stringify(request));
      Object.freeze(request);
      Object.freeze(request.expectedBinding ?? {});
      await expectCode(storage.provisionProfile(request), "invalid_argument");
      expect(request).toEqual(frozen);
    } finally {
      removeRoot(root);
    }
  });
});

describe("byte-argument validation", () => {
  it("rejects empty updates but accepts zero-length store payloads", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        await expectCode(session.commit({}), "invalid_argument");
        await expectCode(
          session.commit({ vaultBytes: undefined, operationBytes: undefined }),
          "invalid_argument",
        );
        await session.commit({
          vaultBytes: new Uint8Array(0),
          operationBytes: canaryBytes("zero-len-vault"),
        });
        const vault = await session.readVaultBytes();
        expect(vault.byteLength).toBe(0);
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("rejects non-Uint8Array, SharedArrayBuffer-backed, detached and DataView bytes", async () => {
    const facility = await createStorageTestFacility();
    const ab = new ArrayBuffer(8);
    const detached = new Uint8Array(ab);
    ab.transfer();
    const cases = [
      ["string", "not-bytes"],
      ["plain array", [1, 2, 3]],
      ["SharedArrayBuffer-backed", new Uint8Array(new SharedArrayBuffer(16))],
      ["detached view", detached],
      ["DataView", new DataView(new ArrayBuffer(8))],
      ["null", null],
    ];
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        for (const [label, bytes] of cases) {
          await expectCode(session.commit({ vaultBytes: bytes }), "invalid_argument", label);
        }
        await expectCode(session.bindAccount(ACCOUNT_A, "not-bytes"), "invalid_argument");
        await expectCode(session.keyedIntentDigest([1, 2, 3]), "invalid_argument");
      } finally {
        await session.close();
      }
    } finally {
      await facility.cleanup();
    }
  });
});

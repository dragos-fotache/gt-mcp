// S1 single-record format is the oracle; reference encryption uses only node:crypto.
import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  parseHeader,
  openRecord,
  sealRecord,
  MAX_RECORD_BYTES,
} from "../../../dist/storage/credential/format.js";
import * as api from "../../../dist/storage/credential/index.js";
import { QA_ORIGIN, QA_ORIGIN_OTHER, ACCOUNT_A, PGID_A, PGID_B } from "../t04/helpers.mjs";
const master = Buffer.alloc(32, 17);
const binding = {
  origin: QA_ORIGIN,
  accountUuid: ACCOUNT_A,
  sessionGeneration: 4,
  profileGenerationId: PGID_A,
};
const vault = Buffer.from("synthetic-token-canary\u0000\ufffd");
const bytes = (value) => Buffer.from(JSON.stringify(value));
function referenceSeal(payload, overrides = {}) {
  const salt = Buffer.alloc(32, 2),
    nonce = Buffer.alloc(12, 3);
  const env = {
    format: "gymtracka-credentials",
    version: 1,
    profileGenerationId: PGID_A,
    saltBase64: salt.toString("base64"),
    nonceBase64: nonce.toString("base64"),
  };
  const key = Buffer.from(
    crypto.hkdfSync("sha256", master, salt, "gymtracka-credential-record-v1", 32),
  );
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(bytes([env.format, 1, PGID_A, env.saltBase64, env.nonceBase64]));
  const ciphertext = Buffer.concat([
    cipher.update(typeof payload === "string" ? Buffer.from(payload) : bytes(payload)),
    cipher.final(),
  ]);
  return bytes({
    ...env,
    ciphertextBase64: ciphertext.toString("base64"),
    tagBase64: cipher.getAuthTag().toString("base64"),
    ...overrides,
  });
}
const payload = { version: 1, binding, vaultBase64: vault.toString("base64") };
const decode = (encoded) => openRecord(parseHeader(encoded), master, QA_ORIGIN);
function expectCode(run, code) {
  expect(run).toThrow(expect.objectContaining({ code }));
}

describe("T21 credential record", () => {
  it("exposes only the successor production surface and preserves the vault budget", () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        "StorageError",
        "isStorageError",
        "provisionProfile",
        "openProfile",
        "removeProfile",
        "MAX_STORE_BYTES",
      ].sort(),
    );
    expect(api.MAX_STORE_BYTES).toBe(268435456);
    expect(MAX_RECORD_BYTES).toBe(4 * 268435456 + 65536);
  });
  it("opens an independently encrypted record and independently decrypts production output", () => {
    expect(decode(referenceSeal(payload))).toEqual({ binding, vault });
    const env = JSON.parse(sealRecord(master, binding, vault));
    const key = Buffer.from(
      crypto.hkdfSync(
        "sha256",
        master,
        Buffer.from(env.saltBase64, "base64"),
        "gymtracka-credential-record-v1",
        32,
      ),
    );
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(env.nonceBase64, "base64"),
    );
    decipher.setAAD(bytes(["gymtracka-credentials", 1, PGID_A, env.saltBase64, env.nonceBase64]));
    decipher.setAuthTag(Buffer.from(env.tagBase64, "base64"));
    expect(
      JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(env.ciphertextBase64, "base64")),
          decipher.final(),
        ]),
      ),
    ).toEqual(payload);
    const second = JSON.parse(sealRecord(master, binding, vault));
    expect(second.saltBase64).not.toBe(env.saltBase64);
    expect(second.nonceBase64).not.toBe(env.nonceBase64);
    expect(Buffer.from(env.saltBase64, "base64")).toHaveLength(32);
    expect(Buffer.from(env.nonceBase64, "base64")).toHaveLength(12);
    expect(Buffer.from(env.tagBase64, "base64")).toHaveLength(16);
    expect(JSON.stringify(env)).not.toContain(ACCOUNT_A);
    expect(JSON.stringify(env)).not.toContain("synthetic-token-canary");
  });
  it.each([
    ["extra", (env) => ({ ...env, extra: 1 }), "store_corrupt"],
    ["unknown version", (env) => ({ ...env, version: 2 }), "store_version_unsupported"],
    ["wrong version type", (env) => ({ ...env, version: "1" }), "store_corrupt"],
    ["newline UUID", (env) => ({ ...env, profileGenerationId: PGID_A + "\n" }), "store_corrupt"],
    ["old format", (env) => ({ ...env, format: "GTMS2" }), "store_corrupt"],
    [
      "noncanonical base64",
      (env) => ({ ...env, tagBase64: env.tagBase64 + "\n" }),
      "store_corrupt",
    ],
    ["bad salt length", (env) => ({ ...env, saltBase64: "AA==" }), "store_corrupt"],
    ["lookup hint tamper", (env) => ({ ...env, profileGenerationId: PGID_B }), "store_corrupt"],
    [
      "tag tamper",
      (env) => ({ ...env, tagBase64: Buffer.alloc(16).toString("base64") }),
      "store_corrupt",
    ],
  ])("rejects %s", (_name, change, code) => {
    expectCode(() => decode(bytes(change(JSON.parse(referenceSeal(payload))))), code);
  });
  it("rejects BOM, malformed UTF8 and duplicate decoded keys before using a lookup hint", () => {
    const record = referenceSeal(payload);
    for (const bad of [
      Buffer.concat([Buffer.from([239, 187, 191]), record]),
      Buffer.from([255]),
      Buffer.from(record.toString().replace('"version":1', '"version":1,"ver\\u0073ion":1')),
    ])
      expectCode(() => parseHeader(bad), "store_corrupt");
  });
  it("checks authenticated payload shape, duplicate keys, canonical vault and exact integer precision", () => {
    for (const bad of [
      { ...payload, extra: true },
      { ...payload, vaultBase64: "Zg" },
      { ...payload, binding: { ...binding, sessionGeneration: -1 } },
      JSON.stringify(payload).replace(
        '"sessionGeneration":4',
        '"sessionGeneration":4.0000000000000001',
      ),
      JSON.stringify(payload).replace('"version":1', '"version":1,"version":1'),
    ])
      expectCode(() => decode(referenceSeal(bad)), "store_corrupt");
  });
  it("accepts exact integral JSON spellings and safe generation endpoints", () => {
    for (const generation of [0, Number.MAX_SAFE_INTEGER]) {
      const exact = { ...payload, binding: { ...binding, sessionGeneration: generation } };
      const text = JSON.stringify(exact).replace('"version":1', '"version":1.0e0');
      expect(decode(referenceSeal(text)).binding.sessionGeneration).toBe(generation);
    }
    expectCode(
      () =>
        decode(
          referenceSeal({ ...payload, binding: { ...binding, accountUuid: ACCOUNT_A + "\n" } }),
        ),
      "store_corrupt",
    );
    const env = JSON.parse(referenceSeal(payload));
    env.profileGenerationId += "\n";
    expectCode(() => parseHeader(bytes(env)), "store_corrupt");
  });

  it("authenticates the header ID and trusted origin before releasing a vault", () => {
    expectCode(
      () => openRecord(parseHeader(referenceSeal(payload)), master, QA_ORIGIN_OTHER),
      "binding_mismatch",
    );
    expectCode(
      () =>
        decode(referenceSeal({ ...payload, binding: { ...binding, profileGenerationId: PGID_B } })),
      "binding_mismatch",
    );
    expectCode(
      () => openRecord(parseHeader(referenceSeal(payload)), Buffer.alloc(32), QA_ORIGIN),
      "store_corrupt",
    );
  });
});

// Exact public production/diagnostic contract: exports, constants,
// StorageError shape. Approved spec sections 3 and 9. No provider contact.
import { describe, it, expect } from "vitest";
import * as storage from "../../../dist/storage/index.js";
import * as facility from "../../../dist/storage/test-facility.js";
import { ALL_CODES } from "./helpers.mjs";

const PRODUCTION_EXPORTS = [
  "DIGEST_KEY_VERSION",
  "MAX_STORE_BYTES",
  "StorageError",
  "isStorageError",
  "openProfile",
  "provisionProfile",
].sort();
const FACILITY_EXPORTS = ["attachStorageTestFacility", "createStorageTestFacility"].sort();

describe("production entry exact contract", () => {
  it("exposes exactly the approved runtime exports", () => {
    expect(Object.keys(storage).sort()).toEqual(PRODUCTION_EXPORTS);
  });

  it("pins operational constants (budget is operational, not a domain cap)", () => {
    expect(storage.MAX_STORE_BYTES).toBe(268435456);
    expect(storage.DIGEST_KEY_VERSION).toBe("gymtracka-digest-v1");
  });

  it("StorageError carries exact name/message/stack/code with immutable code", () => {
    const err = new storage.StorageError("key_not_found");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("StorageError");
    expect(err.code).toBe("key_not_found");
    expect(err.message).toBe("Storage failure: key_not_found.");
    expect(err.stack).toBe("StorageError: Storage failure: key_not_found.");
    expect("cause" in err).toBe(false);
    expect(() => {
      err.code = "io_failure";
    }).toThrow();
    expect(err.code).toBe("key_not_found");
  });

  it("invalid constructor codes become invalid_argument without echo", () => {
    for (const bad of ["nope", "", undefined, null, 42, {}, []]) {
      const err = new storage.StorageError(bad);
      expect(err.code).toBe("invalid_argument");
      expect(err.message).toBe("Storage failure: invalid_argument.");
      expect(err.stack).toBe("StorageError: Storage failure: invalid_argument.");
      if (typeof bad === "string" && bad.length > 0) expect(err.message).not.toContain(bad);
    }
  });

  it("isStorageError discriminates without throwing", () => {
    expect(storage.isStorageError(new storage.StorageError("io_failure"))).toBe(true);
    for (const other of [
      null,
      undefined,
      0,
      "x",
      {},
      { code: "io_failure" },
      new Error("io_failure"),
    ]) {
      expect(storage.isStorageError(other)).toBe(false);
    }
  });

  it("production barrel exposes no diagnostic or ownership extras", () => {
    for (const name of [
      ...FACILITY_EXPORTS,
      "acquire",
      "release",
      "reacquire",
      "reset",
      "reconcile",
    ]) {
      expect(name in storage).toBe(false);
    }
  });
});

describe("diagnostic entry exact contract", () => {
  it("exposes exactly the approved diagnostic exports", () => {
    expect(Object.keys(facility).sort()).toEqual(FACILITY_EXPORTS);
  });
});

describe("full error catalogue", () => {
  it("accepts every one of the 22 catalogue codes in the constructor", () => {
    expect(ALL_CODES).toHaveLength(22);
    for (const code of ALL_CODES) {
      const err = new storage.StorageError(code);
      expect(err.code).toBe(code);
      expect(err.name).toBe("StorageError");
      expect(err.message).toBe(`Storage failure: ${code}.`);
      expect(err.stack).toBe(`StorageError: Storage failure: ${code}.`);
      expect("cause" in err).toBe(false);
      expect(storage.isStorageError(err)).toBe(true);
    }
  });
});

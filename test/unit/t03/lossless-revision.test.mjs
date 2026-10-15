// T03 QA: lossless revision tokens (spec sections 2 and 5; scenario M09).
//
// projectRevision takes raw numeric token TEXT: projectRevision("40") is the
// numeric token 40. Token text containing JSON quotes rejects. Black-box only.

import { describe, expect, it } from "vitest";
import {
  INT64_MAX,
  INVALID_REVISION_TOKENS,
  TWO_POW_53_PLUS_ONE,
  VALID_REVISION_TOKENS,
} from "./fixtures.mjs";
import { expectCodecError } from "./helpers.mjs";

import { projectRevision } from "../../../dist/domain/index.js";

describe("T03 projectRevision exact tokens (M09)", () => {
  it.each(VALID_REVISION_TOKENS)("token %s projects to %s", (token, expected) => {
    expect(projectRevision(token)).toBe(expected);
  });

  it("never rounds 2^53+1 or Int64 max through a JS number", () => {
    expect(projectRevision(TWO_POW_53_PLUS_ONE)).toBe("9007199254740993");
    expect(projectRevision(INT64_MAX)).toBe("9223372036854775807");
    expect(projectRevision(INT64_MAX)).not.toBe(String(Number(INT64_MAX)));
  });

  it.each(INVALID_REVISION_TOKENS)("token %s rejects", (token) => {
    expectCodecError(() => projectRevision(token), "invalid_arguments");
  });

  it("rejects token text containing JSON quotes", () => {
    expectCodecError(() => projectRevision('"40"'), "invalid_arguments");
    expectCodecError(() => projectRevision("'40'"), "invalid_arguments");
  });

  it("rejects trailing/leading line boundaries on token text", () => {
    // Canonical exactness: tokens are entire values, not prefix matches.
    // Line boundaries must reject even though JSON whitespace skips them.
    const boundaries = [
      String.fromCharCode(10),
      String.fromCharCode(13),
      String.fromCharCode(9),
      String.fromCodePoint(0x2028),
      String.fromCodePoint(0x2029),
    ];
    for (const edge of boundaries) {
      for (const token of [`40${edge}`, `${edge}40`, `${INT64_MAX}${edge}`]) {
        expectCodecError(() => projectRevision(token), "invalid_arguments");
      }
    }
  });

  it("rejects JS numbers, BigInts and non-string inputs", () => {
    for (const value of [40, 1, 0, 9007199254740991, Number.MAX_SAFE_INTEGER]) {
      expectCodecError(() => projectRevision(value), "invalid_arguments");
    }
    expectCodecError(() => projectRevision(40n), "invalid_arguments");
    expectCodecError(() => projectRevision(null), "invalid_arguments");
    expectCodecError(() => projectRevision(undefined), "invalid_arguments");
    expectCodecError(() => projectRevision({}), "invalid_arguments");
  });

  it("rejects non-integral values without float conversion", () => {
    for (const token of ["40.5", "4.05e1", "1e-1", "0.1", "1.5e0"]) {
      expectCodecError(() => projectRevision(token), "invalid_arguments");
    }
  });

  it("rejects out-of-range values before any conversion", () => {
    for (const token of ["9223372036854775808", "99999999999999999999", "1e100", "1e19"]) {
      expectCodecError(() => projectRevision(token), "invalid_arguments");
    }
  });

  it("rejects malformed JSON number grammar", () => {
    for (const token of ["01", "00", "+40", " 40", "40 ", "--1", "4e", "e10", ".5", "5.", "0x28"]) {
      expectCodecError(() => projectRevision(token), "invalid_arguments");
    }
  });
});

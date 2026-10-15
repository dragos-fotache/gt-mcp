/**
 * Lossless revision handling. projectRevision takes raw numeric TOKEN TEXT
 * (for example "40", never a quoted JSON string), interprets it exactly with
 * BigInt arithmetic, and returns the canonical decimal string. No float
 * conversion happens before integrality/range checks. This module also builds
 * the range-restricting revision-string pattern used by output schemas,
 * generated from the exact maximum decimal text (no Number conversion).
 */
import { INT64_MAX_TEXT } from "./constants.js";
import { CodecError } from "./errors.js";

const MAX_BIGINT = BigInt(INT64_MAX_TEXT);

/** Cheap closed failure for astronomic nonzero magnitudes (never rounded). */
const OVERFLOW_SENTINEL = MAX_BIGINT + 1n;

/**
 * Strict JSON number grammar: no leading zeros/plus, no NaN/Infinity.
 * Absolute end is a negative lookahead, not `$` alone.
 */
const JSON_NUMBER_SOURCE = "^-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?(?![\\s\\S])";
const JSON_NUMBER_PATTERN = new RegExp(JSON_NUMBER_SOURCE);

/**
 * Evaluate a JSON number token to an exact BigInt when its value is integral.
 * Returns null for malformed tokens and nonintegral values. Magnitude is
 * decided mathematically: padded exponent digits (for example `1e0000000`)
 * and mathematically zero spellings (for example `0e-1` or `-0`) evaluate
 * exactly, while astronomic nonzero magnitudes fail closed cheaply via a
 * range sentinel without rounded conversion or BigInt blowups. Sign is
 * applied last: nonzero negatives are not integral successes (callers reject
 * them), while negative zero is exactly zero.
 */
export function evaluateJsonIntegerToken(token: string): bigint | null {
  const match = JSON_NUMBER_PATTERN.exec(token);
  if (match === null) {
    return null;
  }
  const negative = token.startsWith("-");
  const intPart = match[1] ?? "0";
  const fracPart = (match[2] ?? "").slice(1);
  const expText = (match[3] ?? "").replace(/^[eE]/, "");
  let expBig = 0n;
  if (expText !== "") {
    const expNegative = expText.startsWith("-");
    const expDigits = expText.replace(/^[+-]/, "").replace(/^0+/, "");
    if (expDigits !== "") {
      // Arbitrary-length exponents stay exact via BigInt; the range decision
      // below compares against source mantissa/fraction lengths, so no fixed
      // digit cutoff can reject an equivalent valid spelling.
      expBig = BigInt(expDigits);
      if (expNegative) {
        expBig = -expBig;
      }
    }
  }
  const digits = `${intPart}${fracPart}`;
  const digitLen = digits.length;
  // Zero handled early: any all-zero mantissa is exactly zero, whatever the
  // exponent or sign, so later conversions stay bounded and total.
  if (/^[0]*$/.test(digits)) {
    return 0n;
  }
  const shiftBig = expBig - BigInt(fracPart.length);
  let magnitude: bigint;
  if (shiftBig < 0n) {
    const needBig = -shiftBig;
    if (needBig >= BigInt(digitLen)) {
      return null;
    }
    const need = Number(needBig);
    const tail = digits.slice(digitLen - need);
    if (!/^[0]*$/.test(tail)) {
      return null;
    }
    const head = digits.slice(0, digitLen - need).replace(/^0+/, "") || "0";
    if (head === "0") {
      return 0n;
    }
    if (head.length > 19) {
      return OVERFLOW_SENTINEL;
    }
    magnitude = BigInt(head);
  } else {
    if (shiftBig > 19n) {
      return OVERFLOW_SENTINEL;
    }
    const shift = Number(shiftBig);
    const significant = digits.replace(/^0+/, "");
    if (significant.length + shift > 19) {
      return OVERFLOW_SENTINEL;
    }
    magnitude = BigInt(significant) * 10n ** BigInt(shift);
  }
  if (negative) {
    return null;
  }
  return magnitude;
}

/**
 * Interpret an original JSON number token exactly. Positive integral values
 * <= 9223372036854775807 become canonical decimal strings; everything else
 * throws invalid_arguments. The parameter is token text: projectRevision("40")
 * returns "40" while quoted text, JS numbers and BigInts reject.
 */
export function projectRevision(numericToken: string): string {
  if (typeof numericToken !== "string") {
    throw new CodecError("invalid_arguments", "Invalid revision token.");
  }
  const value = evaluateJsonIntegerToken(numericToken);
  if (value === null || value < 1n || value > MAX_BIGINT) {
    throw new CodecError("invalid_arguments", "Invalid revision token.");
  }
  return value.toString(10);
}

/**
 * Build an anchored regex source permitting exactly the canonical positive
 * decimals 1..9223372036854775807: 1..18-digit numbers plus 19-digit numbers
 * lexically at or below the maximum. Generated from the maximum decimal text.
 */
export function buildRevisionStringPattern(maxText: string): string {
  const alternatives: string[] = ["[1-9][0-9]{0,17}"];
  const digits = maxText;
  for (let i = 0; i < digits.length; i += 1) {
    const prefix = digits.slice(0, i);
    const current = digits[i];
    if (current === undefined || current === "0") {
      continue;
    }
    const low = i === 0 ? "1" : "0";
    const highDigit = String(Number.parseInt(current, 10) - 1);
    const rest = digits.length - i - 1;
    const restPart = rest === 0 ? "" : `[0-9]{${rest}}`;
    alternatives.push(`${prefix}[${low}-${highDigit}]${restPart}`);
  }
  alternatives.push(digits);
  return `^(${alternatives.join("|")})(?![\\s\\S])`;
}

/** Shared canonical revision-string pattern for schemas and runtime checks. */
export const REVISION_STRING_PATTERN_SOURCE = buildRevisionStringPattern(INT64_MAX_TEXT);

const REVISION_STRING_PATTERN = new RegExp(REVISION_STRING_PATTERN_SOURCE);

/** Canonical positive Int64 decimal strings only (no zero/leading-zero/overflow). */
export function isCanonicalRevisionString(value: unknown): value is string {
  return typeof value === "string" && REVISION_STRING_PATTERN.test(value);
}

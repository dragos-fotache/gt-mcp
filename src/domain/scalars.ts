/**
 * Shared scalar checks for plain (already-parsed) values. Wire-token exactness
 * lives in revision.ts (tokens) and lossless.ts (boxed numbers); these helpers
 * validate canonical plain values and creation arguments.
 */
import { INT32_MAX, INT32_MIN, UUID_PATTERN } from "./constants.js";

/** Canonical backend UUID syntax (lowercase hyphenated, tools.md). */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Plain Int32 in 0..2147483647. Rejects non-integers, NaN and non-numbers. */
export function isInt32Value(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= INT32_MIN && value <= INT32_MAX
  );
}

/**
 * Plain finite nonnegative double up to Number.MAX_VALUE, or null.
 * Rejects NaN, infinities and out-of-range values.
 */
export function isWeightValue(value: unknown): value is number | null {
  if (value === null) {
    return true;
  }
  return (
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_VALUE
  );
}

/** Canonicalize accepted -0 to +0 so identity material stays equal. */
export function canonicalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

/**
 * Nonblank name under the Java/Android Unicode whitespace OR
 * space-character classification from the approved spec. Returns false for
 * empty/all-blank names; U+0085, U+180E, U+200B and U+FEFF are NOT blank.
 */
export function isNonBlankName(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code === undefined || !isBlankCodePoint(code)) {
      return true;
    }
  }
  return false;
}

function isBlankCodePoint(code: number): boolean {
  if (code >= 0x0009 && code <= 0x000d) {
    return true;
  }
  if (code >= 0x001c && code <= 0x001f) {
    return true;
  }
  if (code === 0x0020) {
    return true;
  }
  if (code === 0x00a0) {
    return true;
  }
  if (code === 0x1680) {
    return true;
  }
  if (code >= 0x2000 && code <= 0x200a) {
    return true;
  }
  if (code === 0x2028 || code === 0x2029) {
    return true;
  }
  if (code === 0x202f) {
    return true;
  }
  if (code === 0x205f) {
    return true;
  }
  if (code === 0x3000) {
    return true;
  }
  return false;
}

import { CodecError } from "./errors.js";
import type { CodecErrorCode } from "./errors.js";

/**
 * Own-property helpers. Additive JSON keys such as `__proto__` must survive
 * as ordinary own data: they must never mutate prototypes, disappear during
 * copies, or supply inherited required fields. All helpers below use own
 * membership only, never the prototype chain.
 */
export function hasOwnKey(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/** Own data value, or undefined when the key is absent (or an accessor). */
export function getOwn(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || "get" in descriptor || "set" in descriptor) {
    return undefined;
  }
  return descriptor.value;
}

/** Define an ordinary own data property, safe for keys like `__proto__`. */
export function setOwn(record: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * Detached-copy helper. Return values share no mutable arrays/objects with
 * inputs or published records. Only JSON-compatible values occur in this
 * module (plus undefined for omitted optionals, which is preserved).
 */
export function deepDetached<T>(value: T): T {
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      out.push(deepDetached(item));
    }
    return out as T;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      setOwn(out, key, deepDetached(getOwn(record, key)));
    }
    return out as T;
  }
  return value;
}

/** Deep-freeze published schema records so they are observably immutable. */
export function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    Object.freeze(value);
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      deepFreeze(record[key]);
    }
    Object.freeze(value);
    return value;
  }
  return value;
}

/** True when a callable `toJSON` is reachable, checked without invocation. */
function hasCallableToJson(value: object): boolean {
  let current: unknown = value;
  while (current !== null && current !== undefined) {
    const descriptor = Object.getOwnPropertyDescriptor(current, "toJSON");
    if (descriptor !== undefined) {
      if ("get" in descriptor || "set" in descriptor) {
        return true;
      }
      if (typeof descriptor.value === "function") {
        return true;
      }
      return false;
    }
    current = Object.getPrototypeOf(current);
  }
  return false;
}

/**
 * Copy/validate whole-input own data before schema validation. Only own
 * enumerable data properties are copied (inherited members are ignored and
 * can never satisfy required fields); accessors, symbol keys,
 * non-enumerable properties, undefined, functions, symbols, BigInts,
 * non-finite numbers, cycles and callable `toJSON` are rejected with the
 * given generic code without executing user code. The result shares nothing
 * with the input and is safe for direct validators and serialization.
 */
export function sanitizeJsonValue(value: unknown, code: CodecErrorCode): unknown {
  return sanitizeValue(value, code, new Set());
}

function sanitizeValue(value: unknown, code: CodecErrorCode, seen: Set<object>): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CodecError(code, "Invalid value.");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new CodecError(code, "Invalid value.");
  }
  return sanitizeObject(value as Record<string, unknown>, code, seen);
}

function sanitizeObject(
  record: Record<string, unknown>,
  code: CodecErrorCode,
  seen: Set<object>,
): unknown {
  if (seen.has(record)) {
    throw new CodecError(code, "Invalid value.");
  }
  seen.add(record);
  try {
    if (hasCallableToJson(record)) {
      throw new CodecError(code, "Invalid value.");
    }
    if (Array.isArray(record)) {
      // Normal JSON arrays carry exactly the canonical indices plus length.
      // Any other own member (extra data keys, symbols, accessors) is
      // rejected rather than silently dropped before serialization.
      for (const key of Reflect.ownKeys(record)) {
        if (typeof key !== "string") {
          throw new CodecError(code, "Invalid value.");
        }
        if (key === "length") {
          continue;
        }
        const index = Number(key);
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= record.length ||
          String(index) !== key
        ) {
          throw new CodecError(code, "Invalid value.");
        }
        const descriptor = Object.getOwnPropertyDescriptor(record, key);
        if (
          descriptor === undefined ||
          !descriptor.enumerable ||
          "get" in descriptor ||
          "set" in descriptor
        ) {
          throw new CodecError(code, "Invalid value.");
        }
      }
      const items: unknown[] = [];
      for (let index = 0; index < record.length; index += 1) {
        if (!hasOwnKey(record, String(index))) {
          throw new CodecError(code, "Invalid value.");
        }
        items.push(sanitizeValue(getOwn(record, String(index)), code, seen));
      }
      return items;
    }
    const out: Record<string, unknown> = {};
    for (const key of Reflect.ownKeys(record)) {
      if (typeof key !== "string") {
        throw new CodecError(code, "Invalid value.");
      }
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        "get" in descriptor ||
        "set" in descriptor
      ) {
        throw new CodecError(code, "Invalid value.");
      }
      setOwn(out, key, sanitizeValue(descriptor.value, code, seen));
    }
    return out;
  } finally {
    seen.delete(record);
  }
}

/** Detached own-data records; ordinary accessors are never invoked. */
export function ownRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (typeof value !== "object" || value === null) return null;
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, "value"))
        return null;
      copy[key] = descriptor.value as unknown;
    }
    return copy;
  } catch {
    return null;
  }
}

export function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function exactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(record).every((key) => keys.includes(key));
}

function isJson(value: unknown, active: Set<object>): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || active.has(value)) return false;
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      if (keys.length !== value.length + 1) return false;
      for (let i = 0; i < value.length; i += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (
          descriptor === undefined ||
          !hasOwn(descriptor as Record<string, unknown>, "value") ||
          !isJson(descriptor.value as unknown, active)
        )
          return false;
      }
      return true;
    }
    const record = ownRecord(value);
    return record !== null && Object.values(record).every((item) => isJson(item, active));
  } finally {
    active.delete(value);
  }
}

export function validMetadata(value: unknown): boolean {
  const record = ownRecord(value);
  if (record === null || hasOwn(record, "io.modelcontextprotocol/related-task")) return false;
  if (hasOwn(record, "progressToken")) {
    const token = record["progressToken"];
    if (typeof token !== "string" && (typeof token !== "number" || !Number.isFinite(token)))
      return false;
  }
  try {
    return isJson(record, new Set<object>());
  } catch {
    return false;
  }
}

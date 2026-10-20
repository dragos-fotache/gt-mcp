// Shared inert capability capture/fences; no IO and no public barrel exports.
export class CreationFault extends Error {
  constructor(readonly code: string) {
    super("Creation failed.");
    this.stack = "Creation failed.";
  }
}
import type { StorageBinding } from "../storage/index.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const aborted = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted")?.get;

export function invalid(): never {
  throw new CreationFault("invalid_arguments");
}

export function fields(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object") return invalid();
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      typeof key !== "string" ||
      !allowed.includes(key) ||
      !descriptor ||
      !("value" in descriptor)
    )
      return invalid();
    result[key] = descriptor.value as unknown;
  }
  return result;
}

export function captureBinding(value: unknown): StorageBinding & { readonly accountUuid: string } {
  try {
    const data = fields(value, [
      "origin",
      "accountUuid",
      "profileGenerationId",
      "sessionGeneration",
    ]);
    const origin = data["origin"];
    const accountUuid = data["accountUuid"];
    const profileGenerationId = data["profileGenerationId"];
    const sessionGeneration = data["sessionGeneration"];
    if (
      typeof origin !== "string" ||
      new URL(origin).origin !== origin ||
      new URL(origin).protocol !== "https:" ||
      typeof accountUuid !== "string" ||
      !UUID.test(accountUuid) ||
      typeof profileGenerationId !== "string" ||
      !UUID.test(profileGenerationId) ||
      typeof sessionGeneration !== "number" ||
      !Number.isSafeInteger(sessionGeneration) ||
      sessionGeneration < 0
    )
      return invalid();
    return Object.freeze({ origin, accountUuid, profileGenerationId, sessionGeneration });
  } catch {
    return invalid();
  }
}

export function equalBinding(a: StorageBinding, b: StorageBinding): boolean {
  return (
    a.origin === b.origin &&
    a.accountUuid === b.accountUuid &&
    a.profileGenerationId === b.profileGenerationId &&
    a.sessionGeneration === b.sessionGeneration
  );
}

export function checkSignal(signal: AbortSignal): void {
  let value: unknown;
  try {
    if (aborted === undefined) return invalid();
    value = Reflect.apply(aborted, signal, []);
  } catch {
    return invalid();
  }
  if (value) throw new CreationFault("operation_interrupted");
}

export function captureMethod<C extends object, K extends keyof C>(capability: C, key: K): C[K] {
  const descriptor =
    Object.getOwnPropertyDescriptor(capability, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(capability) as object, key);
  if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "function")
    return invalid();
  return descriptor.value.bind(capability) as C[K];
}

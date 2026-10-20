/** Trusted caller has stopped domain work and holds explicit intent or fresh proof. */
import { assertSignal, bindingsEqual } from "../auth/validate.js";
import { LoginError } from "../login/errors.js";
import type { ProfileSession, StorageBinding } from "../storage/index.js";
export async function removeOwnedProfile(
  owner: ProfileSession,
  binding: StorageBinding,
  signal: AbortSignal,
): Promise<void> {
  assertSignal(signal);
  if (!bindingsEqual(owner.binding, binding)) throw new LoginError("recovery_required");
  if (signal.aborted) throw new LoginError("operation_interrupted");
  // Once deletion starts, finish known local cleanup despite cancellation.
  await owner.removeProfile();
}

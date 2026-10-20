/** Trusted local lifecycle; import performs no IO. */
import { openLifecycleSessionState } from "../auth/index.js";
import { assertSignal } from "../auth/validate.js";
import { LoginError } from "../login/errors.js";
import { loadLoginConfiguration } from "../login/configuration.js";
import { configPathFrom, storageRequest } from "../login/configured.js";
import { openProfile, removeProfile } from "../storage/index.js";
import type { StorageBinding } from "../storage/index.js";
export interface LifecycleProfileOptions {
  readonly configPath: string;
}
export async function signOutProfile(
  options: LifecycleProfileOptions,
  signal: AbortSignal,
): Promise<StorageBinding> {
  assertSignal(signal);
  const fields = configPathFrom(options);
  if (signal.aborted) throw new LoginError("operation_interrupted");
  const config = await loadLoginConfiguration(fields["configPath"] as string);
  const profile = await openProfile(storageRequest(config));
  try {
    if (profile.binding.accountUuid === null) throw new LoginError("login_required");
    const session = await openLifecycleSessionState({
      profile,
      transportConfig: {
        origin: config.canonicalOrigin,
        ...(config.budgets === undefined ? {} : { budgets: config.budgets }),
      },
    });
    try {
      if (signal.aborted) throw new LoginError("operation_interrupted");
      return await session.signOut(profile.binding);
    } finally {
      session.invalidate();
    }
  } finally {
    await profile.close();
  }
}
export async function removeLoginProfile(
  options: LifecycleProfileOptions,
  signal: AbortSignal,
): Promise<void> {
  assertSignal(signal);
  const fields = configPathFrom(options);
  const config = await loadLoginConfiguration(fields["configPath"] as string);
  if (signal.aborted) throw new LoginError("operation_interrupted");
  // A trusted explicit path may finish cleanup after key deletion; normal open cannot.
  await removeProfile(storageRequest(config));
}

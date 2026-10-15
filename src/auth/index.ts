/**
 * T06-S1 session state plus T06-S2 durable refresh rotation plus T06-S3
 * exact refresh recovery plus T06-S4 authenticated requests plus T06-S5
 * trusted lifecycle — public production entry.
 *
 * Exact runtime exports: openSessionState, SessionError, isSessionError,
 * SESSION_VAULT_VERSION (literal 1), openRefreshSessionState,
 * REFRESH_VAULT_VERSION (literal 2), openRecoverableRefreshSessionState,
 * openAuthenticatedSessionState, LIFECYCLE_VAULT_VERSION (literal 3),
 * openLifecycleSessionState.
 * Importing this module performs no IO, network, logging, timers,
 * processes, or global-handler installation. Only the T04/T05 public type
 * surfaces are reused (type-only, except the settled S4 query parser and
 * internal T05 transport construction); no provisioning, ambient key
 * discovery, or alternative credential source exists here.
 */

import { openAuthenticatedSessionState as openAuthenticatedState } from "./authenticated.js";
import type { AuthenticatedSessionState } from "./authenticated.js";
import { SessionError, isSessionError } from "./errors.js";
import {
  LIFECYCLE_VAULT_VERSION,
  openLifecycleSessionState as openLifecycleState,
} from "./lifecycle.js";
import type { LifecycleSessionState } from "./lifecycle.js";
import { openRecoverableRefreshSessionState as openRecoverableState } from "./recover.js";
import type { RecoverableRefreshSessionState } from "./recover.js";
import { openRefreshSessionState as openRefreshState } from "./refresh.js";
import type { RefreshSessionState, RefreshSessionStateOptions } from "./refresh.js";
import { openSessionState as openState } from "./session.js";
import type { SessionStateOptions, SessionState } from "./session.js";
import type { SessionErrorCode } from "./errors.js";

export { SessionError, isSessionError };
export type { SessionErrorCode };
export type { SessionClock, SessionStateOptions, SessionState } from "./session.js";
export type { RefreshSessionStateOptions, RefreshSessionState } from "./refresh.js";
export type { RecoverableRefreshSessionState } from "./recover.js";
export type { AuthenticatedResourceTransport, AuthenticatedSessionState } from "./authenticated.js";
export type { LifecycleSessionState } from "./lifecycle.js";
export { LIFECYCLE_VAULT_VERSION };

export const SESSION_VAULT_VERSION = 1 as const;

export const REFRESH_VAULT_VERSION = 2 as const;

export async function openSessionState(options: SessionStateOptions): Promise<SessionState> {
  return openState(options);
}

export async function openRefreshSessionState(
  options: RefreshSessionStateOptions,
): Promise<RefreshSessionState> {
  return openRefreshState(options);
}

export async function openRecoverableRefreshSessionState(
  options: RefreshSessionStateOptions,
): Promise<RecoverableRefreshSessionState> {
  return openRecoverableState(options);
}

export async function openAuthenticatedSessionState(
  options: RefreshSessionStateOptions,
): Promise<AuthenticatedSessionState> {
  return openAuthenticatedState(options);
}

export async function openLifecycleSessionState(
  options: RefreshSessionStateOptions,
): Promise<LifecycleSessionState> {
  return openLifecycleState(options);
}

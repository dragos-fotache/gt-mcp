/**
 * T04 protected storage — public production entry.
 *
 * Exact runtime exports: StorageError, isStorageError, provisionProfile,
 * openProfile, MAX_STORE_BYTES, DIGEST_KEY_VERSION. Importing this module
 * performs no IO of any kind. Factories validate arguments, bootstrap the
 * nonsecret lock file, spawn the kernel-lease holder through flock(1)
 * --no-fork, and return asynchronous IPC session proxies. The parent never
 * decrypts, reads, or writes profile payloads and never holds key material.
 */

import { fileURLToPath, URL } from "node:url";
import { bootstrapLock, launchIpcSession, type LockBootstrap } from "./client.js";
import { StorageError, isStorageError } from "./errors.js";
import type { OpenRequest, ProfileSession, ProvisionRequest } from "./types.js";
import {
  assertLocationRoots,
  assertOpenRequest,
  assertProvisionRequest,
  assertTimeoutMs,
  MAX_STORE_BYTES,
  DIGEST_KEY_VERSION,
} from "./validate.js";

export { StorageError, isStorageError };
export type { StorageErrorCode } from "./errors.js";
export { MAX_STORE_BYTES, DIGEST_KEY_VERSION };
export type {
  OpenRequest,
  ProfileSession,
  ProvisionRequest,
  StorageBinding,
  StorageAccess,
  StorageLocation,
  StoreUpdate,
} from "./types.js";

function holderJsPath(): string {
  return fileURLToPath(new URL("./holder.js", import.meta.url));
}

export async function provisionProfile(request: ProvisionRequest): Promise<ProfileSession> {
  const checked: ProvisionRequest = assertProvisionRequest(request);
  const roots: { profileRoot: string; anchorRoot: string } = assertLocationRoots(
    checked.profileRoot,
    checked.anchorRoot,
  );
  const timeoutMs: number = assertTimeoutMs(checked.timeoutMs);
  const bootstrap: LockBootstrap = bootstrapLock(roots.anchorRoot, roots.profileRoot, true);
  const deadlineMs: number = Date.now() + timeoutMs;
  return launchIpcSession({
    workerJsPath: holderJsPath(),
    lockFd: bootstrap.fd,
    op: "provision",
    params: {
      profileRoot: roots.profileRoot,
      anchorRoot: roots.anchorRoot,
      origin: checked.origin,
      profileGenerationId: checked.profileGenerationId,
      busAddress: checked.secretServiceBusAddress,
      expectedLock: bootstrap.identity,
      deadlineMs,
    },
    timeoutMs,
    deadlineMs,
    requirePid: false,
  });
}

export async function openProfile(request: OpenRequest): Promise<ProfileSession> {
  const checked: OpenRequest = assertOpenRequest(request);
  const roots: { profileRoot: string; anchorRoot: string } = assertLocationRoots(
    checked.profileRoot,
    checked.anchorRoot,
  );
  const timeoutMs: number = assertTimeoutMs(checked.timeoutMs);
  const bootstrap: LockBootstrap = bootstrapLock(roots.anchorRoot, roots.profileRoot, false);
  const deadlineMs: number = Date.now() + timeoutMs;
  return launchIpcSession({
    workerJsPath: holderJsPath(),
    lockFd: bootstrap.fd,
    op: "open",
    params: {
      profileRoot: roots.profileRoot,
      anchorRoot: roots.anchorRoot,
      expectedBinding: { ...checked.expectedBinding },
      busAddress: checked.secretServiceBusAddress,
      expectedLock: bootstrap.identity,
      deadlineMs,
    },
    timeoutMs,
    deadlineMs,
    requirePid: false,
  });
}

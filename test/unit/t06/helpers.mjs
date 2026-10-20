/* global AbortController, TextDecoder, TextEncoder */

// T06-S1 QA synthetic fixtures — independent, derived ONLY from the
// decision-ready S1 work order (shared MCP authentication/session contract) and the
// normative references it names. No production/implementation imports here.
//
// SYNTHETIC PROVENANCE: every UUID/token/timestamp below is fabricated for
// isolated QA use only. UUID fixtures use canonical lowercase syntax because
// valid-input cases require it; they are synthetic because they are listed
// here, never because of a prefix. No real credentials, tokens, account IDs,
// private paths, or raw backend bodies are included.

export const SYNTHETIC_LABEL = "synthetic-qa-t06-s1";

export const ORIGIN = "https://t06-s1-qa.example.invalid";

export const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const PROFILE_P = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

export const BEARER_A = "synthetic-qa-t06-bearer.01";
export const REFRESH_A = "synthetic-qa-t06-refresh.01";

// Fixed deterministic instants. CLOCK_LIVE_MS predates both expiries, so a
// facade opened with makeClock(CLOCK_LIVE_MS) treats the synthetic grant as
// live regardless of wall-clock date.
export const CLOCK_LIVE_MS = Date.parse("2026-09-01T00:00:00.000Z");
export const ACCESS_EXPIRY = "2026-09-27T12:15:00.000Z";
export const REFRESH_EXPIRY = "2026-10-27T12:00:00.000Z";
export const ACCESS_EXPIRY_MS = Date.parse(ACCESS_EXPIRY);
export const REFRESH_EXPIRY_MS = Date.parse(REFRESH_EXPIRY);

export function makeClock(fixedMs) {
  return { nowMs: () => fixedMs };
}

export function liveClock() {
  return makeClock(CLOCK_LIVE_MS);
}

export function utf8(text) {
  return new TextEncoder().encode(text);
}

export function utf8Text(bytes) {
  return new TextDecoder().decode(bytes);
}

// Minimal spec-shaped ServiceSession body (private UTF-8 service response
// body per work order; displayName optional nullable; additive fields are
// tolerated-but-dropped by the target and never asserted here).
export function syntheticGrantBody(overrides = {}) {
  return {
    account: { id: ACCOUNT_A, displayName: null },
    accessToken: BEARER_A,
    accessExpiresAt: ACCESS_EXPIRY,
    refreshToken: REFRESH_A,
    refreshExpiresAt: REFRESH_EXPIRY,
    ...overrides,
  };
}

export function grantBodyBytes(overrides = {}) {
  return utf8(JSON.stringify(syntheticGrantBody(overrides)));
}

// Private version-1 vault plaintext record per work order:
// { version: 1, binding: <all four StorageBinding fields>, grant: null | {
//   accountUuid, accessToken, accessExpiresAt, refreshToken,
//   refreshExpiresAt } }. Serialized by the test (never by production) to
// seed owner vault bytes through the diagnostic facility before opening.
export function version1Record({
  origin = ORIGIN,
  accountUuid = null,
  sessionGeneration = 0,
  profileGenerationId = PROFILE_P,
  grant = null,
} = {}) {
  return {
    version: 1,
    binding: { origin, accountUuid, sessionGeneration, profileGenerationId },
    grant,
  };
}

export function version1Bytes(options = {}) {
  return utf8(JSON.stringify(version1Record(options)));
}

export function syntheticVaultGrant(overrides = {}) {
  return {
    accountUuid: ACCOUNT_A,
    accessToken: BEARER_A,
    accessExpiresAt: ACCESS_EXPIRY,
    refreshToken: REFRESH_A,
    refreshExpiresAt: REFRESH_EXPIRY,
    ...overrides,
  };
}

export function freshSignal() {
  return new AbortController().signal;
}

export function abortedSignal() {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
}

// Await a promise and return its rejection. Throws when the promise
// resolves, so a missing rejection can never pass silently.
export async function captureRejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("synthetic-qa-t06: expected rejection, promise resolved");
}

// Attempt every teardown step in order, then propagate the first failure,
// so an unexpected cleanup problem fails the check without skipping
// remaining teardown. Callers preserve body-error precedence where the
// test body itself already failed. Small local composition, not a general
// cleanup framework.
export async function teardownAll(steps) {
  let first = null;
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      if (first === null) first = error;
    }
  }
  if (first !== null) throw first;
}

// Trusted profile-capability adapter delegating every call to the actual
// isolated T04 owner. It observes the public bindAccount entry and holds
// the returned promise behind release(), so a test can cancel/invalidate
// while the install waits for the declared storage result, then allow the
// owned commit to finish. No production reads, no private sync points.
export function makeBindGateOwner(owner) {
  let setReleased;
  const released = new Promise((resolve) => {
    setReleased = resolve;
  });
  let bindSeen = false;
  const adapter = {
    get binding() {
      return owner.binding;
    },
    readVaultBytes: (...args) => owner.readVaultBytes(...args),
    commit: (...args) => owner.commit(...args),
    bindAccount: (...args) => {
      bindSeen = true;
      return released.then(() => owner.bindAccount(...args));
    },
    advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
    close: (...args) => owner.close(...args),
  };
  return {
    adapter,
    hasEntered: () => bindSeen,
    release: () => setReleased(),
  };
}

// Trusted profile-capability adapter delegating every call to the actual
// isolated T04 owner. After arm(), the next readVaultBytes call signals
// owner-validation start and waits behind release(), so a test can advance
// a mutable clock to expiry while validation is unresolved, then release
// it. Later reads delegate directly. No clock-call quota is asserted.
export function makeValidationGateOwner(owner) {
  let armed = false;
  let started = false;
  let setReleased;
  const released = new Promise((resolve) => {
    setReleased = resolve;
  });
  const adapter = {
    get binding() {
      return owner.binding;
    },
    readVaultBytes: (...args) => {
      if (armed && !started) {
        started = true;
        return released.then(() => owner.readVaultBytes(...args));
      }
      return owner.readVaultBytes(...args);
    },
    commit: (...args) => owner.commit(...args),
    bindAccount: (...args) => owner.bindAccount(...args),
    advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
    close: (...args) => owner.close(...args),
  };
  return {
    adapter,
    arm: () => {
      armed = true;
    },
    hasStarted: () => started,
    release: () => setReleased(),
  };
}

// SharedArrayBuffer-backed view: the work order rejects shared byte backing.
export function sharedBackingBytes() {
  const shared = new SharedArrayBuffer(8);
  return new Uint8Array(shared);
}

// Detached view: the work order rejects detached byte backing.
export function detachedBytes() {
  const view = utf8('{"detached":true}');
  view.buffer.transfer();
  return view;
}

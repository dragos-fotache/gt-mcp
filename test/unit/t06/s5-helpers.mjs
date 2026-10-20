/* global TextDecoder, TextEncoder */

// T06-S5 QA s5 helper — independent, derived ONLY from the settled S5 work
// order (docs/tasks/t06-s5-work-order.md) and its PUBLIC references. No
// production/implementation imports here (pure builders; dist entry points
// are imported by the test files, never executed before the coordinator's
// named frozen relay). Reuses the accepted S1 helper only for the S1-shaped
// service-body bytes; S5 identity and v3 records are defined here.
//
// SYNTHETIC PROVENANCE: every UUID/token/timestamp below is fabricated for
// isolated QA use only. UUID fixtures use canonical lowercase syntax because
// valid-input cases require it; they are synthetic because they are listed
// here, never because of a prefix. No real credentials, tokens, account IDs,
// private paths, or raw backend bodies are included.

export const S5_LABEL = "synthetic-qa-t06-s5";

// Fixed origin for unit OPEN-time validation only (mismatch rejection, bad
// budgets, empty-state reads). It is NOT a safe behavioral destination:
// behavioral capture/replacement/sign-out oracles provision at the owned
// literal-loopback origin instead, so no executed call can reach
// non-loopback DNS/network.
export const S5_ORIGIN = "https://t06-s5-qa.example.invalid";

export const S5_ACCOUNT = "55555555-5555-4555-8555-555555555555";
export const S5_ACCOUNT_OTHER = "66666666-6666-4666-8666-666666666666";
export const S5_PROFILE_FOREIGN = "77777777-7777-4777-8777-777777777777";
export const S5_ROUTINE = "88888888-8888-4888-8888-888888888888";
export const S5_RESOURCE_KEY = "99999999-9999-4999-8999-999999999999";

// Canonical lowercase UUID with alphabetic hex digits, used ONLY as stored
// pending auth-key material in seeds (listed here, so synthetic by
// provenance). Fresh rotations allocate their own key; no test pins its
// value, only canonical shape when observed through durable bytes.
export const S5_PENDING_KEY = "bcdefabc-bcde-4bcd-8bcd-bcdefabcdefa";
export const S5_PENDING_KEY_OTHER = "cdefabcd-cdef-4cde-8cde-cdefabcdefab";

export const S5_BEARER = "synthetic-qa-t06-s5-access.01";
export const S5_REFRESH = "synthetic-qa-t06-s5-refresh.01";
export const S5_ROTATED_BEARER = "synthetic-qa-t06-s5-access.02";
export const S5_ROTATED_REFRESH = "synthetic-qa-t06-s5-refresh.02";
export const S5_SUPERSEDED_REFRESH = "synthetic-qa-t06-s5-refresh.00";

// Deterministic live clock base: predates all live synthetic expiries.
export const S5_CLOCK_LIVE_MS = Date.parse("2026-09-01T00:00:00.000Z");
export const S5_ACCESS_EXPIRY = "2026-09-27T12:15:00.000Z";
export const S5_REFRESH_EXPIRY = "2026-10-27T12:00:00.000Z";

// Already-expired access paired with a still-live refresh (installable).
export const S5_EXPIRED_ACCESS_EXPIRY = "2026-08-01T12:00:00.000Z";

// Live access paired with an already-expired refresh (must refuse).
export const S5_EXPIRED_REFRESH_EXPIRY = "2026-08-15T12:00:00.000Z";

// Rotated-grant expiry pair: distinct from the installed pair so replacement
// and rotation are observable through durable state, not dispatch.
export const S5_ROTATED_ACCESS_EXPIRY = "2026-09-27T12:45:00.000Z";
export const S5_ROTATED_REFRESH_EXPIRY = "2026-11-28T12:00:00.000Z";

export function s5Utf8(text) {
  return new TextEncoder().encode(text);
}

export function s5Utf8Text(bytes) {
  return new TextDecoder().decode(bytes);
}

export function s5Clock(fixedMs = S5_CLOCK_LIVE_MS) {
  return { nowMs: () => fixedMs };
}

// Exact prepare serialization per work order: UTF-8 JSON.stringify with the
// single refreshToken property, no whitespace/BOM. Tests serialize this
// themselves (never production) to build expected pending evidence.
export function s5PrepareBodyBytes(refreshToken) {
  return s5Utf8(JSON.stringify({ refreshToken }));
}

export function s5PrepareBodyBase64(refreshToken) {
  return Buffer.from(s5PrepareBodyBytes(refreshToken)).toString("base64");
}

export function s5VaultGrant(overrides = {}) {
  return {
    accountUuid: S5_ACCOUNT,
    accessToken: S5_BEARER,
    accessExpiresAt: S5_ACCESS_EXPIRY,
    refreshToken: S5_REFRESH,
    refreshExpiresAt: S5_REFRESH_EXPIRY,
    ...overrides,
  };
}

// Private version-2 vault plaintext record per the settled S2 shape
// (unchanged in S5), serialized by the test (never by production) to seed
// pre-replacement owner vault bytes through the diagnostic facility.
export function s5Version2Record({ binding, grant = null, pendingRefresh = null } = {}) {
  return { version: 2, binding, grant, pendingRefresh };
}

export function s5ValidPending(grant, authKey = S5_PENDING_KEY) {
  return {
    predecessor: { ...grant },
    refreshToken: grant.refreshToken,
    bodyBase64: s5PrepareBodyBase64(grant.refreshToken),
    authKey,
  };
}

export function s5Version2Bytes(options) {
  return s5Utf8(JSON.stringify(s5Version2Record(options)));
}

// Private version-3 vault plaintext record per the S5 work order:
// { version: 3, binding, grant: null | S1 stored grant,
//   pendingRefresh: null | exact S2 pending record,
//   superseded: [ { binding, grant, pendingRefresh }, ... ] }.
// Every retained entry keeps the current origin/account/profileGenerationId
// with a strictly older sessionGeneration. Serialized by the test (never by
// production) to seed owner vault bytes through the diagnostic facility.
export function s5Version3Entry({ binding, grant, pendingRefresh = null } = {}) {
  return { binding, grant, pendingRefresh };
}

export function s5Version3Record({
  binding,
  grant = null,
  pendingRefresh = null,
  superseded = [],
} = {}) {
  return { version: 3, binding, grant, pendingRefresh, superseded };
}

export function s5Version3Bytes(options) {
  return s5Utf8(JSON.stringify(s5Version3Record(options)));
}

// Minimal spec-shaped ServiceSession body for replacement/rotation success
// responses (private UTF-8 service response body; displayName optional
// nullable; additive fields tolerated-but-dropped by the target and never
// asserted). Same-account success by default; pass an account override for
// the different-account rejection case.
export function s5ServiceBody(overrides = {}) {
  return {
    account: { id: S5_ACCOUNT, displayName: null },
    accessToken: S5_ROTATED_BEARER,
    accessExpiresAt: S5_ROTATED_ACCESS_EXPIRY,
    refreshToken: S5_ROTATED_REFRESH,
    refreshExpiresAt: S5_ROTATED_REFRESH_EXPIRY,
    ...overrides,
  };
}

export function s5ServiceBytes(overrides = {}) {
  return Buffer.from(JSON.stringify(s5ServiceBody(overrides)), "utf8");
}

// Exact minimal createDraft body per the T05 transport shape check:
// exactly { id: expectedRoutineId }. The single representative mutation
// body for stale-mutation request-identity oracles.
export function s5DraftBodyBytes(routineId = S5_ROUTINE) {
  return s5Utf8(JSON.stringify({ id: routineId }));
}

// Canonical UUID shape (lowercase hyphenated), asserted for freshly prepared
// auth keys without pinning their random values.
export const S5_CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Trusted profile-capability adapter delegating every call to the actual
// isolated T04 owner. After arm(), the next advanceSessionGeneration call
// signals the begun-commit boundary and waits behind release(), so a test
// can invalidate while the owned durability commit is unresolved, then
// allow it to settle. Later advances delegate directly. No production
// reads, no private sync points.
export function makeAdvanceGateOwner(owner) {
  let armed = false;
  let entered = false;
  let setReleased;
  const released = new Promise((resolve) => {
    setReleased = resolve;
  });
  const adapter = {
    get binding() {
      return owner.binding;
    },
    readVaultBytes: (...args) => owner.readVaultBytes(...args),
    commit: (...args) => owner.commit(...args),
    bindAccount: (...args) => owner.bindAccount(...args),
    advanceSessionGeneration: (...args) => {
      if (armed && !entered) {
        entered = true;
        return released.then(() => owner.advanceSessionGeneration(...args));
      }
      return owner.advanceSessionGeneration(...args);
    },
    close: (...args) => owner.close(...args),
  };
  return {
    adapter,
    arm: () => {
      armed = true;
    },
    hasEntered: () => entered,
    release: () => setReleased(),
  };
}

// Trusted profile-capability adapter delegating every call to the actual
// isolated T04 owner. After arm(), the next commit call signals a begun
// owned durability transition and waits behind release(), so a test can
// admit a dependent lifecycle action while the owned install is unresolved,
// then allow it to settle. Later commits delegate directly. No production
// reads, no private sync points.
export function makeInstallGateOwner(owner) {
  let armed = false;
  let entered = false;
  let setReleased;
  const released = new Promise((resolve) => {
    setReleased = resolve;
  });
  const adapter = {
    get binding() {
      return owner.binding;
    },
    readVaultBytes: (...args) => owner.readVaultBytes(...args),
    commit: (...args) => {
      if (armed && !entered) {
        entered = true;
        return released.then(() => owner.commit(...args));
      }
      return owner.commit(...args);
    },
    bindAccount: (...args) => owner.bindAccount(...args),
    advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
    close: (...args) => owner.close(...args),
  };
  return {
    adapter,
    arm: () => {
      armed = true;
    },
    hasEntered: () => entered,
    release: () => setReleased(),
  };
}

// Trusted test-only capability observer delegating every call to the actual
// isolated T04 owner. Records the wall-clock time of each acknowledged
// advanceSessionGeneration resolution through the public capability
// boundary, without holding or altering any call. Lets a test assert that
// durable clearing precedes a dependent wire receipt, instead of inferring
// order from intended contract. No private seam, no clock patch.
export function makeAdvanceObserverOwner(owner) {
  const observed = { advanceAcknowledgedAt: null };
  const adapter = {
    get binding() {
      return owner.binding;
    },
    readVaultBytes: (...args) => owner.readVaultBytes(...args),
    commit: (...args) => owner.commit(...args),
    bindAccount: (...args) => owner.bindAccount(...args),
    advanceSessionGeneration: (...args) => {
      const outcome = owner.advanceSessionGeneration(...args);
      outcome.then(
        () => {
          observed.advanceAcknowledgedAt = Date.now();
        },
        () => {},
      );
      return outcome;
    },
    close: (...args) => owner.close(...args),
  };
  return { adapter, observed };
}

// Report a secondary teardown failure alongside the primary body failure
// instead of silently hiding it: both thrown together when both exist.
// Small local composition for S5 teardown postludes, not a framework.
export function combineS5Failures(bodyError, teardownError) {
  if (bodyError !== null && teardownError !== null) {
    throw new AggregateError(
      [bodyError, teardownError],
      "synthetic-qa-t06-s5: body failure with secondary teardown failure",
    );
  }
  if (bodyError !== null) throw bodyError;
  if (teardownError !== null) throw teardownError;
}

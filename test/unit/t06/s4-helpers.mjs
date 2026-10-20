/* global TextDecoder, TextEncoder */

// T06-S4 QA s4 helper — independent, derived ONLY from the settled S4 work
// order (shared MCP authentication/session contract) and its PUBLIC references. No
// production/implementation imports here (pure builders; dist entry points
// are imported by the test files, never executed before the coordinator's
// named frozen relay).
//
// SYNTHETIC PROVENANCE: every UUID/token/timestamp below is fabricated for
// isolated QA use only. UUID fixtures use canonical lowercase syntax because
// valid-input cases require it; they are synthetic because they are listed
// here, never because of a prefix. No real credentials, tokens, account IDs,
// private paths, or raw backend bodies are included.

export const S4_LABEL = "synthetic-qa-t06-s4";

// Fixed origin for unit OPEN-time validation only (mismatch rejection, bad
// budgets, empty-state reads). It is NOT a safe behavioral destination:
// behavioral capture/response oracles provision at the owned literal-loopback
// origin instead, so no executed call can reach non-loopback DNS/network.
export const S4_ORIGIN = "https://t06-s4-qa.example.invalid";

export const S4_ACCOUNT = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const S4_ACCOUNT_OTHER = "00000000-0000-4000-8000-000000000000";
export const S4_PROFILE = "11111111-1111-4111-8111-111111111111";
export const S4_ROUTINE = "22222222-2222-4222-8222-222222222222";
export const S4_WORKOUT = "99999999-9999-4999-8999-999999999999";
export const S4_RESOURCE_KEY = "33333333-3333-4333-8333-333333333333";

// Canonical lowercase UUID with alphabetic hex digits, used ONLY as stored
// pending auth-key material in seeds (listed here, so synthetic by
// provenance). Fresh rotations allocate their own key; no test pins its
// value, only canonical shape when observed through durable bytes.
export const S4_PENDING_KEY = "abcdefab-abcd-4abc-8abc-abcdefabcdef";

export const S4_BEARER = "synthetic-qa-t06-s4-access.01";
export const S4_REFRESH = "synthetic-qa-t06-s4-refresh.01";

// Deterministic live clock base: predates all live synthetic expiries.
export const S4_CLOCK_LIVE_MS = Date.parse("2026-09-01T00:00:00.000Z");
export const S4_ACCESS_EXPIRY = "2026-09-27T12:15:00.000Z";
export const S4_REFRESH_EXPIRY = "2026-10-27T12:00:00.000Z";

// Already-expired access paired with a still-live refresh (preflight case).
export const S4_EXPIRED_ACCESS_EXPIRY = "2026-08-01T12:00:00.000Z";

// Recovered/rotated grant expiry pairs: distinct from the installed pair so
// rotation is observable through durable state, not inferred from dispatch.
export const S4_ROTATED_ACCESS_EXPIRY = "2026-09-27T12:45:00.000Z";
export const S4_ROTATED_REFRESH_EXPIRY = "2026-11-28T12:00:00.000Z";
export const S4_ROTATED_BEARER = "synthetic-qa-t06-s4-access.02";
export const S4_ROTATED_REFRESH = "synthetic-qa-t06-s4-refresh.02";

export function s4Utf8(text) {
  return new TextEncoder().encode(text);
}

export function s4Utf8Text(bytes) {
  return new TextDecoder().decode(bytes);
}

export function s4Clock(fixedMs = S4_CLOCK_LIVE_MS) {
  return { nowMs: () => fixedMs };
}

// Exact prepare serialization per work order: UTF-8 JSON.stringify with the
// single refreshToken property, no whitespace/BOM. Tests serialize this
// themselves (never production) to build expected pending evidence.
export function s4PrepareBodyBytes(refreshToken) {
  return s4Utf8(JSON.stringify({ refreshToken }));
}

export function s4PrepareBodyBase64(refreshToken) {
  return Buffer.from(s4PrepareBodyBytes(refreshToken)).toString("base64");
}

export function s4VaultGrant(overrides = {}) {
  return {
    accountUuid: S4_ACCOUNT,
    accessToken: S4_BEARER,
    accessExpiresAt: S4_ACCESS_EXPIRY,
    refreshToken: S4_REFRESH,
    refreshExpiresAt: S4_REFRESH_EXPIRY,
    ...overrides,
  };
}

// Private version-2 vault plaintext record per work order (strict S2 v2
// record, unchanged in S4):
// { version: 2, binding, grant: null | S1 grant,
//   pendingRefresh: null | { predecessor, refreshToken, bodyBase64, authKey } }.
// Serialized by the test (never by production) to seed owner vault bytes
// through the diagnostic facility before opening.
export function s4Version2Record({ binding, grant = null, pendingRefresh = null } = {}) {
  return { version: 2, binding, grant, pendingRefresh };
}

export function s4ValidPending(grant, authKey = S4_PENDING_KEY) {
  return {
    predecessor: { ...grant },
    refreshToken: grant.refreshToken,
    bodyBase64: s4PrepareBodyBase64(grant.refreshToken),
    authKey,
  };
}

export function s4Version2Bytes(options) {
  return s4Utf8(JSON.stringify(s4Version2Record(options)));
}

// Minimal spec-shaped ServiceSession body for loopback refresh success
// responses (private UTF-8 service response body; displayName optional
// nullable; additive fields tolerated-but-dropped by the target and never
// asserted). Same-account success by default; pass account.id override for
// the different-account rejection case.
export function s4ServiceBody(overrides = {}) {
  return {
    account: { id: S4_ACCOUNT, displayName: null },
    accessToken: S4_ROTATED_BEARER,
    accessExpiresAt: S4_ROTATED_ACCESS_EXPIRY,
    refreshToken: S4_ROTATED_REFRESH,
    refreshExpiresAt: S4_ROTATED_REFRESH_EXPIRY,
    ...overrides,
  };
}

export function s4ServiceBytes(overrides = {}) {
  return Buffer.from(JSON.stringify(s4ServiceBody(overrides)), "utf8");
}

// Canonical UUID shape (lowercase hyphenated), asserted for freshly prepared
// auth keys without pinning their random values.
export const S4_CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Exact minimal createDraft body per T05 transport shape check:
// exactly { id: expectedRoutineId }. The single representative mutation
// body for request-identity oracles.
export function s4DraftBodyBytes(routineId = S4_ROUTINE) {
  return s4Utf8(JSON.stringify({ id: routineId }));
}

// Report a secondary teardown failure alongside the primary body failure
// instead of silently hiding it: both thrown together when both exist.
// Small local composition for S4 teardown postludes, not a framework.
export function combineS4Failures(bodyError, teardownError) {
  if (bodyError !== null && teardownError !== null) {
    throw new AggregateError(
      [bodyError, teardownError],
      "synthetic-qa-t06-s4: body failure with secondary teardown failure",
    );
  }
  if (bodyError !== null) throw bodyError;
  if (teardownError !== null) throw teardownError;
}

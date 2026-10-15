/* global TextDecoder, TextEncoder, setTimeout */

// T06-S3 QA s3 helper — independent, derived ONLY from the settled S3 work
// order (docs/tasks/t06-s3-work-order.md) and its PUBLIC references. No
// production/implementation imports here.
//
// SYNTHETIC PROVENANCE: every UUID/token/timestamp below is fabricated for
// isolated QA use only. UUID fixtures use canonical lowercase syntax because
// valid-input cases require it; they are synthetic because they are listed
// here, never because of a prefix. No real credentials, tokens, account IDs,
// private paths, or raw backend bodies are included.

export const S3_LABEL = "synthetic-qa-t06-s3";

// Disjoint from the S1 helper origin and the S2 synthetic origin, so S3
// vault seeds can never be mistaken for earlier-slice evidence.
export const S3_ORIGIN = "https://t06-s3-qa.example.invalid";

export const S3_ACCOUNT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const S3_ACCOUNT_OTHER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

// Canonical lowercase UUID with alphabetic hex digits, used ONLY as stored
// pending auth-key material in seeds (listed here, so synthetic by
// provenance). Fresh rotations allocate their own key; no test pins its
// value, only canonical shape when observed through durable bytes.
export const S3_PENDING_KEY = "abcdefab-abcd-4abc-8abc-abcdefabcdef";

// Deterministic live clock base: predates all synthetic expiries below.
export const S3_CLOCK_LIVE_MS = Date.parse("2026-09-01T00:00:00.000Z");
export const S3_ACCESS_EXPIRY = "2026-09-27T12:15:00.000Z";
export const S3_REFRESH_EXPIRY = "2026-10-27T12:00:00.000Z";
export const S3_ACCESS_EXPIRY_MS = Date.parse(S3_ACCESS_EXPIRY);
export const S3_REFRESH_EXPIRY_MS = Date.parse(S3_REFRESH_EXPIRY);

// Recovered-grant expiry pair: access already expired, refresh still live.
export const S3_RECOVERED_ACCESS_EXPIRY = "2026-09-27T12:30:00.000Z";
export const S3_RECOVERED_REFRESH_EXPIRY = "2026-11-27T12:00:00.000Z";

// Fresh-rotation result expiry pair: distinct from the recovered pair.
export const S3_ROTATED_ACCESS_EXPIRY = "2026-09-27T12:45:00.000Z";
export const S3_ROTATED_REFRESH_EXPIRY = "2026-11-28T12:00:00.000Z";

export function s3Utf8(text) {
  return new TextEncoder().encode(text);
}

export function s3Utf8Text(bytes) {
  return new TextDecoder().decode(bytes);
}

// Exact prepare serialization per work order: UTF-8 JSON.stringify with the
// single refreshToken property, no whitespace/BOM. Tests serialize this
// themselves (never production) to build expected pending evidence.
export function s3PrepareBodyBytes(refreshToken) {
  return s3Utf8(JSON.stringify({ refreshToken }));
}

export function s3PrepareBodyBase64(refreshToken) {
  return Buffer.from(s3PrepareBodyBytes(refreshToken)).toString("base64");
}

export function s3VaultGrant(overrides = {}) {
  return {
    accountUuid: S3_ACCOUNT,
    accessToken: "synthetic-qa-t06-s3-access.01",
    accessExpiresAt: S3_ACCESS_EXPIRY,
    refreshToken: "synthetic-qa-t06-s3-refresh.01",
    refreshExpiresAt: S3_REFRESH_EXPIRY,
    ...overrides,
  };
}

// Private version-2 vault plaintext record per work order (strict S2 v2
// record, unchanged in S3):
// { version: 2, binding, grant: null | S1 grant,
//   pendingRefresh: null | { predecessor, refreshToken, bodyBase64, authKey } }.
// Serialized by the test (never by production) to seed owner vault bytes
// through the diagnostic facility before opening.
export function s3Version2Record({ binding, grant = null, pendingRefresh = null } = {}) {
  return { version: 2, binding, grant, pendingRefresh };
}

export function s3ValidPending(grant, authKey = S3_PENDING_KEY) {
  return {
    predecessor: { ...grant },
    refreshToken: grant.refreshToken,
    bodyBase64: s3PrepareBodyBase64(grant.refreshToken),
    authKey,
  };
}

export function s3Version2Bytes(options) {
  return s3Utf8(JSON.stringify(s3Version2Record(options)));
}

// Minimal spec-shaped ServiceSession body for loopback success responses
// (private UTF-8 service response body; displayName optional nullable;
// additive fields tolerated-but-dropped by the target and never asserted).
export function s3ServiceBody(overrides = {}) {
  return {
    account: { id: S3_ACCOUNT, displayName: null },
    accessToken: "synthetic-qa-t06-s3-access.02",
    accessExpiresAt: S3_RECOVERED_ACCESS_EXPIRY,
    refreshToken: "synthetic-qa-t06-s3-refresh.02",
    refreshExpiresAt: S3_RECOVERED_REFRESH_EXPIRY,
    ...overrides,
  };
}

export function s3ServiceBytes(overrides = {}) {
  return Buffer.from(JSON.stringify(s3ServiceBody(overrides)), "utf8");
}

// Canonical UUID shape (lowercase hyphenated), asserted for freshly prepared
// auth keys without pinning their random values.
export const S3_CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Report a secondary teardown failure alongside the primary body failure
// instead of silently hiding it: both thrown together when both exist.
// Small local composition for S3 teardown postludes, not a framework.
export function combineFailures(bodyError, teardownError) {
  if (bodyError !== null && teardownError !== null) {
    throw new AggregateError(
      [bodyError, teardownError],
      "synthetic-qa-t06-s3: body failure with secondary teardown failure",
    );
  }
  if (bodyError !== null) throw bodyError;
  if (teardownError !== null) throw teardownError;
}

// Observe actual durable vault state through the real isolated owner: poll
// until match(record) holds, then return that observed record. Used to
// establish durability (not mere commit invocation) before releasing
// acknowledgement gates. No private sync points, no clock quotas.
export async function waitForVaultRecord(profile, match, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const record = JSON.parse(s3Utf8Text(await profile.readVaultBytes()));
    if (match(record)) return record;
    if (Date.now() >= deadline) {
      throw new Error("synthetic-qa-t06-s3: durable state not observed within deadline");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

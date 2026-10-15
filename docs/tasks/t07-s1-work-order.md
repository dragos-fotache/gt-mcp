# T07-S1 — Protected login transaction and binding publication

Status: COMPLETE, assigned and accepted on 2026-10-15. See
[acceptance evidence](../evidence/t07-s1-review.md). Direct primary-agent work;
bounded helpers are optional. The user's assignment supersedes historical
Developer/QA/Herdr relays for this slice. No successor is authorized.

## Outcome and authority

Implement S1 of [the T07 design](../decisions/t07-general-design-and-slices.md):
protected foreground exchange, atomic dedicated-session installation, private
binding metadata publication, setup and explicit metadata recovery. Shared MCP
draft0.2/backend v1 remain normative; accepted T04/T05/T06/T08 contracts remain
unchanged. Preserve prior evidence and T06 verification omissions.

No browser/listener/page, executable CLI, packaging, model tool, creation,
account switching, automatic refresh, journal replay or live Google/backend work.
Actual product writes remain disabled. Do not stage, commit or touch `.pi`.

## Additive trusted interface

New inert entry `src/login/index.ts` exports `LoginError`, `isLoginError`,
`LOGIN_VAULT_VERSION` (4), `openLoginTransaction`,
`openConfiguredLoginTransaction`, `setupLoginProfile`, `recoverLoginProfile`.
Types are additive; existing entry exports and formats do not change.

`openLoginTransaction({profile,transportConfig,metadata,settings,clock?})`
composes an already-owned T04 ProfileSession, accepted fixed-origin T05 config,
protected metadata capability and validated trusted login settings. It neither
closes nor reacquires the caller's profile. Production configured composition
loads explicit `configPath` and `loginConfigPath` and owns/releases its profile.
No sender/provider override is added to configured composition. Direct composition
reuses accepted T05 private-CA capability for isolated tests.

The returned LoginTransaction has `binding`, `start(signal)`,
`submit(attemptId,idToken,signal)`, `resume(signal)`, `cancel()`, `close()`.
`start` returns `{attemptId,challengeId,nonce,expiresAt}` for S2 only. `submit`
admits the sole callback synchronously before awaits. One active operation per
facade; competing work fails `operation_interrupted`. `cancel` fences and aborts
owned network, awaits persistence, then clears acknowledged pending evidence;
`close` aborts/awaits work and releases only a composition-owned profile, preserving
uncertain exchange for an explicit resume. Neither returns credentials.

Settings: exact `{version:1,googleWebClientId,browserOrigin}`; client ID is a
nonempty bounded printable public string; origin exactly
`http://localhost:<1024..65535>`, canonical decimal port. Files follow T08 private
file rules and 65536-byte bounds; all metadata files are distinct outside roots.

## Durable invariants

Version4 envelope, field names and receipt schema are exactly those in the design.
Strict UTF-8/duplicate-free JSON, canonical base64, exact binding, valid embedded
empty/v1/v2/v3 predecessor; no nested v4. Validate exchange body has exactly the
captured challengeId and a nonempty opaque token, and bounded bytes before commit.
UUIDs are canonical lowercase, sendsReserved integer 0..2, retryNotBeforeMs null
or safe epoch milliseconds. Challenge deadline uses accepted T06 exact UTC expiry
precision; unrepresentable submillisecond deadlines fail safely, never round.

One signIn challenge per start. Challenge/CSRF waiting state remains in memory.
Commit v4 before exchange; durably reserve each send before dispatch, with a final
identity/cancel/deadline check at the T05 dispatch hook. One initial send plus one
explicit resume across restarts; identical body/key. Never automatic retry.
Persist T05's bounded Retry-After delay before returning. Early resume sends
nothing. Invalid/malformed/uncertain responses preserve exchange; definite backend
rejection restores exact prior vault. Cancellation/expiry restores prior vault
only after owned work settles. Open clears expired v4 before other login work.

Validate service grant using T06, accept expired access/live refresh, reject a
different confirmed account. Initial bind goes from unbound generation0 to 1;
same-account replacement advances once and retains all predecessor grant/pending/
superseded evidence. Consume v4 within the atomic supported-v3 installation.
Operations are neither read nor changed. Recheck deadline and binding before
installation. Once install starts, await settlement and never restore predecessor
over a committed/ambiguous result, even on cancellation.

Metadata order: exclusive durable credential-free receipt -> T04 transition ->
durable atomic descriptor -> durable receipt removal, holding T04 ownership.
Private 0700 descriptor parent, no symlinks/hardlinks, identity/ancestry checks,
private exclusive temporary files, fsync files and directories. Never overwrite
unexpected metadata. Setup generates a new profile UUID, never adopts/resets.

Explicit recover validates receipt and descriptor relationship, tries target then
source only after definitive binding_mismatch/generation_mismatch. Other storage
errors stop. Target must contain valid supported v3 (or empty provision vault);
source must contain valid v4 or supported prior vault. Publish exact verified
binding then clear receipt; no exchange, challenge, account inference or generation
guessing. Missing authenticated provision target/ambiguity preserves evidence.

Safe errors only: invalid_arguments, configuration_required, recovery_required,
state_corrupt, state_version_unsupported, login_required, sign_in_failed,
retry_later, attempt_expired, operation_interrupted, internal_error. No native
exception, binding, credential, file path or response body in error/log output.
Storage and metadata ambiguity fences the facade until trusted reopen/recovery.

## Edits, execution and acceptance

Own new `src/login/`, focused `test/login/`, S1 docs/status/compatibility. No new
dependencies, relaxed compiler settings or manifest changes. Reuse existing
simple TLS/storage/provider fixtures; no generalized interception framework.
Every command pins provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME/PATH.
Allowed: locked install without scripts, typecheck, production lint/format/build,
focused tests and final complete active S1 plus relevant unchanged regressions.
Only explicitly isolated private bus/Secret Service, ext4 and private-CA HTTPS;
no personal bus, credentials or live service. Missing isolated facilities block
affected execution; never silently skip or count unrun checks as passing.

Acceptance: strict v4/settings validation; prepare-before-send and exact bounded
restart replay/delay; initial/same-account/different-account behavior; cancellation,
expiry and representative commit/publication ambiguity; setup/recovery with
source/target metadata; valid target reopened by T06/T08, pending v4 rejected;
real isolated storage/provider/TLS integration and relevant regressions. Record
failures/repairs and safe check results. Stop affected work on contract conflicts,
uncertain authority, corrupt/foreign state, missing keys or dependency needs.

Deliver implementation, focused tests, compatibility/ADR notes and honest evidence
and handoff. Finish S1 only; S2 requires a separate assignment.

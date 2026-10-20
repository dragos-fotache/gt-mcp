# Multiple clients S1 handoff and primary review

**Implementation complete, 2026-10-18.** User authorized S1 only.
[Work order](../tasks/multi-client-s1-work-order.md),
[checks/history](../evidence/multi-client-s1-checks.json),
[exact selection](../evidence/multi-client-s1-selection.json),
[inventory](../evidence/multi-client-s1-inventory.json),
[cleanup](../evidence/multi-client-s1-cleanup.json).

Private `src/storage/credential/acquire.ts` now exports
`acquireProfile(location,{signal,waitMs?})` and `ProfileAcquisitionError` for later
runtime composition. It captures the location, retries only actual lock conflict
with bounded backoff and a monotonic60-second default overall limit, and reports
fixed `interrupted`/`timed_out` failures after worker/session cleanup. The existing
per-worker operation timeout remains separate. Internal wait override is1–600000ms,
not a new config or model-facing field. No new public storage entry exports.

`credential/client.ts` permits cancellation only during read-only open, terminates
and observes the attempted worker, and detaches its signal before handing over a
session. Cancellation cannot affect provision/removal or a subsequently used
session/commit. Public `openProfile` remains exclusive and fail-fast. There is no
blocking flock child waiting beyond the helper's lifecycle, lock stealing/unlink,
provider injection or auth/record-format change.

Verification: final50/50 in seven files, zero failures/skips/pending/todo,583
unchanged execution hashes. This includes eight added checks for argument safety,
pre-abort, contention handoff/fresh state/captured location, post-delivery signal
detachment, cancellation/timeout with no late owner, actual stalled provider-open
worker release and non-contention failure propagation. Existing complete22-check
credential-store suite plus unchanged entry/format/path-safety/error/lease checks
passed against an isolated real provider and actual ext4 IO. The provider-stall
tests pause/resume only the runner-owned synthetic provider and inspect kernel
lock availability. No live backend/provider/credential access occurred.

Pinned Node24.21.0/npm11.19.0: `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`, changed-test lint/format and
compiled private-import/public-export inspection pass. The clean build preserved
all eight historical delivery files with identical before/after hashes. No build
or install raced execution. No dependency install or newer-Node test was needed.

An initial provider fixture qualification failed before application tests; the
cause is undetermined. A separate fresh synthetic probe and the unchanged final
selection succeeded; no runner/provider bypass was introduced. Initial formatter
failures are retained: new helper normalization, and inherited compatibility-table
padding. Only that guide's table padding changed; cell text/status claims were
verified identical. These failures are not counted as passing runs.

Primary review checked the user/S1 contract against production and assertions:
only ownership conflict retries; no mutation can receive acquisition cancellation;
deadline/caller cancellation both reap an actual stalled owner; reply/cancellation
handoff closes an undelivered session; returned sessions detach acquisition signals;
other storage errors and fail-fast public entry behavior remain intact. This is
primary review, **not independent review**. Required independent parent review,
integrated runtime/refresh/lifecycle acceptance and release gates remain open.

Current MCP runtime and laptop behavior are unchanged: servers still retain
lifetime ownership. S1 supplies the primitive; it does not deliver the multi-client
fix. No package/archive, deployment, SSH/process change, .pi edit, staging or commit.

S2 is ready for a separate user grant: record its runtime/generation/delivery
successor contract, consume this private helper, compose fresh call-local auth,
hold ownership through result handoff and implement cancellation/close cleanup.
S3 must then verify actual multiple-server operation, refresh uncertainty recovery,
sign-out/replacement fences and truthful creation outcomes before parent acceptance.
Packaging must include the new module once reachable; no new archive was made here.

# T08-S1 — Settled trusted read-runtime specification

## Authority and scope

The user selected the operator-facing choices in [the decision record](t08-s1-user-decisions.md)
and then delegated the remaining design decisions to the Coordinator. This document
settles S1's public contract; it does not open implementation, test-source, install,
build or runtime grants. The separately
[accepted work-order record](../tasks/t08-s1-work-order.md) governs delivered S1
behavior; all source/runtime/install/provider/suite windows are now closed. Shared MCP draft0.2 and backend v1 remain normative and unchanged.
Reuse accepted T03/T04/T05 and T06-S1–S5 specifications; this is composition, not a
new storage/auth protocol. [Proportional testing](proportional-testing-policy.md)
and context-safe slicing apply. T06 user-waived checks remain waived/unrun, not passed.

Outcome: a trusted startup factory owning one existing profile and exposing six
strict read methods plus close. No SDK/stdio delivery, login/logout commands,
creation/admission/journal behavior, automatic pagination, persistent read cache,
profile provisioning/repair/discovery, descriptor writer or dependency change.

## 1. File selection, schema and bounds

`openReadRuntime({})` returns an unconfigured runtime without filesystem/provider/
network access. A supplied `configPath` must be a nonempty absolute normalized
filesystem path. No environment fallback, implicit search, relative resolution,
write-enable flag or credential source. The eventual S3 entry accepts either no
arguments or exactly `--config <absolute path>`; S1 does not edit that entry yet.

Use the exact version-1 config and descriptor schemas selected in the decision
record. All nonoptional fields required; unknown keys rejected at every schema
object level. `writesEnabled` omitted => false; only strict boolean accepted.
Transport budget omissions receive accepted T05 defaults, values/ranges/interfield
constraints stay unchanged. Config accepts no insecure-origin/test-CA/sender fields.
`serviceOrigin` and descriptor origin must be identical canonical HTTPS origins
(no userinfo/path/query/fragment), using accepted T04/T05 canonical-origin rules.
Roots and descriptor paths are absolute normalized paths with no `.`/`..` segments;
storage/bus UUID/generation rules are accepted T04 rules. Profile/anchor separation
and filesystem support remain T04-authoritative. Config and descriptor must be
separate files outside both storage roots; neither is operation evidence.

Strict UTF-8, duplicate-key-free JSON objects, finite JSON numbers, no BOM/coercion.
Config maximum **65536 UTF-8 bytes**; descriptor maximum **4096 UTF-8 bytes**,
inclusive. These are trusted metadata bounds, not domain-content restrictions.
Reject oversize before unbounded accumulation; reject unsupported versions rather
than guessing another shape. Do not expose parser excerpts or exception messages.

### Protected file access

Supported S1 file loader is Linux, matching current production storage support.
Selected files must be regular single-link files owned by the effective user with
mode **0400 or 0600**. Reject symlinks in files and path components. Ancestor
directories must be owned by the user or root and not writable by group/others;
root-owned sticky shared ancestors (such as a system temporary directory) are
allowed only with a user-owned private 0700 subtree below them. File access must
check opened descriptors/identity, not merely trust a path check before opening;
reject detected replacement/unsafe traversal rather than follow a substituted link.
This is private-file hygiene, not protection against a privileged same-user process
or a whole-machine rollback adversary.

A genuinely absent selected config file is treated like no configuration. Unsafe
ancestors, dangling links, permissions, malformed or oversized config are fatal,
not "missing". Once a valid config exists, absent/unsafe/malformed/oversized/stale
binding descriptor is fatal. No directory/file creation, writes, search or repair.
Config and descriptor are detached startup snapshots; no watcher or reload.

Later S2 design adds optional `protocol.maxToolResultBytes` to version1 config,
with strict validation/defaults in [the S2 specification](t08-s2-protocol-spec.md).
That additive integration belongs to S2, not an expansion of S1 source scope;
S1's own delivered config contract remains the selected original shape until then.

## 2. Runtime entry and types

New public entry: `src/runtime/index.ts` -> `dist/runtime/index.js` plus declarations.
Exact runtime exports: `openReadRuntime`, `ReadRuntimeError`, `isReadRuntimeError`.
Types are exported as needed below; no root/foundation/server/CLI export changes.
Import performs no filesystem/provider/network/output/timer/process/handler effects.

```ts
interface ReadRuntimeOptions { readonly configPath?: string; }
type ReadEnvelope<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ToolErrorObject };
interface ReadRuntime {
  searchExercises(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<SearchExercisesPage>>;
  getExercise(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<ExerciseRecord>>;
  listWorkouts(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<WorkoutListPage>>;
  getWorkout(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<WorkoutRecord>>;
  listRoutines(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<RoutineListPage>>;
  getRoutine(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<RoutineRecord>>;
  close(): Promise<void>;
}
type ReadRuntimeErrorCode =
  | "invalid_arguments" | "configuration_required"
  | "recovery_unavailable" | "internal_error";
class ReadRuntimeError extends Error { readonly code: ReadRuntimeErrorCode; }
function isReadRuntimeError(value: unknown): value is ReadRuntimeError;
function openReadRuntime(options: ReadRuntimeOptions): Promise<ReadRuntime>;
```

Data/error types come from the accepted T03 public entry. Factory options are exact
own-data values; supplied undefined/null/unknown fields reject. Caller-input shape,
field or configPath syntax/normalization failures use
`ReadRuntimeError(invalid_arguments)`; malformed/unsafe/incompatible metadata in
selected config/descriptor files uses `ReadRuntimeError(configuration_required)`.
This distinguishes caller factory options from metadata validation, without a
fallback opening. Capture arguments
before yielding, without invoking accessors, mutating/freezing callers or retaining
mutable aliases. Error instances have fixed generic messages/sanitized stacks and
only a safe code; no cause/path/binding/native error payload. Recognition must not
invoke arbitrary getters. No publicly injected provider, sender, credential,
clock, bound-owner or diagnostic factory is added. QA uses actual accepted public
provision/install entry points only in expressly isolated fixture environments.

## 3. Startup composition and ownership

1. Validate complete config and descriptor before opening storage; validate T05
   budget/origin constraints even for a null-account descriptor. Invalid files or
   config/binding incompatibility => `ReadRuntimeError(configuration_required)`.
2. Open existing T04 `openProfile` once with supplied roots, explicit private bus,
   optional timeout and exact descriptor binding. No provision/reset/key fallback.
   Any storage opening failure => `ReadRuntimeError(recovery_unavailable)`.
   In particular, an internally valid same-origin descriptor stale versus the
   durable T04 binding fails here as recovery-unavailable, not as config validation.
   Descriptor schema/origin/config incompatibility detected before opening remains
   configuration-required; no stale binding is automatically repaired.
3. For nonnull account use T06 `openLifecycleSessionState`, including accepted
   empty/v1/v2/v3 decoding. For null account validate existing pre-auth state with
   S1 `openSessionState`; retain only private invalidation/ownership, never expose
   install/hooks. Null-account nonempty incompatible state is not silently ignored.
   Empty/null-grant valid states yield an authenticated-unavailable runtime.
4. Factory performs no auth/resource request, refresh, vault migration/write or
   operation read. Auth-state corruption/unsupported version fails opening with
   `recovery_unavailable`; unknown factory faults map to `internal_error`.
5. Once acquired, runtime exclusively owns and closes the profile. On subsequent
   startup failure, close the owner before rejecting. If close itself fails, report
   `internal_error`; never claim release or mask it with an unavailable runtime.
   No caller-visible binding, write permission getter or credential capability.

The protected descriptor is expected metadata, not account authority. T04 checks
actual encrypted storage binding/fences; only trusted backend-confirmed installation
can bind a profile. T08 reads the descriptor, never updates it. T07/T12 must settle
crash-safe trusted updates before delivering lifecycle transitions; a stale metadata
window fails closed and is not automatically repaired by T08.

## 4. Read invocation and errors

Entry validates native AbortSignal and matching T03 tool arguments, captures their
detached effective values, then checks availability. Precedence: invalid signal/
arguments => `invalid_arguments`; valid aborted call or explicitly closing/closed
runtime => `operation_interrupted`; recovery-fenced runtime => `recovery_unavailable`;
unconfigured => `configuration_required`; null-account/no grant =>
`authentication_required`. No malformed request prepares refresh or dispatches.

Invoke the matching T06 method with the private captured binding. Get methods use
the validated UUID, list/search methods use effective T03 arguments, default limit20
and unchanged continuation. Reuse accepted T05 query normalization; no additional
Unicode rules, token parsing, implicit token drop or exhaustive traversal. T06 owns
refresh/replay/401 retry, fences and live authorization. Add no retry loop or worker.
Read networking may overlap; retain one profile/auth owner.

Success exposes only complete canonical T03 data in the shared envelope, detached
and validated against its matching result contract. Preserve additive allowed backend
record data, IDs, ordering, labels, nulls and exact revision strings. No transport
metadata, raw bytes, private binding or persistent result cache. S2 later creates
matching SDK structured/text content and enforces its additional output budget.

Invocation errors use the selected conservative mapping: known T05 failures preserve
safe code/retryable and optional nonnull retryAfterSeconds/backendErrorCode; never
copy messages, correlation/dispatch metadata or creation IDs. Recognized auth codes
and cancellation remain unchanged. Storage failures and session corrupt/unsupported
state => `recovery_unavailable`, permanently fence this runtime and abort remaining
reads. Future valid calls return the same unavailable code until explicit close;
no automatic reacquisition. Unexpected fault => `internal_error` with fixed safe
message; if safe owner/auth state cannot be established, fence as recovery-unavailable.
Shared retryable values apply (recovery-unavailable false; internal-error and
operation-interrupted true). Invalid local arguments remain false. Return no
partially validated result or private exception detail. Single-fault precedence is
specified; multiple faults need only fail closed safely.

## 5. Close and cancellation

Each read uses a runtime-owned cancellation signal linked to the caller signal;
a caller abort affects that invocation, subject to accepted shared-refresh leader/
follower semantics. Recheck close/recovery fence/caller abort immediately before
success delivery, not merely before awaiting the backend. No late successful data.

`close()` synchronously fences admission, aborts runtime-owned read signals, waits
for all owned invocation promises (including begun durable auth work) to settle,
then invalidates retained session facade and closes the T04 owner. No detached
commit, forced kill, invented timeout or logout. Repeated/concurrent close shares
one terminal outcome. Successful close remains successful; failed close remains a
safe `ReadRuntimeError(internal_error)` rejection, not a false success or automatic
retry/reopen. Unconfigured close performs no storage/network action. Preserve all
pending refresh/operation evidence; cancellation is not rollback. No process signal
handlers in S1: S3 owns their connection to this close contract.

## 6. Verification boundary

Small specification-derived config/file/error checks and real isolated owner/auth/
HTTPS integration for six routes, effective paging/filter context, exact revision,
signed-out behavior, caller cancellation and close/release. An isolated private
Secret Service and supported storage filesystem are required for configured runtime
claims; do not use a personal bus or silently substitute a mock production opener.
A private fixture CA may be supplied to an isolated child via Node's trusted CA
facility; no production config TLS bypass or new runtime seam. Synthetic fixture
installation uses accepted T04/T06 trusted APIs, never a delivered token-paste UX.
No exhaustive fault cross-product; reuse accepted dependency coverage. Explicit
frozen-artifact/file-list relay and environment provisioning precede all execution.
No assertion here claims executed evidence, parent acceptance or release readiness.

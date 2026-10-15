# T08-S1 implementation ADR — Developer private choices

Public behavior is settled by `docs/decisions/t08-s1-runtime-spec.md`,
`docs/decisions/t08-s1-user-decisions.md`, and the two common S1
clarifications (factory caller-shape `invalid_arguments` boundary; stale
same-origin descriptor at storage opening is `recovery_unavailable`). This
record covers private implementation choices only and cannot redefine
common behavior.

## Module layout (`src/runtime/`, new)

- `errors.ts` — `ReadRuntimeError` plus brand-based `isReadRuntimeError`
  (private `WeakSet`, fixed generic messages, sanitized stacks).
- `files.ts` — Linux-only protected loader plus strict metadata JSON
  (strict UTF-8, no BOM, lenient-scan duplicate-key detection with native
  parse as syntax authority, object root).
- `config.ts` — version-1 config/descriptor schema validation, canonical
  origin gates, and file-separation checks.
- `index.ts` — `openReadRuntime` factory plus the six-read/close facade.

## Private decisions

- Factory caller-shape validation (plain exact own-data options,
  `configPath` absolute/normalized syntax) runs synchronously before any
  filesystem access; failures are `invalid_arguments`.
- Ancestor hygiene walks `lstat` identities bottom-up; a
  group/other-writable ancestor is excused only when root-owned, sticky,
  and a user-owned `0700` directory sits strictly below it on the selected
  path. Files open `O_NOFOLLOW` and are revalidated by `fstat` plus a
  post-open path dev/ino comparison; size bounds gate before and after the
  read. Single-link (`nlink === 1`) plus distinct normalized paths keep
  config and descriptor separate files.
- Budget shape validation delegates to a throwaway authoritative T05
  factory with neutral hooks; the detached copy feeds the lifecycle
  `transportConfig`. Origin canonicalization mirrors the accepted
  canonical-origin gates (HTTPS only; no insecure/test-CA fields exist).
- Null-account runtimes retain the S1 `openSessionState` handle for
  ownership/invalidation only; reads report `authentication_required`
  without dispatch. Nonnull runtimes dispatch through the bound T06
  lifecycle methods with the frozen session binding.
- Read success revalidates T05-returned data through `makeToolResult`
  against the matching result contract and returns the detached validated
  data; failure there is `internal_error`.
- Invocation mapping preserves T05 safe code/retryable plus nonnull
  retry metadata only. T06-internal fencing observed as
  `operation_interrupted` with a live caller and open runtime fences this
  runtime as `recovery_unavailable`; caller/close-driven interruption stays
  `operation_interrupted`. Envelopes carry no `message` field.
- `close()` fences admission synchronously, aborts runtime-owned signals,
  settles outstanding invocations, then invalidates the session facade and
  closes the T04 owner; concurrent/repeated close shares one terminal
  outcome and owner-close failure reports `internal_error`.
- `writesEnabled` is parsed strictly but never consulted for capability:
  the surface exposes no mutation primitive regardless of its value.

## c0 focused repairs (Coordinator production source review)

- Missing selections validate ancestry before reporting missing: symlinked
  or unsafe ancestors behind an absent file stay fatal.
- Nonregular selections reject before opening (no FIFO/device block);
  ancestor dev/ino identities are pinned (bigint) and revalidated, the path
  is re-examined without following links, and reads accumulate in bounded
  chunks against limit-plus-sentinel. All native loader faults map to a
  fixed sanitized `configuration_required`.
- Config schema plus selector/separation validation completes before any
  descriptor file access.
- Caller signals pass a guarded native brand probe; listener attachment
  failures are local `invalid_arguments`; caller listeners detach on
  settlement; only the runtime-owned signal is reread after dispatch, with
  a final outer delivery fence in the public read method.
- Recognized `operation_interrupted` is preserved, never inferred into
  permanent recovery; only established unsafe owner/state conditions
  fence. Close attempts safe owner release even if session invalidation
  faults, and all close faults are sanitized `internal_error`.

## c1 focused corrections (Coordinator production follow-up)

- Delivery guards distinguish genuine caller cancellation (observed only
  via the link-time forward path) and close from internal recovery
  fencing: closing/closed and observed caller abort report
  `operation_interrupted`, the fence reports `recovery_unavailable`, and a
  fence-caused owned-signal abort never overwrites it.
- Caller signals pass a native intrinsic brand probe (`throwIfAborted`
  with the caller as receiver; genuine aborted signals brand via native
  `AbortError`) and all listener operations use captured intrinsics via
  `Reflect.apply`, so forged `Object.create(AbortSignal.prototype)`
  shapes fail as local `invalid_arguments` without invoking caller code.
- The loader pins the pre-open selected dev/ino and compares it against
  both the opened descriptor and the live entry; live nlink/uid/mode and
  ancestor uid/mode are revalidated; candidates open nonblocking so a
  regular-to-FIFO substitution cannot hang before the fstat rejection.

## c2 narrow signal corrections (Coordinator production follow-up)

- Branding and abort-state capture use the captured native `aborted`
  getter with the caller as receiver: genuine aborted signals with
  arbitrary string/Error/object reasons brand correctly, and neither
  reason nor caller-shadowed properties are read or inspected.
- `linkOwnedSignal` takes the intrinsically captured initial state and
  never reads `caller.aborted`; it returns the same observed link object
  whose `callerAborted` flag the invocation and delivery guards read.

## T08-S2 protocol composition

Public behavior is settled by `docs/decisions/t08-s2-protocol-spec.md`.

- `src/protocol/index.ts` exposes only the five specified runtime values
  and their public types. Private modules separate capability/lifetime
  composition, fixed catalogue, own-data validation, safe errors and results.
- The official low-level SDK Server retains initialize/ping/routing and
  cancellation. Its public fallback request handler handles tools/call,
  avoiding the SDK's stock record-argument gate; final results explicitly
  pass CallToolResultSchema validation. No SDK private state is accessed.
- T03 arguments, schemas and canonical result validation remain unchanged.
  Catalogue schemas are detached per list, with only output root type:object
  added. Creation validates structurally but has no runtime dispatch path.
- Runtime read failures are checked for known read code/retryable values
  and read-only metadata. Optional runtime presentation messages are omitted.
  Validation faults and unrecognized thrown failures become internal_error.
- The budget is measured on JSON.stringify of the entire final SDK result
  in UTF-8, including duplicate text. Equality passes; overflow replaces the
  whole result, never canonical records or individual fields.
- The S1 implementation lives privately in `src/runtime/read.ts`, behind
  its unchanged three-export `index.ts` facade. The public S1 opener and
  private S2 composed opener use the same validation/opening path. S2 gets
  its budget and runtime from one validated snapshot, without a second read
  or new public injection seam. Config adds only protocol.maxToolResultBytes;
  descriptor, storage, HTTP/auth and six-read behavior remain unchanged.
- Adapter close fences admission immediately and retains one cleanup
  promise. It awaits runtime close before SDK transport close, attempts
  transport closure even after runtime cleanup failure, and observes the
  retained rejection for disconnect-triggered cleanup without discarding
  the outcome explicit close must report. Connect is one-attempt only.
- Failed adapter construction leaves direct caller ownership unchanged;
  the configured factory cleans up an acquired runtime on later failure.

## Source-window limits (historical)

Source/static readiness only; no runtime execution was performed under the
source-window grants. Independent SDK behavior, configured-runtime behavior
(isolated provider, fixture CA/HTTPS, synthetic data), cancellation and cleanup
verification await the separate frozen relay. Stdio/process entry remains
unchanged and is deferred to S3; no whole-wire or memory bound is claimed.

## S2 closure observations and remaining limits

Coordinator independently observed the same c2 candidate pass SDK 99/99 plus
configured 13/13: 112/112 (20 S2 owning checks, 92 regressions), with all 217
input hashes stable. Source audit confirmed single-snapshot startup and budget
forwarding. SDK 1.32.1 / Zod 4.5.4 / Node 24.21.0 / npm 11.19.0 were used;
supplemental actual Client/InMemoryTransport initialization negotiated
2025-11-25. Observed scope includes seven tools, six reads, full schemas,
semantic structured-result equality and text equal to JSON.stringify of the
actual structured content, not an expected object's member insertion order.

The whole final serialized CallToolResult is measured in UTF-8, including its
duplicate text. `protocol.maxToolResultBytes` defaults to 4194304 and accepts
4096..67108864 inclusive; equality passes, overflow replaces the whole result,
and nothing is truncated. No whole-wire or memory bound follows. Real isolated
GNOME 51.1 / ext4 / private-CA HTTPS signed-out composition with true write
policy proved creation remains inert; configuration cannot activate the
placeholder. It did not prove authenticated stdio, login, host, real-backend
or release interoperability.

The [common S2 specification](t08-s2-protocol-spec.md) and
[Coordinator closure review](../evidence/t08-s2-coordinator-review.md) bound
acceptance, not this implementation record. The
[original f1 result](t08-s2-f1-sdk-adjudication.md) remains 95/99 with four
failures; the original fourth failure's returned fields remain UNKNOWN.
Historical notes and broad product/release compatibility statuses remain
unverified. Parent T08 is incomplete; S3 is unassigned and held.

## T08-S3 process delivery

The actual server entry keeps the pinned `import.meta.main` import guard and
exports async `main(args) -> exit code`. It opens the configured S2 factory once,
observes startup EOF/signals while retaining at most 10 MiB of original input,
and never abandons an acquired runtime when startup is interrupted.

A private transport delegates parsing to official `StdioServerTransport` and
serialization to public SDK `serializeMessage`. Strict streaming UTF-8 validation
and byte accounting precede parsing; no second JSON decoder or private SDK
buffer is used. Parse faults fence the connection synchronously, including later
messages in the same chunk. Writes settle through Node callbacks; pending sends
are rejected on close. Pipe stdout uses an owned public `net.Socket` handle
because Node deliberately prevents destruction of `process.stdout` from closing
its pipe. After persistence/owner cleanup, stdin is unreferenced so an open client
pipe cannot retain a terminated server lifecycle.

The adapter uses public SDK initialization state/callbacks to gate tool methods.
An initialized adapter retains S2 argument-validation/interruption behavior during
explicit close. Unexpected SDK errors close the transport immediately and retain
a safe failure, while ordinary explicit S2 close still awaits runtime cleanup
before transport close. A private weakly keyed outcome observer lets process
startup distinguish SDK fault from failed cleanup; public facade exports and
capabilities remain unchanged. Diagnostics contain only fixed text.

The current user explicitly replaced the historical Herdr/role-separated relay
workflow with primary-agent implementation and optional bounded subagent review
and tests. Public requirements, isolated fixtures, full active owning/relevant
regressions and clean locked reproduction remain the acceptance boundaries.

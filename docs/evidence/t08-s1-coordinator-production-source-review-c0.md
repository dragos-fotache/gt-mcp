# T08-S1 Coordinator production source review — c0

## Disposition

Production readiness REJECTED pending focused repairs; no runtime relay. Coordinator
read the four new runtime modules and ADR against settled S1/T03–T06 public contracts.
No QA-private findings or test oracles are supplied to Developer.

Coordinator independently ran the pinned Node24.21.0/npm11.19.0 four production
checks sequentially with full output and unmasked status: typecheck, lint:production,
format:check:production, build ALL exit0. This establishes candidate static/build
readiness only, not behavior or source conformance. Developer's earlier commands
piped npm output through tail without pipefail, so those reported statuses alone
were not reliable acceptance evidence; full Coordinator rerun is separate evidence.
The extra Node console diagnostic is retained as a disclosed scope deviation, not
a compiled feature probe or behavior pass. No install/QA suite/provider/TLS run.

## Focused contract/safety findings

1. **Missing config bypasses safety validation.** loadProtectedFile returns missing
   immediately on selected-path ENOENT, before validating ancestors. Missing leaves
   behind a symlinked or unsafe ancestor must remain fatal, not an unavailable
   runtime. Detect dangling/component links and validate traversal on the missing
   path, without requiring a file to exist or silently trusting partial traversal.
2. **Protected reads are not bounded/race-safe yet.** readFile accumulates arbitrary
   growth after the size stat before checking maxBytes. Bound actual bytes read
   to the inclusive limit plus an overflow sentinel. The pre-open selected identity
   is unused; ancestors retain uid/mode but not pinned opened identities, and the
   later stat follows links. A substituted component can be followed without
   detecting its replacement. Validate opened file/ancestor identity and reject
   detected unsafe substitution rather than relying on path checks alone. Reject
   nonregular selections without potentially blocking on a FIFO/device open.
3. **Native file errors can escape.** active.stat/readFile/close errors and the
   config load outside the factory's mapping can propagate native exceptions and
   private paths. All public factory/close failures must be fixed sanitized
   ReadRuntimeError outcomes, preserving cleanup failure without raw native detail.
4. **Validate config before descriptor access.** Factory loads descriptor bytes
   before complete config schema and outside-root/separation checks. A rejected
   config can name private vault/operation bytes as a descriptor and read them first.
   Validate config/path boundaries before loading selected descriptor metadata;
   opening must not read operation evidence or private files through an invalid
   metadata selector. Keep accepted public exports/storage protocols unchanged.
5. **Native-signal and delivery boundary.** instanceof alone admits a forged
   AbortSignal-prototype object, after which signal access can throw a raw rejection
   rather than invalid_arguments. Use native branding/capture without executing
   arbitrary caller getters. The outer public read method awaits dispatchRead after
   its success fence; recheck interruption/recovery at the final public delivery
   boundary so a queued abort/close cannot still deliver success. Remove caller
   listeners when an invocation settles, not only when it later aborts.
6. **Preserve recognized interruption mapping.** A live caller alone does not
   establish corrupt/unsupported storage or permanently unavailable auth. Current
   mapping converts recognized Session/Transport operation_interrupted to permanent
   recovery_unavailable solely from that condition. Preserve recognized safe
   interruption/auth/transport semantics; only established unsafe owner/state
   conditions justify permanent recovery fencing under S1. If invalidate fails
   during close, attempt remaining safe owner release and retain safe failure, not
   silently leave it owned without attempting closure.

## Repair scope and limits

Developer may repair only its four new src/runtime modules and own T08 ADR under
the existing bounded S1 source window, plus the existing four production checks.
No dependency/compiler/public-surface/accepted storage/auth/http/domain change,
QA read, target/provider/HTTPS/suite/install execution or actual write is granted.
Use full retained output and actual command exit status; no tail pipelines that
mask results. Report focused source/static readiness or honest partial blockers,
then HOLD. Independent follow-up review, safe environment confirmation and frozen
runtime relay remain mandatory. No new broad design or testing campaign requested.

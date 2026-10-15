# T06-S1 QA repaired-source review R2 — further bounded repair required

Coordinator-only QA review; no implementation details supplied to QA or QA
internals to Developer. Read all four owned JS files plus source evidence and
accepted public T04/T05 specs/QA helper contracts. Target/test execution remains
CLOSED; findings below are source/specification review, not observed test results.

Executable assertions now replace the initial scaffolding, but sources are NOT
ready for a frozen execution relay:

1. **Issued profile identity:** diagnostic creation mints its own profile UUID.
   Valid-vault seed and installed-binding expected values use a hardcoded profile
   UUID rather than the issued binding. Derive expected identity from the test's
   captured public profile.binding; seed valid state under that identity. Invalid
   cases must alter only their claimed fault to avoid passing for the wrong reason.
   The claimed bound-grant mismatch is currently seeded under an unbound owner.
2. **Stale/foreign hook oracle:** stale/foreign/invalidated captures reject
   operation_interrupted; null is reserved for CURRENT no-grant/expired-grant or
   mutation credential selection. Assertions expecting null after invalidation/
   vault-drift and authentication_required for a foreign T05 read conflict with
   common fence rules and T05 hook-failure mapping. Isolate foreign-binding and
   current-but-mutation cases rather than letting a fence contaminate the next
   purported credential-selection case. Tests must not assert undocumented IO
   avoidance via a title when no observation supports it.
3. **Dispatch summary consistency:** disallowed routes must be tested with their
   documented method/keyKind. populate is PUT/resource; logout/status POST/null;
   exchange/refresh POST/auth; draft/save POST/resource. An inconsistent summary
   is invalid_arguments, not a disallowed-route oracle. Public T05 table is the
   independent reference.
4. **Persistence fault semantics:** commit.anchor.prepared is an ambiguous durable
   storage failure; the failed owner/state may deny later vault reads/reopen.
   Do not require the original owner to return an empty vault after this fault.
   Choose one representative definite or ambiguous fault and assert its documented
   T04 semantics plus the S1 permanent facade fence, without assuming rollback.
5. **Missing core assertions:** include a representative accepted zero-sub-ms-tail
   expiry with exact original string roundtrip; current tests mention this but
   test only invalid nonzero tails. Include deterministic cancellation while an
   initial commit is unresolved: owned storage completion handled safely, no
   success delivery, permanent facade fence. Do not launch a general fault matrix.
6. **Fixture cleanup:** several initial owners are not closed in finally if install,
   assertions or a subsequent open fails. Every acquired holder/listener/pending
   owned request must be safely cleaned up even on failure; use simple local
   finally blocks, not a general cleanup framework. Observe loopback dispatch via
   existing bounded QA wait helper rather than a bespoke2000x5ms polling loop.
7. **Evidence accuracy:** JS inventory is four files, not five. Claimed source-only
   resolution cannot be established by grep alone. Resolve declared static
   imports/exports without importing target JS. Record exact source-quality
   commands/exits and current partial/review status; no independent execution pass.

Clock-on-use test should exercise actual grant-deadline evaluation, not assume
an absent grant must read an optional clock. The common work order requires every
clock reading valid but does not require reading a clock to return no grant.

## Disposition

Bounded QA SOURCE-ONLY repairs reopen under original window limits. No test,
provider, HTTP or target execution until a reviewed named relay. Developer's
repaired candidate remains a separate prerequisite. QA may use only common
specification/public dependency contracts and its own helpers/fixtures; no private
production review/ADR/source. Do not weaken a real requirement or count a skipped
check as pass. Correct these specific fixtures/oracles and fill only the named
core gaps, then report static readiness and HOLD.

# T06-S2 coordinator QA source re-review r2

**Disposition: further narrow source repair required; NOT SOURCE-APPROVED.**
Reviewed all three repaired s2 files and
[QA r1 follow-up](t06-s2-qa-repairs-r1.md) against the common S2 contract, not
production implementation. No compiled-target/provider/HTTP/Vitest execution.
The initial readiness and r1 review remain preserved.

## Verified source repairs and static checks

Real bound-owner setup, deliberately different malformed key, unknown-version
fixture, readable success-installation fault semantics, pinned T05 errors and
cancellation codes, follower-local vs live-follower leader abort, already-expired
returned refresh and installed-grant/no-rollback assertions now reflect the public
contract. Reopened-profile assignment uses a current-owner box. Declared cases
are23unit +4durability +12concurrency =39; these are source counts, not test results.

Coordinator repeated scoped Node syntax checks for all3files, scoped ESLint and
Prettier check: ALLPASS/exit0, with disposable T01_NODE_HOME/PATH,
Node24.21.0/npm11.19.0. No import or target execution, build or install.

## Remaining blockers — repair existing cases/fixtures, not a bigger suite

### R2-1 — Enter/complete the prepare gate before claiming no dispatch

In s2-durable-dispatch, makeCommitGateOwner does not expose entry/completion;
the ordering case simply sleeps250ms, asserts no request and releases the gate.
A slow setup/owner read can leave prepare unentered at that point, allowing the
gate to be released before it ever blocks anything. This does not discriminate
the required order. Observe real prepare completion held at the public capability
boundary with a bounded wait, capture the durable pending snapshot while held,
then perform bounded no-dispatch observation and release. Compare the later
request to that PRE-release snapshot. A bounded negative wait is acceptable only
AFTER the meaningful gate boundary is independently established.

### R2-2 — Release ALL gates and settle their real work on every path

The prepare gate is scoped inside try and never released by teardown. If its
no-dispatch assertion fails, catch stores bodyError but teardown then awaits the
owned rotation while the prepare gate is still held: it can hang forever. The
final-commit gate cases likewise release only on their happy body path; harness
cleanup releases the RESPONSE gate, not those storage gates. A failing unsettled
assertion can leave the owned commit unresolved and the live holder unclosed.

Keep small per-case release controls available to cleanup; release every storage
and response gate on all paths BEFORE awaiting owned work and closing ownership.
Attach handling to the real owner.commit promise immediately (current
return gate.then(()=>pending) leaves rejection unobserved until release). Track
that real owned work independently of an incorrectly early-settled public promise.
Propagate body/cleanup failures honestly; no forced owner termination, masking or
unbounded pending gate. Apply to all three gated commit adapters, not just prepare.
No generalized gate framework is requested.

The harness must also assign box.profile immediately after each successful
provision/open, not only after S1 install/reopen/read all succeed. A setup error
currently leaves the current holder outside teardown's ownership box. Existing
reopen cleanup is otherwise fixed.

### R2-3 — Make existing config-copy assertions discriminate nested mutation

The pre-first-await case changes nested maxAttempts1 to5, both valid, then checks
only successful open/binding. A shallow captured budget reference would also pass.
Use a deliberate nested mutation with a distinguishable result (for example99,
invalid if reread) while keeping the entry config valid. Assert the appropriate
unchanged entry behavior and retain caller-owned mutation, not a private field.

The post-open TLS case replaces transportConfig.testCaPem with another view but
does not mutate the original backing bytes; replacement alone cannot prove the
claimed copied-byte-content guarantee. Use a separate test-owned CA view passed
to the facade and mutate that view in place, keeping independent pristine fixture
material for server/reopen. Repair these existing cases; no permutations or
additional broad fixture project.

## Evidence scope and next gate

The current post-await expiry gate exercises the PREDECESSOR; returned expiry is
covered by an already-expired response, not a live-returned deadline crossing a
later owner-validation await. State that scope honestly; do not label one proof
as the other. Coordinator production audit must also enforce actual final-commit
expiry placement. No additional expiry campaign is demanded at this gate.

QA may repair ONLY the existing three new s2 sources (small s2-prefixed helpers
only if actually necessary) and add follow-up QA evidence. Preserve r1/history,
existing S1/helpers and all other suites. Run scoped early syntax/lint/format/
source-only import resolution; report readiness then HOLD. Target/provider/HTTP/
Vitest/build/install remain CLOSED; no frozen relay. Original90min checkpoint/
120min safe stop still applies; if window exhausted report partial/blocked rather
than self-renew. No extra tests beyond discriminating or safely settling these
existing core checks are requested. Developer's revised readiness is separately
pending coordinator re-review; role-private findings remain separate.
S2/T06 incomplete, S3–S5 unassigned; no actual writes/live state/.pi/staging/commits.

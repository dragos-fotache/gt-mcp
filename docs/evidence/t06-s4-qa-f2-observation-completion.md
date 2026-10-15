# T06-S4 QA f2 observation completion — retrieval blocker report

**Status: BLOCKED — no complete original f2 output exists to retrieve.**
Execution stays CLOSED (30PASS/3FAIL retained, 202UNRUN). No repair, rerun,
diagnostic, source edit, or target import was performed. Original f2
evidence stays immutable; this supplement only records what retrieval
established and qualifies what it cannot.

## Retrieval attempts (existing-output search only)

1. Repository and run roots: no saved runner log exists in the repo; the
   QA-owned f2 run root was removed during relay cleanup (verified
   no-residue at the time), so no in-fixture log survives there.
2. Tool full-output persistence: the f2 vitest invocation piped stdout
   through in-shell `tail -n 25`, so the tool layer never truncated and
   never returned a saved full-output path; no such attachment exists for
   this run. A `/tmp` listing shows only unrelated pre-existing
   codemachine/packaging files and the pinned toolchain — no f2 runner
   output, no vitest log.
3. Retained completed result: the only surviving record is the captured
   tail already transcribed into `t06-s4-qa-f2-execution.md` (summary
   counts plus the complete [3/3] failure section).

## Blocker finding

The complete original output was never captured and no copy was
discarded-then-recoverable — it simply does not exist. The two missing
failed-case identities/oracles/observed errors therefore cannot be
identified from any existing artifact, and this report does NOT
reconstruct them from source inspection or rerun (both forbidden).

## Retained record (complete, sanitized)

- Command selection (exact relay, once): 3 S4 owning suites, 33 authored.
- Runner summary: exit 1; Test Files 1 passed / 2 failed; Tests 30 passed
  / 3 failed / 0 skipped / 0 todo; no timeouts/unhandled/cleanup failures.
- Fully observed failure [3/3]: `s4-refresh-retry` › "captures transport
  config at open against the owned loopback destination" —
  `AssertionError: expected '/v1/routines?limit=20' to be '/v1/routines'`
  (expected/actual URL strings only; no bodies/tokens/IDs/paths).
- Integrity: pre-run checksum OK + 284/284 rows; post-failure checksum OK
  + 284/284 rows; run roots removed with no residue.

## Qualifications to the original f2 evidence (preserved historically)

- The f2 evidence statement placing the staged cohort and delayed-401
  cases "among passes" is NOT supported by the retained tail and is
  withdrawn as unverified; their outcomes are unknown (they may be passing
  or be one/both of the uncharacterized failures).
- The "all four previously failing list-success paths now pass" inference
  (preflight, cohort, delayed, follower-abort) is likewise unverified and
  withdrawn; only the 30-pass aggregate count stands.
- The gate's independent source-level finding (two queryless retry
  filters in cohort/delayed cases, wrong under the always-serialize-limit
  contract) is acknowledged as a source observation only and is NOT
  labeled as either missing runtime failure.

## Handoff

Retrieval is exhausted and blocked as above. QA requests coordinator
adjudication on the available record (one fully observed oracle failure
plus aggregate counts) and, if needed, a new named artifact authorizing
fresh execution with complete output capture. QA holds all source/runtime
actions; no production fix is requested.

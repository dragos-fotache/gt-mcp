# T06-S4 QA repairs r3 — owned commit-deadline timer fix + readiness

**Status: REPAIRED, HOLD.** The single r3 timer defect is repaired
source-only; no execution performed; awaiting the final source gate. The
initial readiness report, r1/r2 reviews, and r1/r2 repair reports are
preserved historical. No frozen relay or execution grant; readiness is not
acceptance.

## Authority and boundaries

- Repair grant: `docs/evidence/t06-s4-coordinator-qa-source-review-r3.md`
  (sole remaining repair; no broad rewrite, new tests, or harness work).
- Read: the r3 review and own `s4-concurrency-fences` source. No other
  reads needed; NEVER read production sources/diffs, emitted JS/maps,
  private ADR, Developer reports/messages, or production reviews.
- Write scope: `test/fault/t06/s4-concurrency-fences.test.mjs` ONLY (one
  hunk) + this NEW evidence file. The other three S4 sources, all accepted
  sources, and all prior evidence are untouched.

## The fix

Held-ack case (`s4-concurrency-fences`, "holds a real owned success commit
unacknowledged…"): the bounded real-commit wait raced
`commitGate.awaitedCommits()` against `sleep(5000).then(throw)`, leaving the
losing five-second timer alive after prompt success. Replaced with the
local cancellable owned wait: settlement flags observed via
`gates.waitFor(() => commitSettled, 5000)`, whose single timer is cleared
on settle, body failure, or teardown release. The owned commit itself is
never terminated by the diagnostic bound (`allSettled` never rejects; both
flag handlers mark settlement, so a rejected commit still proceeds to the
honest vault/retry/interruption oracles instead of hanging). Real commit
start + independent tracking, durable-while-held successor/pending-null
read, non-settlement/no-retry checks, abort-at-boundary, and
interruption-with-installed-state oracles are unchanged.

## Focused static checks (pinned toolchain)

Every command with explicitly exported disposable `T01_NODE_HOME` and
`PATH="$T01_NODE_HOME/bin:$PATH"` → Node v24.21.0, npm 11.19.0; no
ambient/system fallback.

1. `node --check test/fault/t06/s4-concurrency-fences.test.mjs` → CHECK-OK.
2. `./node_modules/.bin/eslint test/fault/t06/s4-concurrency-fences.test.mjs`
   → ESLINT-OK clean.
3. `./node_modules/.bin/prettier --check`
   `test/fault/t06/s4-concurrency-fences.test.mjs` + this report → clean.
4. Source-only import-resolution probe for the repaired file (parses `from`
   specifiers, stats relative paths, zero module loads) → OK (8
   specifiers; all QA-relative paths exist; `vitest` external; `dist/*`
   stat-only relay targets, never imported/executed).

No suite, fixture, loopback, provider, build, or install execution was
performed. Source HELD for the final source gate.

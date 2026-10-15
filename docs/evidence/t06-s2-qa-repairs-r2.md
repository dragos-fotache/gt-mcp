# T06-S2 QA r2 repair follow-up — revised source-ready

**Status: REVISED SOURCE-READY, HOLD.** This file follows the retained
initial readiness report (`t06-s2-qa-source-ready.md`) and r1 follow-up
(`t06-s2-qa-repairs-r1.md`, both preserved unmodified) and answers the
coordinator r2 review (`t06-s2-coordinator-qa-source-review-r2.md`) plus the
PUBLIC safety clarification on clock-ordered cancellation at commit
boundaries. Only the three original `s2-` sources were repaired in place; no
new helper files, no S1/test/helper edits, no dependency/script/config
changes, no suite expansion (one clarification-driven boundary case added, no
campaign). No compiled-target, provider, HTTP, suite, build, or install
execution; no frozen relay. Readiness is not acceptance.

## Repair mapping (r2 R2-1–R2-3 + clarification)

- R2-1 (gate entry before no-dispatch): the durable commit-gate adapter now
  exposes entry observation (`hasEntered`) and snapshots the held commit
  argument bytes at entry. The ordering case waits for real entry with a
  bounded wait, parses the held snapshot (version/binding/pending), performs
  the bounded no-dispatch observation only then, and compares the later
  request to that PRE-release snapshot (plus stored-bytes equality). A slow
  or unentered setup can no longer pass vacuously.
- R2-2 (release everything on every path): the retention harness keeps a
  release registry; storage gates register at construction and all registered
  releases run before owned-work settlement and owner close. Both commit-gate
  adapters track the real `owner.commit` promise immediately and
  independently of the public promise, so rejections are always observed. The
  harness assigns the current profile box immediately after each successful
  provision/open, so a later setup failure still leaves the live holder
  owned. The durable gate case holds its release control outside the body try
  and releases before settlement on all paths.
- R2-3 (discriminating copy): the pre-first-await case now mutates nested
  budgets to the invalid value 99 — a shallow reread would fail observably
  with a safe TransportError, while deep capture opens unchanged (caller
  mutations intact). The post-open TLS case passes a separate test-owned CA
  view and destroys it IN PLACE (`fill(0)`); the pristine fixture stays
  reserved for the server and reopened facades.
- Clarification (clock-ordered cancellation): one representative case arms the
  trusted epoch clock to abort the rotation signal synchronously, so the
  final abort/local-fence check after the clock callback prevents the prepare
  commit entirely — no commit, no dispatch, bytes unchanged — and a
  fresh-signal retry on the same facade then succeeds (caller abort fences
  nothing). No callback permutations or interception built.

## Honest scope labels (no expiry campaign added)

- The post-await expiry gate exercises the PREDECESSOR (live deadline
  crossed during awaited owner validation).
- Returned-expiry is covered by an ALREADY-EXPIRED returned grant
  (`reauthentication_required`, pending retained, nothing installed), not by
  a live-returned deadline crossing a later await. Stated as such; final
  expiry placement remains coordinator-audited per the review.

## Corrected counts (no results invented)

- Revised totals: 23 unit + 5 durability + 12 concurrency/retention = 40
  `it`s (39 at r1 + 1 clock-boundary case). Source counts, not results.

## Reused fixtures

Accepted T04 diagnostic facility, T05 loopback TLS helpers/fixtures, S1 entry
for bound-owner setup, local pass-through adapters only. Teardown propagates
first failures via `teardownAll` without masking body errors; no forced
termination or unbounded waits.

## Exact commands and results (checked toolchain)

Provisioned disposable `T01_NODE_HOME` with `PATH="$T01_NODE_HOME/bin:$PATH"`:
Node v24.21.0, npm v11.19.0 (confirmed; coordinator supplies the location
privately, not persisted here).

1. `node --check` on all three repaired files → CHECK-OK × 3.
2. Scoped ESLint on all three repaired files → clean.
3. Scoped Prettier `--write` then `--check` on all three repaired files →
   all use Prettier code style.
4. Source-only import-resolution probe (parses specifiers, stats relative
   paths, never imports compiled target JS): all relative imports resolve;
   all `dist/` specifiers match the S1-accepted pattern; `vitest` only
   otherwise → IMPORT-RESOLUTION-OK.

NOT run (CLOSED until named reviewed frozen relay): Vitest, builds,
typecheck-as-acceptance, any target/provider/HTTP execution, install.

## Changed paths (repair window only)

- EDIT `test/unit/t06/s2-version-expiry-validation.test.mjs` (23 cases)
- EDIT `test/fault/t06/s2-durable-dispatch.test.mjs` (4 → 5 cases + gate snapshot)
- EDIT `test/fault/t06/s2-concurrency-retention.test.mjs` (12 cases + release registry)
- ADD `docs/evidence/t06-s2-qa-repairs-r2.md` (this file)

All prior QA evidence and reviews preserved unmodified.

## Readiness and HOLD

Revised QA sources complete; role-scoped checks green. **HOLD all owned
source/build actions and all execution pending coordinator re-review and a
named frozen relay.** No new blockers. No S3–S5, actual writes, live services,
`.pi`/settings changes, staging, commits, or automatic renewal. Checkpoint/
stop limits observed; no time pressure asserted at this milestone.

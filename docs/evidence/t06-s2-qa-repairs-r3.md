# T06-S2 QA r3 repair follow-up — revised source-ready

**Status: REVISED SOURCE-READY, HOLD.** This file follows the retained
initial, r1, and r2 QA reports and answers the coordinator r3 review
(`t06-s2-coordinator-qa-source-review-r3.md`). One assertion/read was added
to the EXISTING durable ordering case plus honest clock-scope comments; no
new tests, helpers, or campaign. All histories and S1 sources preserved
unmodified. No compiled-target, provider, HTTP, suite, build, or install
execution; no frozen relay. Readiness is not acceptance.

## Repair mapping (r3)

- Durable-before-dispatch observation: while prepare completion remains held,
  the ordering case now reads the actual T04 owner vault BEFORE releasing the
  gate and requires byte equality with the captured argument snapshot. That
  real read queues behind the actual commit (establishing its completion)
  while the held adapter promise still blocks dispatch; the existing bounded
  no-dispatch observation, release, and exact later-request comparison then
  carry the intended durable-before-dispatch oracle.
- Clock-case scope: comments now state the armed clock proves a
  representative synchronous clock-triggered abort (no write, no dispatch,
  same-facade retry succeeds) and does NOT independently pin the final
  post-serialization callback site, which production source audit verifies.
  No quota, timing gate, or permutation added.

## Counts and scope

- Unchanged: 23 unit + 5 durability + 12 concurrency/retention = 40 `it`s
  (source counts, not results). No extra tests beyond the r3 observation.

## Exact commands and results (checked toolchain)

Provisioned disposable `T01_NODE_HOME` with `PATH="$T01_NODE_HOME/bin:$PATH"`:
Node v24.21.0, npm v11.19.0 (confirmed; coordinator supplies the location
privately, not persisted here).

1. `node --check` on all three s2 files → CHECK-OK × 3.
2. Scoped ESLint on all three s2 files → clean.
3. Scoped Prettier `--write` then `--check` on all three s2 files → all use
   Prettier code style.
4. Source-only import-resolution probe (parses specifiers, stats relative
   paths, never imports compiled target JS) → unchanged OK.

NOT run (CLOSED until named reviewed frozen relay): Vitest, builds,
typecheck-as-acceptance, any target/provider/HTTP execution, install.

## Changed paths (repair window only)

- EDIT `test/fault/t06/s2-durable-dispatch.test.mjs` (ordering-case durable
  read + honest comments)
- ADD `docs/evidence/t06-s2-qa-repairs-r3.md` (this file)

## Readiness and HOLD

Revised QA sources complete; role-scoped checks green. **HOLD all owned
source/build actions and all execution pending coordinator source approval
and a named frozen relay.** No new blockers. No S3–S5, actual writes, live
services, `.pi`/settings changes, staging, commits, or automatic renewal.
Checkpoint/stop limits observed; no time pressure asserted at this milestone.

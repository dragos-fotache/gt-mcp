# T21-S4 review — accepted/closed

2026-10-17. The user assigned “do s4 too”. The primary agent implemented, tested
and reviewed the [work order](../tasks/t21-s4-work-order.md) against the
[successor specification](../decisions/t21-single-record-storage-spec.md).
S1–S4 are closed; S5 is ready/unassigned and S6 held. This accepts the source slice,
not the parent task, a delivered package or independent release review.

## Delivered behavior

The production storage entry now uses the single encrypted credential record.
Config2 retains trusted origin, profile selection, provider access, budgets and
strict writesEnabled:false default; it rejects config1 and removed selectors.
Runtime obtains account/session binding from the authenticated record. Explicit
setup creates a fresh exclusive root, never migrates or resets an existing root.
Old config/profile refusal sends no backend request and preserves old files/keys.

Login installs account/session binding and vault together. Foreground version4
exchange state, exact-byte retry/send reservations, nonce/account/origin validation,
cancellation and deadlines remain. Recover validates current encrypted auth state;
pending foreground login needs explicit resume/cancel. It publishes no descriptor
and resumes no creation. Auth vault1–3 and refresh implementation stay unchanged;
adapted full auth tests retain original token/body/key recovery, generation and
result-delivery fences. Sign-out clears grants under exclusive ownership. Automatic
account cleanup retains fresh matching proof authority and actual owner/binding
revalidation. Explicit key-first removal can finish interrupted cleanup even when
normal open fails; it leaves the root/owner.lock and refuses unknown contents.

Detached operation/journal, anchor engine, descriptor publication, removal receipts
and obsolete CLI retirement/reconcile commands are removed. No filesystem type
gate remains. The separate diagnostic facility uses issued synthetic fixtures,
inode/capability checks and the same credential/lock implementation. Production
always launches its fixed real-provider worker; config and requests cannot select
diagnostic providers. The worker reserves a bounded reply margin within the parent
deadline, fixing a connected silent-provider race without extending HTTP budgets.

Operator guides and the example config describe fresh setup, manual inspection of
uncertain creations, auth recovery and restore limits. Historical R1/Pi packaging
procedures are identified as historical until S5/S6 refresh their boundaries.

## Verification

**808/808 checks across 81 files**, zero failures/skips/pending/todo: main791 in79
files, real storage16 and terminal locked-provider cleanup1. All three runs have
the same569 hashes, including176 compiled outputs, and those hashes match the
closed target. [Main inventory](t21-s4-main-inventory.json),
[storage](t21-s4-storage-inventory.json), [locked provider](t21-s4-cleanup-inventory.json),
[exact selection](t21-s4-selection.json), [environment](t21-s4-environment.json).
The final selection includes all active storage/auth/login/lifecycle owning suites,
foundation/domain/read/create/runtime/protocol/CLI/actual SDK regressions. It is
not an unfiltered whole-project npm test or S5 backend/Pi qualification.

Production type/lint/format, scoped test lint/format and explicit clean build pass;
[static checks](t21-s4-static-checks.json). No build/install overlapped execution.
Actual isolated Secret Service/ext4/HTTPS and subprocess tests verify login/restart/
reads, pending refresh, account-proof/cancellation fences, interrupted replacement/
removal and provider failures. Private providers/buses exited and owned roots were
removed in every final run; [cleanup](t21-s4-cleanup.json).

Development failures remain recorded in [execution history](t21-s4-execution-history.json):

- Initial auth smoke52/55 exposed obsolete operation API assertions. After scoped
  adaptation235/236 passed; the remaining old PREPARED-anchor expectation was
  replaced by authenticated reopen of the atomically advanced, empty-grant state.
  Auth case counts were preserved. An overbroad intermediate adaptation was
  discarded from original copies before proceeding; no acceptance uses it.
- Integration200/212 exposed stale fixture selectors, config positive controls
  and the silent-provider reply race. Focused replay27/27 verified the repairs.
- First integrated run789/791 exposed two remaining creation tests expecting an
  operation-record list. They now check the actual credential file set after
  strict auth-vault validation; T10 also verifies identical encrypted credential
  bytes across two successful fresh calls. Final full replay791/791 passes.

Retired requirements are explicit: [path dispositions](t21-s4-retired-paths.json)
and [individual cases](t21-s4-retired-cases.json) map surviving safeguards to active
checks. No Vitest exclusions/skips were added. Old journal/anchor/descriptor tests
are historical, with assignment-start bytes preserved in the
[review-only source archive](t21-s4-retired-sources.tar.gz) and
[hash manifest](t21-s4-retired-source-manifest.json). This is not a delivery archive.

## Scope and remaining gates

[Assignment-start comparison](t21-s4-scope-comparison.json) separates this work
from the preexisting dirty tree. Shared/backend contracts, dependencies/lock,
compiler/test configuration, parked T02, companion and packaging scripts are
unchanged. No live credentials/backend, laptop operation, .pi edit, staging or
commit occurred. R1 was preserved outside clean build output and restored byte for
byte, SHA256 `ed5877dd16fc79043bc8773d3d15bb6fed2887dc891100ccebf8ddf2b3b22563`.

The user explicitly owns Btrfs testing: none was run or counted as passed, and it
is not an agent acceptance blocker. Required safe file operations still apply;
no arbitrary filesystem certification, power-loss proof or independent detection
of restored older encrypted snapshots is claimed. S5 owns isolated backend/Pi
scenario adaptation; S6 owns package closure, installed/clean reconstruction and
parent integrated acceptance. R1/laptop retain prior installed behavior. T19 and
independent T20 gates remain separate. [Handoff](../handoffs/t21-s4.md).

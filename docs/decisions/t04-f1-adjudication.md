# T04-f1 adjudication — three production fixes, two oracle corrections

**f1 execution closed, NOT accepted.** Owning unit53/54 and fault52/69;
foundation100/100 and T03221/221 PASS. No skipped/whole-suite/release pass.
No contract relaxation or shared-contract edit. Corrections below follow the
approved public storage specification; new production build requires a new relay.

- **F1 — production defect.** timeoutMs is optional, default5000. Omitted values
  incorrectly reject valid requests. Coordinator isolated public probe confirms:
  identical absent-root request with timeout omitted => invalid_argument; explicit
  5000 => expected not_provisioned. Origin and valid Unix bus syntax are not the
  cause. Repair optional default handling before testing filesystem/provider gates.
  Failure log actually contains9 provider +2 filesystem failures (=11), not the
  initially reported8+2. Preserve the initial evidence and correct tally.
- **F2 — production defect.** Actual kernel conflict exit73 must reliably return
  locked_by_other_owner for initial open/provision, regardless of exit/IPC event
  timing. No unknown outcome or invalid lease proof occurred merely because an
  existing owner excluded a contender. Repair first-reply/exit classification.
- **F3 — oracle correction.** A live holder can retain a VALID inherited kernel
  lease while its pathname is replaced/deleted. This is distinct from missing/
  invalid inherited lease proof. Specific existing rules apply: replaced stable
  lock identity => fence_mismatch; missing external lock pathname => anchor_missing.
  Both deny data/writes and close must release. Invalid inherited proof still
  commit_ambiguous; actual kernel conflict73 still locked_by_other_owner. Correct
  only these two oracle cases; do not weaken exclusion/fence/cleanup assertions.
- **F4 — oracle correction, not proved reaping defect.** fs.rename occurrence1
  throws BEFORE the attempted PREPARED anchor rename syscall. The current anchor
  remains authentically COMMITTED old state; the current handle conservatively
  fences commit_ambiguous because an anchor-write attempt began. After close,
  explicit reopen legitimately succeeds with exact OLD current bytes (no previous
  manifest fallback). Coordinator independently reproduced that sequence and clean
  close/cleanup. The failed rejection oracle discarded the unexpectedly successful
  reopened handle; cleanup contention then masked the assertion. Retain a separate
  durable-PREPARED failure oracle; split this pre-publication case and always close
  any acquired handle even if an expectation fails. No unconditional PREPARED state
  may be inferred from an unexecuted rename.
- **F5 — observation, no demonstrated target import effect.** Final import tests
  pass; unconnected zero-byte stdio/harness objects alone are not evidence that the
  target connected/listened or allocated a network resource. Exclude only identified
  Node stdio/harness baseline/pure JS objects through calibration. Actual target
  network FD/connect/listen, timers, handlers or state IO still fail. No speculative
  lazy-allocation repair or blanket socket permission. Keep explicit attribution
  and probe gaps; source review continues at final acceptance.
- **F6 — keep io_failure oracle.** A structurally valid supplied absolute path with
  unsafe symlink is io_failure, not malformed-argument invalid_argument. Current
  rejection precedes path checks for the same omitted-timeout bug; rerun after F1.
  Do not change this oracle to conceal the earlier validation failure.
- **F7 — production defect.** Valid INCOMPLETE marker presence has priority over
  ordinary existing-state refusal on reprovision: incomplete_provision. Open is
  already correctly blocked. Without marker, existing protected state =>
  already_provisioned. Repair check ordering, no reinitialization/deletion.

Developer repair scope: current src/storage validation/client/IPC/engine and own
ADR as needed; no new dependencies/config/foundation/QA reads or self-target tests.
Pinned four production checks/build, new artifact-ready then hold. Other storage
sources remain unchanged unless necessary for these named fixes and reported.
QA scope: own evidence/counts, F3/F4 cases and leak-safe failed-expectation cleanup;
no production reads or target execution until a new frozen relay. Preserve f1
results/source-repair history. Coordinator verifies fixes and reproposes the exact
same full owning gates, not just previously failing tests. Actual writes disabled;
T04 remains in progress, no next task/staging/commits.

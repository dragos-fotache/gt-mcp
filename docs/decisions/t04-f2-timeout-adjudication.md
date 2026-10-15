# T04-f2 timeout adjudication — narrow production repair

f2 is CLOSED/not accepted pending one fix: unit54/54, fault68/69,
foundation100/100, T03221/221; QA lint/format/parse clean. Prior failures retained.

The existing explicit single-fault mapping governs: a valid Unix connection whose
provider never completes handshake/reply returns **provider_failure**, bounded by
the whole-call deadline. This is not a malformed request, local file failure or
actual competing kernel owner. Keep the independent oracle; do not change the
specification or add a generic io_failure exception to pass this case.

The failure precedes any new store commit/admission in the tested open path.
Uncertain storage commits still fence commit_ambiguous; actual kernel conflict73
still locked_by_other_owner. Ensure the primary timeout/provider diagnostic is
not replaced by secondary worker shutdown/exit races. Shutdown/reap the lease
holder before returning; preserve one whole-call budget and sanitized errors,
no interactive unlock/retry or caller-selected transport fallback.

Developer bounded repair: timeout/startup/provider classification only in relevant
src/storage client/IPC/D-Bus/holder modules plus own ADR if necessary. No dependency/
configuration/foundation/QA changes or self-run targets/providers. Repeat pinned
four production checks/build, artifact-ready and hold for focused coordinator
verification/new frozen full QA rerun. QA makes no oracle changes and holds target
execution. No acceptance/next task/actual writes/staging/commits.

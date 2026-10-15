# T06-S5 f1 adjudication — parent failed; Coordinator fixture repair only

**Disposition:** independent S5 owning30/30 PASS; parent857/859 FAIL (two T04
cases), no parent acceptance. Frozen f1 bytes/grants retained historically and
execution CLOSED. ALL production/QA source/static/build windows remain CLOSED.
No test assertion, contract or production repair authorized by this adjudication.

## Original observations and count calibration

QA complete f1 report records owning2files/30PASS and parent60files/857PASS+2FAIL,
zero skips/todos/unhandled, stable339hashes and owned cleanup. Initial source/relay
metadata29/858 is WRONG: static independent source count is11unit+19fault=30S5,
so complete active parent is859. Coordinator also missed the count in source gate.
Same exact source files/hashes/selection were executed; nothing added/dropped.
Do not rewrite f1 inventory/relay/readiness or retroactively call their29/858
expectations correct. QA continued to parent with a count-calibration discrepancy;
record it honestly, not hidden exclusion or permission for arbitrary scope drift.

QA's initial "environmental/consistent with unsafe relocation" interpretation was
a hypothesis, not adjudication. The blanket "no product code exercised by this QA
role" wording is inaccurate: permitted compiled PUBLIC entries were executed,
without production implementation reads. Only the tmpfs-prerequisite failing case
stopped before its production factory invocation. Preserve original failures and
add evidence clarification rather than erasing them.

## F1-1 tmpfs-denial prerequisite — confirmed launcher mismatch

Accepted T04 filesystem case requires its os.tmpdir() fixture parent to be tmpfs,
while production provider roots separately require T04_PROVIDER_PARENT on ext4.
Coordinator f1 launcher incorrectly put BOTH temp and provider roots on ext4;
case blocked at its own explicit guard. Shared T04 still denies tmpfs PRODUCTION
and permits diagnostic tmpfs; no code/test change warranted.

Repair: NEW owned tmpfs temporary root under /tmp for TMPDIR/TMP/TEMP, disjoint
from fresh ext4 HOME/XDG/run/provider-profile roots under /var/tmp. Keep explicit
private ext4 T04_PROVIDER_PARENT. No ambient temp/home/personal facility fallback.

## F1-2 relocated-root posture — confirmed Node copy/umask mismatch

Accepted T04 relocation oracle requires a SAFE copied0700 profile root so it
reaches authenticated anchor identity mismatch (fence_mismatch). Unsafe roots
correctly produce io_failure first. The unchanged test uses Node cpSync recursive.
Coordinator f1 launcher inherited umask0022. A NEW isolated Node24.21.0 metadata-
only copy experiment (no compiled production import) observes original directory
0700/copied0755, file0600; safe-root precondition is violated by that copy.
Under explicit umask0077, the SAME experiment yields copied0700/file0600.
Both owned synthetic experiment roots cleaned, no real payload/identity printed.

Repair: explicit umask0077 in private launcher AND inner control before fixture
creation/Node execution. Do not relax root permission guards or change the expected
fence_mismatch oracle. Source T04 root-posture precedence supports the diagnosis;
focused public integration still needs verification, not preclaimed success.

## Requalified private fixture and next gate

ONLY Coordinator private fixture scripts changed (not repo tests/production):
separate tmpfs temp/ext4 production roots + restrictive umask. Bash syntax PASS;
NEW env-i private-bus/provider51.1 unlocked persistent login collection synthetic
store/read/clear qualification PASS exit0; owned daemon/bus/roots cleaned.
Same previously SHA-verified provider/gcr archives, no OS/global install/settings.

NEW launcher SHA256:
9098ff72d9140f63d4d8d690704f74a4a5b627bf65fbb3d048fd49833ef7d222
NEW inner SHA256:
87f0ff35bd5a1c1b7fb5ff2a518303e43894d24bbea8f3345154c30dbe65b360

Issue NEW named f2 inventory/relay, same339f1 input hashes plus this adjudication
and f1 observations, source counts recalibrated30/859. Focused ONCE: FULL unchanged
T04 filesystem6 +provider9 suites (15cases). ONLY if focused allgreen/hash/cleanup
stable, run SAME complete60-suite parent859 ONCE. Parent includes all30S5 cases;
no need to duplicate separate already-green owning run after fixture-only repair.
No failed-case filters/contract weakening/source repair/extra diagnostics. Final
clean proof repeats f2 focused15+parent859 with same immutable inputs/provider
posture. Current checkpoint/STOP120 remains, no automatic renewal.

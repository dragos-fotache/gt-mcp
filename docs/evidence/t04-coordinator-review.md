# T04 coordinator acceptance — protected storage/exclusive ownership

**Result: PASS for bounded T04 only, on t04-f4.** Independent QA and separate
clean locked source-snapshot reproduction pass all444 scoped tests. No implemented
MCP server/config guard/authentication/journal orchestration, real backend/browser/
Pi/Android interoperability or release claim. Product writes remain disabled.

## Authority and independent roles

User authorized T04, Linux x64 Secret Service and fresh Developer/QA via Herdr.
Shared MCP draft0.2 working-tree policy revision over9a96dcb and backend v1 remain
unchanged. [Approved public spec](../decisions/t04-approved-storage-spec.md) governs.
Developer implemented production without QA reads; QA derived owning tests from
public specs without implementation/generated-content reads. Coordinator reviewed
both and relayed specification decisions. No shared contract changes to hide defects.

## Delivered boundary

- src/storage/16 TS modules -> dist/storage/index.js/.d.ts; six exact runtime
  exports: StorageError, isStorageError, provisionProfile, openProfile,
  MAX_STORE_BYTES, DIGEST_KEY_VERSION. Separate diagnostic facility and inert
  production/diagnostic worker artifacts. Root/foundation/server/CLI/companion
  sources and strict compiler/scripts unchanged; those entries remain inert.
- Protected Linux x64/ext4 roots: separate encrypted opaque vault/operations
  stores and disjoint encrypted external anchor; restrictive ownership/modes,
  path/type/link checks, file+directory-flushed transitions.
- OS-backed immutable master key through GNOME Secret Service, no plaintext/
  unavailable/locked/ambiguous fallback; exact encrypted-session protocol and
  per-call availability/identity recheck. Post-create uniqueness/read-back and
  owned plaintext wipe source-reviewed; no complete V8 erasure claim.
- Passed kernel flock lease, no-fork holder/process confinement, cross-process
  exclusion/crash cleanup, typed sanitized errors and frozen captures.
- Trusted pre-auth provisioning/one-way confirmed-account bind; atomic replacement
  vault+session generation; exact retained operation bytes/ciphertext; stable
  versioned keyed intent digest. Storage does not authenticate callers or establish
  backend grants; trusted upstream verification belongs to T06/T07.
- Current-only authenticated manifest; PREPARED/incomplete/missing/corrupt/version/
  foreign/restored-stale store state fails closed. No older-manifest fallback,
  reset/reconciliation/replay/retirement method or autonomous startup writes.
- 256MiB operational store budget, not a T03 domain/input cap. T09 must reserve
  admission/confirmation headroom; no expiry/eviction or automatic retirement.

## Exact accepted artifacts and checks

Node24.21.0/npm11.19.0; TypeScript5.9.3, Vitest4.1.11 and existing locked tooling.
Only new runtime dependency @homebridge/dbus-native0.7.8, exact approved integrity;
14 added package nodes, none removed, pre-existing locked nodes restored unchanged
(ip-address10.7.3). Compiler/config/foundation source scope hashes unchanged.
Provider fixture: portable SHA256-verified GNOME Keyring51.1/gcr3.41.2, private
D-Bus, env-i disposable HOME/XDG and ext4 parent, synthetic password stdin;
no personal bus/keyring/global install/GUI unlock.

Final t04-f4 aggregate inventory SHA256:
`4d8d28bd80cb0c9f6c23b2fa62faf8573e5444e966865d0822033b3c5cf59b51` (58 files).
Exact runtime inventory retained as coordinator /tmp/gt-mcp-t04-f4-inventory.json.
[Final relay](t04-f4-coordinator-relay.md) fixes target/ownership and safe commands.

Independent [QA final execution](t04-qa-f4-execution.md), all exit0/no skips:
T04 unit54/54, fault69/69 (including actual private production-provider positive/
negative cases), foundation100/100, T03221/221; scoped QA lint/format clean,
parse21/21. No whole-suite/parked-T02 scenarios.

Coordinator independently reproduced the SAME full suites and checks in a fresh
**136-file allowlisted source snapshot**, not a clone/release package:

- node/npm version pins; npm ci --ignore-scripts (346 installed,0 advisory entries,
  upstream node-domexception deprecation notice retained; no npm upgrade performed);
- typecheck, lint:production, format:check:production, build: PASS;
- T0454+69, foundation100, T03221:444/444 PASS;
- scoped QA lint and format checks: PASS;
- generated build bytes EXACTLY match f4; all snapshot/live source and lock hashes
  unchanged; disposable source/HOME/temp/npm cache and private provider fixtures
  removed. [Script](t04-clean-source-snapshot.py),
  [machine result](t04-clean-source-snapshot-result.json).

Final source-snapshot inventory SHA256:
`b4a77296f87feaa338786576b83a14df2ce33036033534ba6c44c46f6e92b427`.
Earlier f3 green snapshot retained separately; not overwritten into f4 acceptance.

## Initial failures, corrections and process limits retained

Initial planning/production/QA source reviews failed; c0 positive diagnostic failed
invalid_argument, errors writable/extra catalogue entry; unsupported source
assumptions, unsafe IPC/reaping/cleanup and unauthorized transitive bump repaired.
c1 cleanup orphan was detected, only the coordinator's verified owned descendant
removed; no-fork c2 corrected it. None counted as passes.

f1 unit53/54/fault52/69 and f2 unit54/54/fault68/69 remain historical failures.
[F1 adjudication](../decisions/t04-f1-adjudication.md) corrected optional-timeout,
conflict73 and marker-priority implementation defects and distinguished live-path
identity from inherited lease, and pre-publication old-COMMITTED reopen from
PREPARED. A missed marker-order fix failed coordinator reproduction again before
correction. [Timeout adjudication](../decisions/t04-f2-timeout-adjudication.md)
kept provider_failure oracle; worker/parent deadline race corrected. f3 green tests
then final manual source checklist closed key/ancestor safety omissions before f4.
QA source/lint/hook mistakes, duplicate stale rollback case and formatting repairs
remain reported in QA evidence, not silently changed into initial success.

Developer initial system-npm install and one out-of-grant compiled import remain
explicit process deviations in ADR, not retrospectively permitted. Final pin/lock/
source/runtime checks were independently reproduced. No QA implementation reads
or Developer QA reads reported; no automatic successor, staging/commits/.pi edits.

## Limits and integration handoff

Source review closes exact BigInt lease/root identities, safe integer generation/
UInt64 sequence overflow checks, euid/mode/link guards, fixed Secret Service master
label/namespace/collection and no production Unlock/Prompt paths. Foreign-UID and
literal counter-exhaustion mutation were not simulated as tests; they are source-
review observables, not skipped checks labelled passed.

Conditional fsync guarantee requires supported local ext4/storage honoring flushes;
process kills/provider restart are tested, NOT hardware power-loss or arbitrary
whole-machine rollback. Supported restore unit excludes the current external anchor
and immutable OS key; known unsupported restore/reinstall/transfer requires trusted
reconciliation. No OS sandbox or resistance to active same-UID adversaries/ptrace.
V8/native memory scrubbing incomplete; legacy1024-bit Secret Service DH is the
published local protocol, not Internet TLS/modern DH-strength certification.

Profile lifetime receipts/minimization/retirement/removal and actual refresh/login/
creation recovery are later owning tasks, not supplied by opaque storage. T09 uses
exact T03 identity bytes/digest version and immutable admitted request bytes;
T06/T07 use captured bindings and trusted confirmed grants. CLI/server coordination
is close owner then acquire, no live lock stealing/time/PID guessing.

T05 transport and T09 operation admission/journals are ready but UNASSIGNED; no
successor grant follows acceptance. T02 remains parked/incomplete, T13/T14 retired,
old sources/tests/evidence preserved. No actual backend writes, publication,
deployment, real credentials or staging/commits authorized.

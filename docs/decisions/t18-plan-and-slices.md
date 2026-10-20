# T18 — Runtime packaging: design and bounded development plan

**Original planning disposition (2026-10-16):** planning complete under the user's request to design,
plan and split T18 development if necessary. Primary Codex agent owns this
documentation-only assignment. Implementation is unassigned; S1 is ready for
separate assignment, S2/S3 are sequentially held. This plan opens no production/
test-source, install/build, fixture, publication, real-write or successor window.

The user subsequently assigned S1, paused after toolchain restoration, then
resumed on 2026-10-16. During S1 the user selected **extract-and-npm-ci only**,
omitting the tarball-as-dependency consumer route after pinned npm execution
proved transitive version drift. The supported contract below reflects that
decision; the original failed route remains in S1 evidence.

[S1 is now accepted/closed](../evidence/t18-s1-review.md), with
[handoff](../handoffs/t18-s1.md). The user subsequently assigned S2, now [accepted/closed](../evidence/t18-s2-review.md)
with [handoff](../handoffs/t18-s2.md). S3 and parent T18 are now [accepted/closed](../evidence/t18-s3-review.md), with
[handoff](../handoffs/t18-s3.md). Original planning/grant statements are historical; no automatic
successor or release.

## Outcome, authority and readiness

Deliver a locally installable, reproducible compiled server/trusted-CLI artifact
with safe configuration templates and complete installation, privacy, recovery
and upgrade instructions. T18 acceptance qualifies the package boundary; it does
not establish real backend, named-host, Google/browser or release readiness.

Authority, in order: shared MCP draft0.2
[authentication](../../shared-docs/docs/mcp-contract/authentication.md),
[creation/recovery](../../shared-docs/docs/mcp-contract/routine-creation.md),
[tools](../../shared-docs/docs/mcp-contract/tools.md) and
[scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md); unchanged
backend v1 [service protocol](../../shared-docs/docs/backend-contract/service-protocol.md);
accepted foundation [spec](t01-approved-foundation-spec.md)/
[ADR](t01-implementation-adr.md); accepted storage
[spec](t04-approved-storage-spec.md), [journal format](t09-journal-format.md),
[removal format](t12-removal-format.md); then local architecture,
[verification](../verification.md), [T18 task](../tasks/t18-packaging-operations.md)
and [proportional testing](proportional-testing-policy.md). No shared-contract
revision is proposed. Preserve baseline 9a96dcb and the approved draft0.2 changes.

Readiness is based on source/document inspection, without fresh behavioral runs:

- [T12 complete](../handoffs/t12-s4.md): trusted lifecycle, removal/reconciliation
  fences and disclosure flow accepted, including clean locked parent acceptance.
- [T15 complete](../handoffs/t15-s3.md): portable guarded creation and process
  recovery accepted, including clean locked replay. All T12/T15 grants are closed.
- Root `package.json` is private ESM version 0.0.0, with the pinned toolchain,
  three runtime dependencies and the preserved companion workspace/Pi dev pin.
  It has no distribution allowlist. `gymtracka-mcp-server` targets the delivered
  server; `gymtracka-mcp` still targets inert `dist/cli/index.js` instead of the
  delivered trusted `dist/cli/main.js`. The build chmod also targets the old CLI.
- Root compilation includes separate storage diagnostics. Production storage
  starts `dist/storage/holder.js` by a module-relative URL; copying only the two
  bins or relying only on static imports would omit required runtime artifacts.
- Existing server/login guides contain the core safety behavior, but use source
  build paths and links to development evidence rather than a standalone package
  installation/recovery journey.

Non-goals: publishing or selecting a public release/license, changing service/
Google deployment inputs, dependency upgrades, removing historical sources/tests,
rewriting root workspace/tooling policy, changing storage/auth/journal/intent/key
formats, a migration/reset facility, automatic continuation/retries, new config
keys/tools/flags, a watcher, a required companion, Docker/system services/global
installation, or certification of another OS/filesystem/host. T16/T17/T19/T20
remain separate. T02 stays parked, T13/T14 retired; T06 omissions, T04 restore/
erasure limits and all prior evidence remain recorded.

## Settled artifact and installation contract

### One supported candidate artifact

Produce a private local npm tarball, initially `gymtracka-mcp-0.0.0.tgz`, from a
new empty disposable staging directory. Keep root name/version/private/engine/
package-manager pins unchanged. Distinguish candidates by SHA-256 and sanitized
input inventory, not by the reused development version or a commit alone: current
accepted inputs include uncommitted files. Public versioning/publication requires
later explicit authorization. Never overwrite a different candidate under the
same path or operate on an arbitrary existing output tree.

Expose `npm run package:artifact -- --out <absolute empty output directory>` as
the developer packaging command. It consumes a just-built stable `dist` plus
explicit nonsecret inputs, stages and packs without install/build lifecycle hooks,
and produces the tarball and a sibling sanitized inventory/checksum report.
Run the clean build explicitly before this command; packaging must not silently
compile, fetch/update dependencies, inspect private state or publish. Missing
required inputs or unsupported files fail packaging. Root `npm pack` is not the
supported distribution procedure; the guide must identify the staging command.

The staged application manifest is a safe projection of root metadata, with only
the current exact runtime dependencies and these bins:

| Installed command | Target | Behavior |
| --- | --- | --- |
| `gymtracka-mcp-server` | `dist/protocol/server.js` | Existing seven-tool stdio server, optional `--config <absolute path>` only. |
| `gymtracka-mcp` | `dist/cli/main.js` | Existing trusted help/setup/login/recover/lifecycle commands and exit/signal behavior. |

Correct the root CLI bin and matching root-lock metadata to the same delivered
entry, and mark `dist/cli/main.js` executable in the build. Preserve the old inert
entry and its foundation tests in the source checkout. No public CLI behavior
changes beyond making the advertised command reach the already delivered CLI.

The staged manifest contains no workspaces, dev/peer dependencies on Pi,
permission registration, lifecycle scripts, credentials or live configuration.
No new library export/API compatibility promise is introduced by this CLI package.

### Locked dependencies and explicit contents

Include a standalone `npm-shrinkwrap.json` for the runtime application, derived
from the root lock's production dependency closure, preserving versions,
resolution URLs and integrity values. Root `package-lock.json` remains the single
dependency-resolution authority. Do not copy the workspace lock unchanged or
resolve a new transitive tree during packing. Validate the standalone lock with
the pinned npm; unexpected resolution drift or a required new dependency is a
stop condition. Choose the small derivation implementation in S1; no generalized
dependency graph framework is required.

This choice follows npm's [package contents rules](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#files)
and [application shrinkwrap guidance](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json/):
`package-lock.json` is excluded from npm tarballs, while shrinkwrap can travel with
the application. The published v11 docs currently show 11.21.0; these are design
references, not npm 11.19.0 execution evidence. S1 must verify the pinned behavior.

Stage only:

- The manifest/shrinkwrap and the reviewed production JS closure of the server,
  trusted CLI and required child/helper modules, explicitly including the storage
  holder. Preserve compiled bytes and module-relative layout; do not bundle or
  rewrite emitted JS. Inventory the closure, including module-relative worker
  paths. Exclude the inert foundation CLI and storage `test-facility`,
  `diag-worker`, `diag-support` artifacts; retain shared production helpers such
  as `faults.js` when actually required. No diagnostic-only files or declarations
  are shipped. Type declarations/source maps/source TS are not needed for the
  executable package.
- A package-specific README, installation/login/server/recovery operator guides,
  and config/login templates containing only placeholders. S1 may initially use
  the available operator text; S2 must finish the standalone document/link closure
  before parent acceptance. Do not ship the development README and its whole
  linked task/evidence/shared-docs tree by default.
- Any existing applicable project notice and required third-party notices for
  the shipped runtime dependencies, preserving their terms. Do not invent a
  project license or public distribution permission. A licensing ambiguity that
  affects distribution is escalated; private local artifact checks may continue.

Use explicit staging and a `files` allowlist, then inspect the actual archive,
not only npm's dry-run output or `.gitignore`. Exclude companion/experiments/Pi,
tests, diagnostics, source/build tools, `.git`, `.pi`, `.env`, `.npmrc`, private
config/descriptors/stores/keys, logs, evidence and `node_modules`. Installed
dependencies must contain no Pi/companion or dev tooling. No system Node, npm,
flock, browser or Secret Service is bundled. Record dependency licenses/identities
without claiming that an inventory or advisory scan is independent security review.

Archive paths must be relative and traversal-free, with no symlink/hardlink entries
or special files. Package-created directories/files must not be group/world
writable or carry special permission bits; only executable JS entries need execute
bits. npm-created bin symlinks in an isolated local consumer are expected and
distinct from archive links. Private config/store modes remain the accepted
0400/0600 and 0700 rules; installation never discovers or chmod-repairs them.

### Supported installation and configuration

Document the sole supported local route using pinned Node 24.21.0/npm 11.19.0:
extract the candidate into a fresh dedicated application directory and run
`npm ci --omit=dev --ignore-scripts` there. Launch the absolute installed
`dist/protocol/server.js` and `dist/cli/main.js` entries with pinned Node;
the executable JS entries also have shebangs/modes for direct invocation.
No global install, source compilation or registry npx download is required.
Dependencies need a registry/cache; this is not an offline/self-contained bundle.

The originally proposed local-consumer dependency route is explicitly omitted
by user decision during S1: pinned npm re-resolves some transitive versions instead
of respecting the tarball's shrinkwrap. Do not advertise or silently count that
route as supported. The observed failing check is retained in S1 evidence.

Use absolute installed bin/JS paths for ordinary host registration, with the
pinned Node on the host's launch PATH; CWD must not be the source repository.
No host-specific extension/settings are installed. Named Pi registration and
actual host modes remain T17 evidence.

Qualify the current production baseline only: Linux x64, supported local ext4,
available unlocked OS Secret Service on an explicitly supplied bus, and compatible
util-linux `flock` (ordinary flock(2), required argv support). Browser login also
needs the accepted desktop `/usr/bin/xdg-open` setup, registered fixed dual-loopback
port, public Google web-client audience and trusted HTTPS origin. Exact exercised
OS/provider/helper versions belong in evidence; provisioned fixtures are an
execution prerequisite, not inferred current availability.

All packaged JSON templates set `writesEnabled:false`; they are not runnable
deployment configs. No real IDs, origin, port, private path or bus is supplied.
Omission still means false, invalid selected configuration fails closed, and only
strict config-file true permits valid authenticated explicit creation. Include
the local-client trust disclosure next to enablement instructions. No CLI/env/
host metadata enables writes. Config/descriptor loading stays startup-only:
stop, await cleanup, update/configure or perform trusted lifecycle work, relaunch.
Never offer an enabled bundled example or generate binding identity manually.

## Upgrade and recovery contract

Install new executable/dependency trees separately from operator configuration,
encrypted profile roots, external anchor/fence roots and OS-backed keys. Stop and
await the existing owner, install/verify the candidate in a fresh application
directory, retain the same protected config/storage locations, then explicitly
launch the replacement. Do not run old/new owners together or delete/recreate
profiles to complete an upgrade. Executable replacement never migrates private
state, logs in, changes policy, rekeys or resumes unfinished routine creation.

T18 introduces no format change. Record supported config/descriptor v1, login
receipt/removal v1, GTMS2 envelope/anchor v1, operation-store/journal/receipt/
retirement v1, `gymtracka-create-intent-v1`, `gymtracka-digest-v1`, and existing
vault readers including v1/v2/v3 and the separately handled temporary trusted-login
exchange envelope v4 (normal server startup refuses it). Reuse current validators and rejection paths;
the guide must not imply that every future format or downgrade is compatible.

Prove replacement from a frozen current pre-T18 candidate to the packaged candidate
on the same isolated profile. Seed unresolved dispatched work plus a settled
receipt, stop/release the old owner, replace only the executable tree, then show:
startup dispatches nothing; false policy blocks creation; an explicit enabled
identical retry preserves operation/root IDs, keyed intent, step keys and exact
method/route/body bytes; a retained receipt remains authoritative. Verify durable
identity independently of the returned MCP message using the existing fixture's
request observations and protected storage access. Ciphertext may legitimately
change during normal commits; compare immutable logical evidence, not all disk
bytes after a successful replay. Also check no private-byte changes during a
no-call replacement/start/stop with a live, nonrefreshing session.

This is same-format artifact replacement evidence, not an invented historical
released-version migration matrix. Freeze selected baseline inputs before S1
metadata edits if needed; if a trustworthy pre-change target cannot be reproduced,
record the missing proof and keep the affected acceptance item open.

A representative future-version store/journal, corrupt/missing evidence and lost
key must retain existing fail-closed/no-reset behavior. Check relevant validators
with existing focused tests and at least one incompatible-state refusal through
the installed candidate. Do not add a recovery bypass or copy old-format bytes
into a new record. Known stale store-only restore under the current anchor is
fenced; whole-state/anchor/key rollback cannot be automatically inferred. Backup,
transfer, reinstall-with-lost-state and downgrade are unsupported without bounded
trusted reconciliation; do not advertise private state as part of the package.

The operator guide must connect symptoms to the existing trusted action: safe
config/provider repair, explicit identical operation retry, same-account login,
recorded-transition `recover`, sign-out, confirmed retirement, confirmed profile
removal, or reconciled fresh setup only after remote reconciliation. Explain
partial remote drafts, no rollback/delete promise, profile-lifetime compact
receipts, indefinite unresolved retention, sign-out preservation, loss of replay
after removal/lost state, no background cleanup/offline remote wipe, and separate
host-transcript/runtime/media/backup retention. Safe diagnostics never request
pasted tokens or raw profiles/bodies.

## Three sequential development slices

Three slices separate the distribution/dependency boundary, operator safety
contract, and installed-state acceptance. Target 60–90 minutes per window;
checkpoint at 90 minutes, stop at two hours with an honest handoff. These are
working limits, not completion promises. No automatic slice succession.

| Slice | Reviewable outcome | Scope and acceptance boundary |
| --- | --- | --- |
| **S1 — Locked runtime artifact and delivered bins** | Minimal local tarball, safe manifest/runtime lock, explicit JS/worker closure, corrected CLI bin/executable modes, sanitized inventory and actual fresh-install smoke. | `packaging/`, a small `scripts/` packer, `package.json`, root-lock metadata, build/format/lint path additions only as needed, `test/packaging/` artifact/install checks, packaging notes. Preserve old source/workspaces/dependency pins and existing foundation tests. Verify archive contents/modes, locked runtime tree without Pi/dev tooling, installed executable CLI help, unconfigured official MCP initialization/seven tools/safe calls/EOF from unrelated CWD, and packaged holder resolution on an isolated profile. S1 does not finish upgrade/parent acceptance. |
| **S2 — Standalone operator guides and safe templates** | Complete installation/setup/privacy/recovery/upgrade journey delivered in the artifact, linked from repository entry guides. | `packaging/README.md`, placeholder examples, `docs/installation.md`, `docs/recovery.md`, existing `docs/login.md`/`docs/stdio-server.md`, README and status/compatibility notes; small packaging document checks. Validate local link closure, false templates and accepted schema keys/defaults/budget ranges against authoritative specs. Repack and smoke only the changed document/template boundary; do not repeat all S1 behavioral checks. No new CLI/config semantics. |
| **S3 — Installed recovery and clean parent acceptance** | Same-format replacement/explicit recovery, installed incompatible-state fencing, complete active T18 suite plus relevant regressions on workspace and clean locked reconstruction. | `test/packaging/`, narrowly shared existing fixture extensions, sanitized evidence/handoff/status docs and demonstrated packaging integration repairs. Run the frozen-baseline-to-candidate journey above; finish artifact/privacy/mode audit and standalone guide walkthrough. Record source/runtime-lock/archive identities and cleanup. Only this slice can close parent T18. |

Record a short slice work order with exact edit/command/fixture grants before each
implementation assignment. Settled interfaces above are shared across slices;
implementation details remain the primary agent's choice. One editor owns shared
manifests/lock/config at a time. Production changes outside bin/build/packaging
metadata need a demonstrated integration defect and recorded scope before edits;
new public behavior, format changes or shared-contract conflicts require user
resolution.

Only S3's actual acceptance can mark the T18 packaging checklist item complete.
Keep broader compatibility/scenario rows pending wherever T16/T17/T19 evidence is
still required, and leave T20 independent review/go-no-go open. Primary-agent
package review is identified as such, not independent release certification.

## Proportional verification, environment and stopping conditions

Use a small artifact inventory/lock check and actual installed-process journeys.
The risk is accidentally shipping private/parked material, resolving a different
runtime tree, leaving an inert/broken bin or missing worker, or resetting retained
identity during replacement. Add synthetic forbidden-file canaries only in a
disposable source snapshot, never actual private material. A few real boundary
checks are sufficient; do not build a generalized packaging/fault harness or
retest every accepted engine failure through npm.

Reuse `test/create-stdio/` SDK process/isolated runner patterns, T08 production
provider/ext4/HTTPS fixtures, T12 lifecycle helpers and T04/T09 format/restore
oracles. Allow a narrow explicit installed-entry parameter in test helpers only;
no production environment switch or diagnostic module in the artifact. Ensure
packaged subjects resolve their own installed dependencies/worker paths, without
repo-relative fallback, NODE_PATH, test preloads or diagnostic-provider substitution.
The SDK client/oracle can remain in the source test runner.

Final regression floor: full active `test/packaging/`; complete foundation
(required for package/bin changes); full `test/stdio-server/` and
`test/create-stdio/`; trusted CLI boundaries/integration and T12 lifecycle flow/
disclosure checks; existing focused T04 envelope/restore/key and T09 record-format
checks relevant to incompatibility claims. Fix exact active files/helpers in the
work order before execution and add only demonstrated affected regressions.
Preserve historical foundation entry checks; do not rename them into tests of the
new bin or silently omit parked/failing tests and claim a whole-repository pass.
T02 experiment checks stay explicitly deferred, not passed. Full unrelated engine
fault suites and T16/T17/T19/T20 external evidence are outside this task.

Future execution uses provisioned `T01_NODE_HOME` and verifies Node 24.21.0/npm
11.19.0 before any Node/npm command. **Planning observation:** the variable was
unset; the initial version probe reached ambient Node 26.11.1/npm 12.2.0. No
install/build/behavioral checks ran. Reprovision or restore the approved disposable
toolchain before S1; do not use the ambient versions or change system Node/Pi.
Requalify the isolated private provider, ext4 and TLS fixtures before fixture work;
none of their prior disposable availability is assumed today.

Planned source checks: `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`; scoped syntax/lint/format/import
checks for packaging/test helpers early; `npm exec -- vitest run <exact active
files>` within the qualified isolated runner. Artifact commands include the
documented packaging command, `npm pack --ignore-scripts --json` in staging, and
the isolated extract-and-ci route above. Generate/validate the runtime shrinkwrap
without upgrading the root resolved dependency closure. Do not use `npm run check`
as an unspecified whole-repository substitute for the declared active selection.

At final acceptance reconstruct from an exact sanitized source-input snapshot,
including needed uncommitted files; `npm ci --ignore-scripts`, four production
checks, rebuild/repack, fresh package install and complete active replay. Compare
runtime-lock/emitted/package-content bytes and modes, record archive hashes and
explain any archive-container metadata variation rather than assert unsupported
byte-identical tarballs. No build/install/pack mutation may overlap tests using
its target. Record actual results, failures/repairs, versions, stable hashes,
artifact contents/install commands, limits and owned cleanup in review/handoff.

Stop affected work for a normative conflict, changed public behavior or format,
dependency drift/new dependency/compiler relaxation, missing isolated/toolchain
facility, unsafe private-state ownership, unprovable baseline, generalized harness
need or the time limit. Continue unrelated authorized work and report the exact
blocker with placeholders. No credentials/private paths/raw bodies in evidence,
ambient personal services, global installs, `.pi` changes, staging/commits,
publication, deployment, real write enablement or successor execution.

Planning found no shared-contract conflict requiring a new product decision.
The selected delivery mechanism and same-format replacement boundary are local
design choices for review. S1/S2 have subsequently been accepted/closed; S3/parent acceptance is complete as recorded in the linked S3 review;
all T18 grants are closed.

Planning validation: local references in this plan/task and the new status links
resolve; scoped `git diff --check` passed. These are documentation checks, not
package, behavioral, upgrade or release acceptance. No production/test sources,
manifests/locks, shared contracts, `.pi` or prior evidence were changed by this
planning assignment.

## Final T18 disposition — 2026-10-16

S3 and parent T18 accepted: full runtime/initial-document261/261 in31 files on
workspace and clean; final documentation-only closure14/14 in5 files on both,
with404 identical source inputs,194 identical emitted outputs and byte-identical
final archive. Original failures, snapshot-input repair and report-order correction
are retained in [review](../evidence/t18-s3-review.md). The user resolved the T15
startup wording conflict in favor of local operation validation without dispatch,
write or continuation; existing decoder and failure cleanup implement that repair.
No shared contract/format/dependency change or external/independent certification.
All S1/S2/S3 grants close; no successor/release/real enablement.

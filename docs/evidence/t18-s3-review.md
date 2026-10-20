# T18-S3 — Installed recovery and parent acceptance

**Disposition:** accepted/closed on 2026-10-16; parent T18 complete.
[Work order](../tasks/t18-s3-work-order.md),
[settled plan](../decisions/t18-plan-and-slices.md),
[active selection](t18-s3-selection.json).

## Findings and authorized repair

The frozen 388-input pre-T18 source baseline matches its recorded SHA256 inventory;
separate locked reconstruction and build passed, producing 194 outputs identical
to the initial S3 workspace build. Initial actual installed replacement/recovery
passed: retained receipt, unresolved populate, inert/no-call replacement, disabled
policy and identical enabled retry; protected storage and HTTPS observations
independently verified identity/exact bytes.

Initial incompatible-store test returned recovery_unavailable on explicit call,
after one authorized live-access GET. Its original no-traffic-after-call assertion
was overstrict and failed; retained in /tmp/gt-t18-s3-focused results. This was not
counted as a pass or concealed. That observation also exposed a separate real
startup-validation gap: shared creation contract requires version/key validation
at startup, while the original accepted T15 plan forbade reading unfinished work.

The user explicitly resolved this in favor of local startup validation and
approved the narrow T18-S3 repair. The configured tool/server opener now locally
validates operation evidence using the existing T09 decoder regardless of write
policy; never-bound profiles require empty operation bytes. It sends no requests,
changes no private bytes and resumes nothing. The separate read-only opener and
repository admission/auth/dispatch/retry behavior remain unchanged. T15 plan is
aligned; shared contracts/formats/dependencies are unchanged. Installed regression
covers future store/journal versions, invalid step keys, never-bound nonempty
state and encrypted-envelope refusal, including fixed diagnostics and lease
release. Final acceptance and clean reconstruction results follow.

## Integrated acceptance and final package

Full active runtime/initial-document selection: **261/261 in 31 files** on both
workspace and clean locked reconstruction: **12 packaging-owning +249 relevant
regressions**, zero failed/skipped/pending/todo. Complete foundation, stdio-server,
create-stdio and packaging suites plus selected CLI, lifecycle, format/key/restore,
T15 factory/runtime and unchanged read-only startup regressions passed. The exact
selection and per-file results are in the [acceptance inventory](t18-s3-artifact-inventory.json).

The first clean replay was260/261: the snapshot omitted the approved transport
specification read by the S2 document-budget oracle. Added that unchanged source
input using its independently recorded S2 SHA256; changed no product or assertion.
The corrected full replay passed261/261. Its wrapper then exited1 because result
arrays had different ordering. Comparison by filename confirms identical counts
and statuses; the [runtime clean record](t18-s3-runtime-clean-reproduction.json)
preserves that distinction. No long-suite rerun or failing-test exclusion was used
to repair report aggregation. Original failures remain recorded.

Final standalone-document review found three S2 texts still describing S3 as
pending. Replaced those temporary status statements with lasting same-format,
exact-candidate-evidence and external-certification limits. The corresponding
document oracle now asserts those requirements instead of historical pending
status. The final archive changes only README.md, docs/recovery.md and
docs/stdio-server.md relative to the fully replayed runtime candidate. Every
executable byte/mode, dependency/lock, manifest, template and other test is unchanged.

Per proportional testing, final document-only closure ran the **full active
packaging suite plus T12 disclosures:14/14 in5 files**, on workspace and a new
clean locked reconstruction, zero failed/skipped/pending/todo. This includes the
installed replacement/refusal checks again. The preceding261-check full runtime
results are preserved, not presented as a new full replay after the prose edit.
[Final closure selection](t18-s3-doc-closure-selection.json),
[clean reconstruction](t18-s3-clean-reproduction.json).

The final clean reconstruction copied **404 source inputs**, reproduced **194
root/companion emitted outputs byte for byte**, matched package content/modes,
runtime dependency identities and selected input hashes, then verified every
copied input/output remained unchanged after replay. Both final archive SHA256s:
**10cd1fece716e22a6bc254dcbbc8f361f3472e9d0ab1cb22de27a1451c5e07e9**.
Workspace runner hashes599 files, clean runner597; the two extra workspace files
are parked T02 emitted artifacts, observed only and never executed/claimed passed.
The approved transport oracle is a separate verified snapshot input.

Final candidate: /tmp/gt-t18-s3-delivery-artifact/gymtracka-mcp-0.0.0.tgz .
[Package inventory](t18-s3-package-inventory.json): **96 files,86 production JS,
111 locked runtime dependencies**. Actual independent tar inspection confirms
relative unique traversal-free paths, bytes/modes equal to inventory, no links/
special files or unsafe permissions. Existing artifact tests prove private/
diagnostic canary exclusion, safe false templates, installed runtime lock,
executable trusted CLI, official SDK seven-tool surface and directly observed
EOF0. The original frozen runtime archive also passed a separate literal-archive
fresh extract/ci/CLI/raw-MCP/EOF walkthrough; its digest is identified separately
in the inventory, not confused with the final documentation archive.

## Source review, commands and environment

Primary-agent source review found the production repair confined to the tool-mode
startup branch in src/runtime/read.ts: read protected operation bytes, decode with
the already verified binding, reject nonempty never-bound state, and reuse existing
failure cleanup/diagnostics. The read-only opener stays unchanged. No new dependency,
format, exported API, configuration key, retry behavior or shared-contract edit.
Compared with the pre-T18 build, only read.js and its declaration comment change;
192 other emitted files remain byte-identical. Final clean reproduction matches all194.

Test changes: one three-check installed replacement/refusal file; explicit test-only
server-entry/CWD parameters; packaging/guide input hashing in the reused runner;
one document-oracle status correction. No generalized harness or engine campaign.
The existing decoder supplies version/binding/step-key validation; independent
old-process storage and actual HTTPS observations supply the retry oracle.

Pinned disposable Node24.21.0/npm11.19.0; TypeScript5.9.3, SDK1.32.1,
Vitest4.1.11, ESLint10.12.0, Prettier3.9.10. Arch Linux rolling x64, local ext4,
GNOME Keyring51.1, util-linux flock2.42.4 and OpenSSL3.6.5. Private bus/provider
qualification used actual libsecret store/read/clear and a fresh private HTTPS CA.
[Environment/provenance](t18-s3-environment.json). All grants/identities are synthetic.

After exporting the disposable T01_NODE_HOME and prepending its bin, actual checks:

```sh
node --check test/packaging/replacement-recovery.test.mjs
node --check test/create-stdio/helpers.mjs
node --check test/create-stdio/run.mjs
npm exec -- eslint test/packaging test/create-stdio/helpers.mjs test/create-stdio/run.mjs
npm exec -- prettier --check test/packaging test/create-stdio/helpers.mjs test/create-stdio/run.mjs
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
npm run package:artifact -- --out /tmp/gt-t18-s3-final-artifact
python3 test/create-stdio/run-isolated.py "$T01_NODE_HOME/bin/node" /tmp/gt-t18-s1-provider/usr/bin/gnome-keyring-daemon /tmp/gt-t18-s1-provider/usr/lib docs/evidence/t18-s3-selection.json /tmp/gt-t18-s3-final
python3 docs/evidence/t18-s3-clean-reproduction.py
npm run package:artifact -- --out /tmp/gt-t18-s3-delivery-artifact
python3 test/create-stdio/run-isolated.py "$T01_NODE_HOME/bin/node" /tmp/gt-t18-s1-provider/usr/bin/gnome-keyring-daemon /tmp/gt-t18-s1-provider/usr/lib docs/evidence/t18-s3-doc-closure-selection.json /tmp/gt-t18-s3-doc-closure
python3 docs/evidence/t18-s3-clean-reproduction.py --documents-only
```

The full clean command had the documented snapshot/report failures above; its
corrected suite passed261. Final documents-only clean command exited0. The script
now supports both modes with corrected input/per-file comparison. Scoped final
document syntax/lint/format and diff/reference checks pass. Locked reproduction
uses npm ci --ignore-scripts plus all four production checks; extracted applications
use npm ci --omit=dev --ignore-scripts. Never build/install against a running target.

All owned providers/buses/processes/private roots and clean source/application
snapshots were removed. Public tool/provider extractions, original pre-T18 source,
reconstructed old source target and explicitly identified candidate artifacts are
retained for pickup. S1/S2/S3 grants close here; parent T18 is accepted.

This is primary-agent package review, not T20 independent release certification.
T16 real backend/DB/Android, T17 named Pi, T19 real Google/browser and T20 remain
unassigned/unverified. No historical migration/downgrade, another OS/provider,
whole-repository pass, real enablement, publication/deployment, .pi/settings edit,
staging/commit or automatic successor. T02 remains parked, T13/T14 retired,
T06 historical omissions and T04 restore/erasure limitations persist.

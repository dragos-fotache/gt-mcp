# T18-S1 — Runtime artifact and delivered-bin acceptance

**Disposition:** accepted/closed on 2026-10-16; parent T18 incomplete. User assigned
S1, paused after toolchain restoration, then resumed with “ok continue”. The
[work order](../tasks/t18-s1-work-order.md),
[settled plan](../decisions/t18-plan-and-slices.md),
[13-file selection](t18-s1-selection.json),
[acceptance inventory](t18-s1-artifact-inventory.json) and
[package inventory](t18-s1-package-inventory.json) define the claim.

## Delivered boundary and evidence

`npm run package:artifact -- --out <absolute existing empty directory>` creates a
private local tarball and sanitized SHA256/content/mode/input/runtime-dependency
inventory. Explicit staging includes 86 reviewed production JS files, including
the module-relative lease holder, plus operator text/templates, runtime manifest/
shrinkwrap and original third-party notice terms: **94 archive files** total.
No companion/Pi, diagnostic entry, source/declarations, node_modules, private state
or logs are shipped. Synthetic forbidden-file canaries prove exclusion in a
disposable source snapshot; real archive member types, paths, bytes and modes are
checked independently with Python tarfile. Nonempty output is refused unchanged.
Validation precedes exclusive final publication; owned partial outputs are removed
on failure. Packing performs no build/install/product execution or publication.

The runtime shrinkwrap follows the three root runtime dependencies to **111 locked
nodes**, including required peers, preserving original versions/resolution URLs/
integrities. Filtering root dev flags would be incorrect because the preserved
workspace peer marks Pi runtime nodes non-dev. Root package-lock resolution records
are unchanged; its sole change is root CLI bin metadata. Source manifest bin/build
chmod now target delivered `dist/cli/main.js`. The old inert CLI and its tests,
companion workspace and Pi development pin remain intact. All **194 previously
accepted T15 emitted files remain byte-identical**; no product TS source changed.

The sole supported installation is extract into a fresh dedicated application
directory, then `npm ci --omit=dev --ignore-scripts`. Actual installed versions and
the source-authoritative lock are checked, with npm ls validating the runtime tree.
No receiving-machine compilation/global install or lifecycle hooks are needed.
Installed executable JS entries work from unrelated CWD. Official SDK negotiation,
exact seven tools and safe unconfigured responses pass; EOF0 is independently
observed with an owned deadline rather than inferred from SDK close fallback.

Actual installed CLI setup provisions an isolated profile through the production
Secret Service/holder path. The installed server returns signed-out errors, a
competing installed owner receives locked_by_other_owner, EOF0 settles release,
then an installed owner can reopen and the CLI completes confirmed local removal.
No enabled creation or real backend/Google/account is used in the new S1 checks.
Relevant existing CLI regressions use only synthetic private-CA HTTPS/provider
fixtures and controlled browser launchers, not actual Google/browser certification.

Final **152/152 PASS in 13 exact files**: **6 owning + 146 relevant regressions**,
zero failed/skipped/pending/todo. Complete foundation100, trusted CLI32, stdio14
and new packaging6. Four production checks and scoped syntax/lint/format checks
PASS. **817 selected source/input/output hashes** unchanged across final execution;
the legacy runner's narrower stable inventory is supplemented by the explicit
packaging/scripts/notice-metadata hashes. Owned provider/bus exit and private-root
cleanup PASS. Primary-agent review with bounded subagent test/source review is
identified accurately; this is not independent T20 certification.

## Installation decision, initial failures and repairs

The initial artifact suite passed4/5: tarball-as-dependency installation under
npm11.19 re-resolved @hono/node-server2.1.4→2.1.5, ip-address10.7.3→10.7.4 and
qs6.16.0→6.16.1. Extracted npm ci already preserved the exact tree. A bounded
disposable _hasShrinkwrap:true metadata spike did not fix consumer drift; pinned
npm's package-json normalization removes underscore attributes. Installed package
resolution and generated consumer lock confirmed drift rather than a placement
oracle error. No dependency pin was upgraded or expectation relaxed.

The primary agent held the affected route and asked the user; the user explicitly
selected **“Support extract-and-npm-ci only; omit the consumer install route”**.
The plan, package guidance and active tests reflect that decision. The unsupported
consumer helper/case was removed within this new S1 work; its original failure is
retained here/in the inventory, not counted as a pass or silently excluded.

Other initial issues were repaired: scoped lint required explicit Node Buffer/URL
imports; template filename grammar needed to accept .template.json; npm rejected
one shared user/global config file, so two distinct empty files are used; npm pack
omitted shrinkwrap until explicitly allowlisted. Review identified an unbounded
owned-child wait and possible tarball left after failed validation; both were
fixed and re-reviewed before final execution. A speculative test using a nested
package-lock filename to trigger late pack failure failed because npm includes
that nested file; the unsupported test assumption was removed, with the real
output-guard/canary tests retained. This was an oracle error, not a product defect.
No retained contract or safety assertion was weakened.

## Environment, exact commands and limits

Disposable Node24.21.0/npm11.19.0 was restored after SHA256 verification against
the official archive list. Archive digest:
fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6.
Source: https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz ;
checksums: https://nodejs.org/dist/v24.21.0/SHASUMS256.txt .
The initial sandbox DNS failure was followed by an approved download; no system
Node/npm installation changed. Actual versions match both pins. TypeScript5.9.3,
Vitest4.1.11, SDK1.32.1, ESLint10.12.0, Prettier3.9.10 remain unchanged.

Pinned GNOME Keyring1:51.1-1 and gcr3.41.2-2 were extracted under a disposable
directory. Archive digests matched the prior T15 provenance (8e6dc27e…b4de4 and
790e5564…b37d); provider binary SHA256 is
29cb44793218cbda04694fc11d6cdd8bac6cc69f2347be03e5c356c5455f9c00.
Same public package sources/complete hashes are recorded in
[prior environment provenance](t15-s3-environment.json), reused only for download
identity. Fresh private bus, unlocked collection, actual libsecret store/read/clear,
ext4 roots, synthetic grants/private CA and owned teardown were qualified again.
System helper util-linux flock2.42.4. No ambient secret provider was used.

Exact final commands, after exporting T01_NODE_HOME and prepending its bin:

```sh
node --check scripts/package-artifact.mjs
node --check test/packaging/helpers.mjs
node --check test/packaging/artifact-install.test.mjs
node --check test/packaging/holder.test.mjs
npm exec -- eslint scripts/package-artifact.mjs test/packaging
npm exec -- prettier --check scripts packaging test/packaging
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
npm run package:artifact -- --out /tmp/gt-t18-s1-final-artifact
python3 test/create-stdio/run-isolated.py "$T01_NODE_HOME/bin/node" /tmp/gt-t18-s1-provider/usr/bin/gnome-keyring-daemon /tmp/gt-t18-s1-provider/usr/lib docs/evidence/t18-s1-selection.json /tmp/gt-t18-s1-final
```

The isolated runner executes `vitest run` on the exact selection sequentially;
packaging tests execute real `npm ci --omit=dev --ignore-scripts` in fresh extracted
application roots. Source target did not race a build/install/pack mutation.
Candidate archive SHA256:
993a23ffbf7532c51057173c52bfd46e0f69e7983a2df0e3068b48c8fd57e65e.
Temporary failed/debug artifacts and all owned test fixtures were removed; only
the final public candidate, tools/provider extraction and source baseline remain
for pickup. No running fixture process remains.

The [prechange source inventory](t18-prechange-baseline.json) freezes 388 sanitized
inputs including needed uncommitted files for later S3 reproduction. This snapshot
has not been independently installed/built/replayed as an old upgrade target yet.
Clean parent reconstruction and same-format replacement/recovery are **S3 unrun**;
standalone guide/link closure is **S2 unfinished**. T02 remains parked, T13/T14
retired, T06 omissions/T04 restore limits unchanged; T16/T17/T19/T20 actual external/
independent gates remain open. No whole-repository pass, public release/license,
write enablement, .pi/settings change, staging/commit or automatic successor.

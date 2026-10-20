# T16-S7 — Android sync and integrated acceptance review

**Accepted/closed with parent T16 on2026-10-17.** Workspace and clean complete
owning46/46 pass;181 distinct relevant unchanged regressions pass, including the
complete final clean selection. Zero failed/skipped/pending/todo. All34 owned
scenario IDs and ordinary Android sync are reconciled with candidate/cleanup proof.
Primary-agent specification/source review; not independent T20 security/release
certification. [Work order](../tasks/t16-s7-work-order.md),
[scenario reconciliation](t16-s7-scenario-reconciliation.md),
[handoff](../handoffs/t16-s7.md). All S1–S7 grants and parent T16 are closed.

## Actual Android outcome

The [final replay native result](t16-s7-native-results.json) passes exactly one actual
instrumentation case on a fresh owned API37 x86_64 emulator. Android establishes
an empty routine baseline via actual snapshot/HTTP/Room delivery, then a separately
started compiled MCP server creates the routine through the official SDK and
the isolated actual backend/PostgreSQL. Android's ordinary incremental delivery
consumes the three new creation batches and publishes the saved graph. Its real
repository observes the exact submitted root/entry/set IDs, parents, order,
references, untrimmed name, saved state/revision3, defaults/null/zero/empty sets.
Repeated sync consumes no new batches, leaves one routine and reaches a clean
quiescent tail with paired projection epochs and empty staging/outbox.

The host independently checks PostgreSQL roots/children/revision/replays/batches
against captured submitted bytes and literal input expectations. Android expected
identities are that independently verified submission, not production encoder
output used to generate an expected response. Actual domain replies are never
simulated. Android has its own real same-account service session; it does not
share ownership of MCP's rotating session. Setup alone substitutes external
Google with synthetic accounts/credentials followed by actual service refresh.

This is delivered HTTP/engine/Room/repository evidence on the named emulator,
not a Google login, account UI journey, personal phone or instantaneous/offline
delivery claim. The full owning suite retains the backend-owned disposable Clock
overlay for existing authentic expiry cases; Android uses ordinary wall time.
T17 named Pi, T19 real Google/browser and independent T20 remain separate gates.

## Verification and candidate

- Initial workspace production typecheck, lint, format and build pass with pinned
  Node24.21.0/npm11.19.0. Scoped changed-JavaScript syntax/ESLint/Prettier and Python
  AST checks pass; actual Android assembly compiles the Kotlin fixture.
- [Selected unchanged regressions](t16-s7-regressions-initial-inventory.json):
  **138/138 in seven exact files**, zero failed/skipped/pending/todo and stable
  runtime hashes. Later changes affect unused Android/backend-interoperability
  fixture paths only; no identical whole-tree-across-batches claim. The clean
  final candidate also replays this complete selection plus the metadata guard below.
- [Full workspace results](t16-s7-results.json): **46/46 in nine exact files**,
  zero failures/skips/pending/todo; [620 runtime hashes](t16-s7-artifact-inventory.json)
  stable. [Android source/APK provenance](t16-s7-android-provenance.json) verifies
  both the executed snapshot and APK bytes stable, original inputs unchanged,
  emulator exit/detachment and complete private root removal. [Backend provenance](t16-s7-backend-provenance.json)
  and [provider cleanup](t16-s7-cleanup.json) pass.
- Compatibility-document update adds the actual scoped evidence while retaining
  pending product/release certification. Its unchanged [foundation guard](t16-s7-doc-closure-inventory.json)
  passes **43/43**; this joins the138 unchanged checks for181 distinct workspace
  regressions across two recorded batches. That metadata test and all181 regression
  test sources/expectations remain unchanged.
- Clean locked installation plus all four production checks pass;424 source inputs
  and194 emitted MCP/companion files match. The compatibility-only prose delta is
  declared by the reproducer. Two preexisting parked T02 generated outputs are
  not copied/rebuilt: experiments/t02/dist/index.js and index.d.ts. They remain
  unchanged in the workspace; no parked source/test/evidence is removed or reopened.
  [Clean owning](t16-s7-clean-results.json) passes46/46 and
  [clean regressions](t16-s7-clean-regression-results.json) pass181/181, zero failures/
  skips/pending/todo. Both have618 stable hashes and matching complete selected
  file sets. [Reproduction](t16-s7-clean-reproduction.json) proves fresh locked
  install, four production checks, exact424/194 identities, stable source/outputs
  through both replays and removal of the owned clean root.
  [Scope comparison](t16-s7-clean-scope-comparison.json) explicitly reconciles the
  two parked outputs and compatibility prose; no whole620-file equality claim.
- [Product identity](t16-s7-product-identity.json):615 preexisting accepted inputs
  checked; only the declared TLS fixture, S7 runner admission and compatibility
  prose differ. All291 production source/emitted paths remain exact; dependencies/
  compiler settings unchanged. S6's production/test timestamp repair hashes match,
  so its27 accepted backend checks are reused rather than claimed as fresh S7 tests.
  [Contract comparison](t16-s7-contract-comparison.json) verifies all24 accepted
  backend/catalogue files and records current normative MCP draft hashes.
- [Environment](t16-s7-environment.json) records actual selected tools and scope.
  Original Android/backend/shared contracts, MCP product/config/dependencies and
  compiler settings are preserved. S3's accepted codec and S6's accepted backend
  timestamp repair are carried unchanged in the verified candidate. The old T18 archive
  remains historical; no new package/deployment/release claim.

## Retained qualification failures and fixture corrections

The old disposable Node selector was absent; version probes reached ambient
Node26/npm12. No source check/build/test used them. The retained disposable
Node24/npm11 toolchain was located and verified before executable checks.

The initial private file handoff used ADB exec-out stdin and timed out before
native execution. It now uses shell stdin, atomic target-private files and a
native-start handoff so Gradle reinstall cannot discard setup. Synchronous ADB
calls were replaced with asynchronous calls to keep the fixture TLS event loop
available. Independent same-account Android/MCP service sessions are explicit.

Subsequent native diagnostics preserved zero committed batches and a transient
pre-header IOException while an immediate fresh request returned a valid page;
they did not prove a payload/contract defect. The TLS relay had forwarded backend
hop-by-hop connection/framing headers while Node's own default HTTPS idle timeout
was5000ms. It now owns its downstream framing, preserves exact domain bytes and
end-to-end headers, and explicitly keeps idle fixture connections for60000ms
during the Android-to-MCP handoff. Deliberate loss/cancel/rate-limit hooks and all
domain/three-batch assertions remain unchanged. The native read budget remains
the original helper's two seconds; no production timeout, retry or schema change.

The [tenth native case](t16-s7-tenth-native.json) passes, but its host wrapper
failed a redundant post-Gradle ADB package query during teardown. That failed
[owning result](t16-s7-tenth-inventory.json) remains failed, with stable hashes.
Native finally removes inputs; the owning wrapper now verifies emulator exit/
detachment and erases its full storage/reverse mappings without racing Gradle's
target uninstall. An earlier transient emulator/ADB qualification failure also
remains recorded, with no native pass claim. Early scoped syntax/lint/format
findings were repaired before final checks; no failing case or assertion removed.

Earlier per-run results, native XML/log hashes and backend/Android cleanup/source
provenance are retained under t16-s7-initial/second/third/fourth/fifth/sixth/seventh/
eighth/ninth/tenth evidence. Early raw private exception details were erased and
are not reconstructed as known outcomes. No private bodies/tokens/IDs are copied
to evidence. The final native fixture removes temporary diagnostic requests and
listeners; only the declared normal production transport/engine path remains.

## Scope and review limits

Edits are the fixed Android integration fixture/orchestration, the existing TLS
fixture's downstream connection handling, S7-only runner admission/native-proof
checks, clean reproduction and task/evidence/status documents. No original Android
or backend source, MCP production, shared contract, dependency or compiler change;
no staging/commit, Pi configuration, real enablement, publication or release.

Review checked scenario oracles against shared draft0.2/backend v1, exact submitted
identity versus independent DB/Android observations, ordinary three-step sync,
bounded execution, source/APK/compiled-target stability and owned private cleanup.
Accepted local T04/T06/T09/T11/T12/T15/T18 evidence is reused where requirements
are local; the [34-ID reconciliation](t16-s7-scenario-reconciliation.md) makes
those boundaries explicit. T06 historical omissions, T04 rollback/media/same-UID
limits, beyond30days invariant rather than elapsed31-day testing, and deletion
status/purge-intent rather than completed physical purge remain unchanged.

## Final acceptance and cleanup

[Clean Android provenance](t16-s7-clean-android-provenance.json) verifies original
public inputs unchanged, the same fixture source as workspace, executed source/
APK bytes stable within the run, actual nonempty native success, owned emulator
exit/detachment and complete temporary storage removal. APK byte identity between
separate fresh debug-signing environments is not claimed.
[Clean backend provenance](t16-s7-clean-backend-provenance.json),
[provider cleanup](t16-s7-clean-cleanup.json) and
[regression cleanup](t16-s7-clean-regression-cleanup.json) pass. Final device
inventory is empty; no private native temporary roots remain. Public disposable
Node/provider tooling and ordinary build caches are retained, not private profiles.

All requirements in the work order are met. The complete active T16 suite includes
the one native case; it is not counted again as an additional independent test.
The final clean eight-file181-check regression run includes the original seven
files plus the unchanged43-check foundation metadata file. Workspace181 is138+43
in separate recorded batches with their explicit unused-fixture/prose deltas.
No test exclusion/skip, expected-behavior relaxation, implementation/contract
repair, dependency change, independent-review claim or real enablement is hidden.

T16 is accepted for the specified isolated actual backend/Android boundary.
T17 named Pi, T19 real Google/browser and independent T20 remain open. Product/
release certification and the historical T18 package are not advanced by this
source-candidate acceptance. No automatic successor, staging/commit or release.

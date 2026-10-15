# T08-S2 c1/f1 — QA SDK-only observations

## Disposition

**FAILED / STOP / HOLD.** The one named SDK-only relay ran once and returned
actual exit **1**, reporter `success:false`. No repair, rerun, target inspection,
source/static/build/install change or cleanup followed. Complete private original
observations remain retained for independent Coordinator inspection.

Authority: `t08-s2-f1-sdk-relay.md`; frozen candidate `t08-s2-c1-f1`, inventory
216 inputs / 153 QA-verification inputs. Source gates c1/r3 were held throughout.

## Command, environment and identity

Safe launcher command: `bash "$GT_S2_F1_SDK_LAUNCHER"` (trusted private delivery;
its location and isolated scope are deliberately not reproduced).

Exact target argv, with only the private result destination represented:

```text
node node_modules/vitest/vitest.mjs run
 test/read-protocol/catalogue-dispatch.test.mjs
 test/read-protocol/validation-errors.test.mjs
 test/read-protocol/result-budget.test.mjs
 test/read-protocol/lifecycle.test.mjs
 test/read-protocol/config-import.test.mjs
 test/unit/t03/tool-schemas.test.mjs
 test/unit/t03/write-projection-result.test.mjs
 --reporter=json --outputFile=<PRIVATE_RESULT>
```

Launcher fail-closed guards verified Node24.21.0/npm11.19.0 with explicit retained
PATH. SDK1.32.1/Zod4.5.4 are frozen inventory pins, not a cross-version claim.
Vitest child used the approved minimal `env -i` environment with private HOME/tmp/
XDG cache/config, pinned PATH/T01_NODE_HOME and CI. No ambient bus, product auth,
proxy/configuration or CA inherited; this is not an OS/network sandbox claim.

Both before/after hash logs contain exactly **153/153 OK** entries and exactly
the frozen QA-verification filename set. Logs are byte-identical. Reporter contains
exactly the expected **seven** distinct relative test filenames, no extra/missing
file. No source/hash/argv/output/cleanup scope deviation observed. No production
source/map/generated implementation was read; only approved black-box execution
and compiled identity checks occurred. Public declarations were not needed/read.

## Original reporter observations

- 99 tests: **95 passed, 4 failed, 0 pending, 0 todo**.
- S2 owning selection: **14 passed / 4 failed**, across five files.
- Two unchanged T03 regression files: **81 passed / 0 failed**.
- File results: **five passed / two failed**, exactly seven entries.
- Reporter suite/group counters separately report total23/passed19/failed4; these
  are not the seven file-entry count. No separate runtime-error counter is claimed.

| Exact relative file | Passed | Failed |
| --- | ---: | ---: |
| test/read-protocol/catalogue-dispatch.test.mjs | 0 | 2 |
| test/read-protocol/validation-errors.test.mjs | 3 | 2 |
| test/read-protocol/result-budget.test.mjs | 3 | 0 |
| test/read-protocol/lifecycle.test.mjs | 4 | 0 |
| test/read-protocol/config-import.test.mjs | 4 | 0 |
| test/unit/t03/tool-schemas.test.mjs | 62 | 0 |
| test/unit/t03/write-projection-result.test.mjs | 19 | 0 |

### Original failing case identities

1. `S2 official SDK catalogue and dispatch initializes with tools-only authority and lists seven fixed complete schemas`
2. `S2 official SDK catalogue and dispatch dispatches all six reads once with exact effective arguments, canonical data and matching text`
3. `S2 protocol/application separation and safe errors rejects SDK-admitted malformed calls, unknown names and unsupported task authority at protocol level`
4. `S2 protocol/application separation and safe errors preserves recognized safe read metadata but drops presentation text and rejects foreign/invalid envelopes`

Each has one retained original failure message. Native messages/stacks, protocol
values and private paths are intentionally not copied here. Fixed safe first-line
classification only: the first two mention MCP/validation errors; the third an
MCP-error assertion mismatch; the fourth an assertion mismatch. These labels are
not a production/fixture diagnosis. Coordinator independently adjudicates against
public specifications before any repair or rerun; no assertion is weakened here.

## Original observation retention

Complete JSON result, stdout, stderr, actual status and both hash logs remain in
the Coordinator-known private scope. Full JSON/status/hash sets and complete
stdout/stderr were read for sanitized reporting, not tail-only reconstruction.
Stdout contains only the reporter destination announcement; stderr is empty.
No cleanup deleted observations. Original integrity references:

| Private observation label | Bytes | SHA-256 |
| --- | ---: | --- |
| result.json | 40446 | a3105bff52051814b05507343981265600f5d9b0ebfd93d299f890ebda9c2a74 |
| stdout.log | 62 | 58c29b1b69a1efee6282673e7af91c161aff70c7ba145fa50fd2e3e9fc13c70b |
| stderr.log | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| exit-status | 2 | 4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865 |
| hash-before.log | 4542 | 17e32d9a042fa17e70d62799f5f774a080310f4ccbcd79e79f858efa2053c730 |
| hash-after.log | 4542 | 17e32d9a042fa17e70d62799f5f774a080310f4ccbcd79e79f858efa2053c730 |

## Limits and active holds

No configured-policy or S1 provider suite ran. The following remain ACTIVE/UNRUN,
not excluded from acceptance or counted as skips/passes:

- `test/read-protocol/configured-policy.test.mjs`
- `test/read-runtime/startup-config.test.mjs`
- `test/read-runtime/startup-ownership.test.mjs`

These require a separately confirmed real isolated provider/supported filesystem/
synthetic HTTPS environment and named frozen relay. Negotiated MCP protocol version
was not separately captured in this reporter; no host/protocol-matrix claim is made.
SDK-prefiltered whole-message cases retain their explicit S3 deferred identities.
S3 stdio/parent integration/clean reproduction, live backend/Google/Android/named Pi,
packaging and release remain deferred. Even SDK green alone could not accept S2;
this observed SDK selection is not green. QA HOLDs all source/static/target/provider/
fixture/build/install actions pending Coordinator failure review and explicit grant.

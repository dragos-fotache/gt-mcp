# T08-S2 c2/f2 — QA revised SDK-only observations

## Disposition

**SDK-ONLY PASS / HOLD; S2 NOT ACCEPTED.** The newly named c2/f2 relay ran once,
actual exit **0**, reporter `success:true`: **99/99 passed**, zero failed, pending
or todo. This is fresh evidence after reviewed F1-P1/Q1/Q2 repairs, not a
retroactive pass for c1/f1. Original f1 remains 95 passed / 4 failed; its complete
observations and original216input bytes remain privately preserved.

Authority: `t08-s2-f2-sdk-relay.md`; frozen candidate `t08-s2-c2-f2`, approved
c2/r4 source gates. New inventory:217inputs /154QA-verification inputs. No source,
static, build or install action occurred during the freeze/run.

## Safe command and environment

Trusted private launcher command: `bash "$GT_S2_F2_SDK_LAUNCHER"`.
Launcher/scope locations are deliberately not reproduced.

Exact nonempty target argv, private output destination represented safely:

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

Launcher fail-closed guards verified Node24.21.0/npm11.19.0 using explicit retained
PATH. SDK1.32.1/Zod4.5.4 are frozen pins, not a compatibility matrix. Fresh minimal
`env -i` child retained only pinned PATH/T01_NODE_HOME, private HOME/TMPDIR/XDG cache/
config and CI. No inherited bus/proxy/product-auth/config/CA. This hygiene is not
an OS/network sandbox or live-backend claim. No provider was provisioned or used.

## Scope and identity observations

- Reporter file entries are exactly the prescribed **seven distinct filenames**;
  no additional/missing/discovered suite.
- Before and after logs each contain exactly **154/154 OK**, matching the complete
  frozen QA-verification filename set. Hash logs are byte-identical.
- No source/hash/argv/output/cleanup deviation observed. No cleanup deleted any
  original observation; no repair or rerun followed this one-shot run.
- Only approved black-box public target execution/compiled hashes occurred. No
  production-source/generated implementation/map read; public declaration reads
  were unnecessary.

## Actual reporter observations

| Exact relative file | Passed | Failed |
| --- | ---: | ---: |
| test/read-protocol/catalogue-dispatch.test.mjs | 2 | 0 |
| test/read-protocol/validation-errors.test.mjs | 5 | 0 |
| test/read-protocol/result-budget.test.mjs | 3 | 0 |
| test/read-protocol/lifecycle.test.mjs | 4 | 0 |
| test/read-protocol/config-import.test.mjs | 4 | 0 |
| test/unit/t03/tool-schemas.test.mjs | 62 | 0 |
| test/unit/t03/write-projection-result.test.mjs | 19 | 0 |

Five S2 SDK-only files: **18 passed**. Two unchanged T03 regressions: **81 passed**.
Total99passed/0failed/0pending/0todo. File statuses:7passed/0failed. Reporter suite/
group counters separately report23total/23passed/0failed; these are not the seven
file-entry count. No failed titles in this NEW run. No separate runtime-error
counter is invented.

This selection establishes its actual official SDK catalogue/schema, six-dispatch,
strict argument/protocol separation, bounded semantic/text/error, byte-budget,
cancellation/owned-close and limited public-import assertions on c2/f2. It does
not certify a different host/protocol-version matrix, stdio or configured providers.
The negotiated MCP version was not separately captured; no version is guessed.
Original f1 fourth failure's fields/code/order remain UNKNOWN; new passing evidence
does not prove which unobserved value caused that original mismatch.

## Complete original retention

Full new JSON/status/stdout/stderr/hash outputs remain in the Coordinator-known
private scope; complete results, exact file set, actual status and both full hash
logs were inspected for this report, not tail-only reconstructed. Stdout is only
the reporter destination announcement; stderr is empty. Integrity references:

| Private observation label | Bytes | SHA-256 |
| --- | ---: | --- |
| result.json | 37554 | 226b051d7e531792a1246a9879fe6b00861db6d5ac087f57c9670e8fac7bf5c1 |
| stdout.log | 62 | bd33a736da0e7f69f97097bfa2bbc1f663c392b6c66d7c5fa27d6f9163b3d075 |
| stderr.log | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| exit-status | 2 | 9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa |
| hash-before.log | 4591 | bddd1fb7e839253c3cd49f9964178fd398c1741212668c7f4c5bab210d5d31d2 |
| hash-after.log | 4591 | bddd1fb7e839253c3cd49f9964178fd398c1741212668c7f4c5bab210d5d31d2 |

Original f1 failures, titles and hashes remain in `t08-s2-qa-f1-sdk.md` and retained
private originals. No old observation has been overwritten or relabeled.

## Active remaining checks and HOLD

The following remain **ACTIVE / UNRUN / HELD**, not hidden exclusions or skips:

- `test/read-protocol/configured-policy.test.mjs`
- `test/read-runtime/startup-config.test.mjs`
- `test/read-runtime/startup-ownership.test.mjs`

A separately confirmed private real provider/supported filesystem/synthetic HTTPS
scope and named frozen relay are still required. SDK-only green cannot accept S2.
SDK-prefiltered malformed whole-message cases remain explicitly deferred to S3,
not passed here. Actual stdio/parent integration/clean reproduction, operator login,
live backend/Google/Android/named Pi/packaging/release remain outside this grant.
QA HOLDs all source/static/target/session/fixture/provider/build/install actions;
no automatic context renewal, S3 or successor.

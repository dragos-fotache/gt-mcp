# T02 R1/S2B repaired-artifact readiness

**Audience:** coordinator/Developer only; not QA input.
**Disposition:** repaired artifact reviewed and ready for a NEW exact independent
QA relay. R1 is still unaccepted pending that window; R2-R11 remain paused.
The first readiness failure is preserved in
[t02-r1-s2b-coordinator-readiness.md](t02-r1-s2b-coordinator-readiness.md).

## Contract decision and bounded repair

Public §8 requires explicit null operationId/digest when no call was admitted;
missing keys are not accepted. §12 clarifies the same requirement. No assertion
was relaxed and no new scenario, subsystem, dependency or slice was added.

Reviewed repair changes only:

- `experiments/t02/fixture-server/server.mjs` finalize: empty operations condition
  adds `operationId:null` and `digest:null` to BOTH the shared final effect_ledger
  and independent owned-file final. Final operations/counter/exactly-once behavior
  remains intact; no attempted seed is stamped as admitted. Nonempty serialization
  is unchanged and remains outside this read-only acceptance.
- `experiments/t02/driver/run.mjs`: both R1 and S2A connected-final validators reject
  missing/non-null no-admission fields in journal and owned-file final.

No companion/gate/sidecar/creation-handler/schema/registry/config/metadata changes
were made for this repair. Original companion, gate worker and journal hashes are
unchanged. This is acceptance repair within R1; fixed total remains 13 slices.

## Checks and artifact identity

Coordinator repeated selected Node24.21.0/npm11.19.0 commands, all passed:

```sh
npm run typecheck
npm run t02:build
npm run lint:t02
npm run format:check:t02
```

| Artifact | SHA256 |
| --- | --- |
| experiments/t02/fixture-server/server.mjs | 80ca89b1307f91ad7bad22c2fca5d855999a29fe6031389bff7cff7d4d79caab |
| experiments/t02/driver/run.mjs | cd1fda86a2974017e96e41a2d3d5949cf468b07e81b06b0d64198e63132d56cb |
| experiments/t02/dist/index.js | 07296531dc39bd2370685cc9010d056533ec211127e0d5ca69f7fc05100215ab |

## Actual isolated coordinator observations

The same three public driver commands recorded in the first readiness were rerun
serially with sanitized disposable roots. Coordinator explicitly asserted own
null keys in connected final observations, plus the original gate/read/effect/
cleanup requirements. Reports matched --out files and were disposable.

| Target | Exit | Scenario time | Records | Effects |
| --- | --- | --- | --- | --- |
| direct-readonly/sdk | 0 | 1031ms | 28 | fixture-final total0, operations[] |
| no-companion/sdk | 0 | 753ms | 16 | none/not-spawned total0, operations[] |
| generic-readonly/sdk | 0 | 998ms | 22 | fixture-final total0, operations[] |

R1 final23 is source:fixture with own `operationId:null`, `digest:null`, counter0,
operations[], final:true. Actual native creation ID
`tool:1791726894984:kxckmt04umq` joins call18/gate19/result20; gate denies
mode-not-tui:print with public seed digest/approvedDigest:null and hasUI:false;
native result isError:true/code:null. Genuine named read still succeeds, no
approval/sidecar/receiver creation check or guarded capability. Native shutdown
and zero receiver final precede last cleanup28, with children/listeners0 and
roots removed. S2A final17 has the same explicit null fields. S1 still has no
fixture ledger rather than an invented zero.

An additional isolated official-SDK stdio control exercised the public fixture
entry, listed seven tools and read the synthetic exercise, never called creation,
then awaited client/transport closure. BOTH actual owned outputs were read:

- Owned-file final: event:final, operationId:null, digest:null,
  totalDispatches0, operations[]. Exactly one final.
- Shared journal final: source:fixture/type:effect_ledger, operationId:null,
  digest:null, counter0, operations[], final:true. Exactly one final.

This fixture-only serialization/transport control is not Pi gate or approval proof.
Private roots were removed after native closure; no raw/private paths or tuple
values are retained in this record.

## Fresh independent window

Developer source/build changes are stopped. After this review the coordinator
relays ONLY the exact R1 predicate case, separately selected accepted S1/S2A
regressions and artifact-free validator controls. No whole file/suite, future
profile or build/install while QA runs. Strict explicit-null assertions remain.
Any failed case stops the window and keeps R1 open. No inferred QA pass or T02
completion from this readiness; stop after R1's accepted or blocked disposition.

# T08-S2 c2/f3 — QA configured/provider observations

## Disposition

**CONFIGURED RELAY PASS / HOLD ALL; acceptance is Coordinator-owned.** The ONE
named three-file relay returned launcher exit0 and actual test exit0, reporter
`success:true`: **13/13 passed**, zero failed/pending/todo. Actual reporter counts
match two S2 owning and eleven unchanged S1 regression cases; no count-based pass
was substituted for their individual results.

Authority: `t08-s2-f3-configured-relay.md`. Same frozen c2/f2 candidate:217inputs,
154QA-verification inputs. Original f1 remains failed with its complete originals
preserved. Separate f2 SDK99/99 evidence is unchanged, not rerun by this relay.

## Exact command and environment

Safe trusted launcher command: `bash "$GT_S2_F3_CONFIGURED_LAUNCHER"`.
Private launcher, provider, certificate, socket and scope locations are not published.

```text
node node_modules/vitest/vitest.mjs run
 test/read-protocol/configured-policy.test.mjs
 test/read-runtime/startup-config.test.mjs
 test/read-runtime/startup-ownership.test.mjs
 --reporter=json --outputFile=<PRIVATE_RESULT>
```

The explicit three-file argv matched the frozen inventory's deferred-active
selection. Before/after hash logs each contain exactly154/154OK, with the exact
frozen QA-verification filename set; logs are byte-identical. Reporter contains
exactly three distinct expected file entries. No source/hash/argv/output/cleanup
scope deviation observed; no install/build/source/static action raced this run.

Pinned Node24.21.0/npm11.19.0 verified by fail-closed launcher guards with explicit
retained PATH. Same SDK1.32.1/Zod4.5.4 inventory pins. Retained SHA-qualified GNOME
51.1/gcr3.41.2 provenance is the Coordinator's reported environment qualification,
not a new QA package-install/qualification claim. This run used NEW private bus,
provider HOME/XDG/runtime/password state, unlocked login readiness, ext4 roots and
explicit private CA/strict loopback HTTPS fixture inputs in a minimal isolated
environment. No personal/old provider state, ambient bus, live backend or product
authentication was used. Environment hygiene is not an OS/network sandbox claim.

Reviewed private preparation used accepted T04/T06 public APIs plus unchanged S1
fixture helpers only, exactly signed-out/conflict/stale startup profiles. The stale
transition alone installed visibly synthetic ServiceSession bytes; no backend
exchange/refresh or delivered login. Exact three-key locator manifest and fixed
preparation success marker confirmed; acquired owners were awaited closed before
suite execution. Preparation stderr empty.

## Actual file and case observations

| Exact relative file | Passed | Failed |
| --- | ---: | ---: |
| test/read-protocol/configured-policy.test.mjs | 2 | 0 |
| test/read-runtime/startup-config.test.mjs | 8 | 0 |
| test/read-runtime/startup-ownership.test.mjs | 3 | 0 |

All following exact reporter case identities are **passed**:

1. `S2 configured S1 composition (separate isolated relay) strictly accepts only the additive protocol shape/range and preserves S1 entry compatibility`
2. `S2 configured S1 composition (separate isolated relay) true write policy cannot activate creation and config/descriptor are detached startup snapshots`
3. `S1 startup config selection exports the exact runtime surface`
4. `S1 startup config selection openReadRuntime({}) returns an unconfigured runtime without IO`
5. `S1 startup config selection invalid caller shape/fields/path syntax fails invalid_arguments exactly`
6. `S1 startup config selection treats a genuinely absent selected config file as unconfigured, not fatal`
7. `S1 startup config selection valid metadata passes file validation: unprovisioned owner fails closed`
8. `S1 startup config selection unconfigured reads never dispatch: all six report configuration_required`
9. `S1 startup config selection representative malformed/unsafe metadata fails configuration_required exactly`
10. `S1 startup config selection symlinked selected file fails configuration_required, never followed`
11. `S1 owner/auth boundary signed-out (null-account) configured runtime reports authentication_required`
12. `S1 owner/auth boundary conflicting owner binding fails recovery_unavailable without reset/provision`
13. `S1 owner/auth boundary stale same-origin descriptor fails recovery_unavailable, never repaired`

Reporter:13total/13passed/0failed/0pending/0todo. File entries3passed/0failed;
reporter suite/group counters separately6total/6passed/0failed, not the file count.
No failed titles or invented separate runtime-error counter.

Observed S2 composition covers strict additive protocol-field validation, preserved
S1 entry compatibility, signed-out real-owner composition, permanently unavailable
create even with writesEnabled:true, zero synthetic HTTPS dispatch and detached
no-reload metadata. Short error results do NOT prove configured-budget capture or
exactly one startup read; those remain independent byte-boundary checks plus
Coordinator source/forwarding audit. No authenticated stdio claim follows.

## Owned settlement and retained scope

- Original login readiness marker is exactly unlocked; provider log is empty.
- Reviewed inner lifecycle uses graceful TERM/wait, accepts settled exit0/143,
  removes the protected synthetic unlock password and writes provider-reaped only
  after successful wait. Outer launcher returned0 and required that marker.
- Provider-reaped marker present; synthetic password file absent.
- dbus-run-session returned successfully. The private bus endpoint is absent from
  active Unix socket inventory and its filesystem socket is absent. These were
  read-only local release observations, not reconnection/provider operations.
- Original preparation and launcher success markers match exactly. Test stderr,
  preparation stderr and launcher stderr are empty.
- Disposable synthetic scope and all full originals remain retained. No post-run
  deletion/repair/rerun occurred; scope deletion needs separate Coordinator release
  review and cleanup grant.

## Complete new observation integrity

Full JSON/status/stdout/stderr/hash/preparation/provider observations were inspected
without publishing native diagnostics, private paths or bodies. Nothing is inferred
from a tail-only pass label. Selected private observation integrity references:

| Private observation label | Bytes | SHA-256 |
| --- | ---: | --- |
| result.json | 5483 | 35118b77a0cff4aa6d178557de51f505cff593003023d4708048625a8b7e7d90 |
| stdout.log | 81 | 1a4002722cd2d495b9e500a5c16e52504ae0de502390d7438f0746f185efb924 |
| stderr.log | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| exit-status | 2 | 9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa |
| test-status | 2 | 9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa |
| hash-before.log | 4591 | bddd1fb7e839253c3cd49f9964178fd398c1741212668c7f4c5bab210d5d31d2 |
| hash-after.log | 4591 | bddd1fb7e839253c3cd49f9964178fd398c1741212668c7f4c5bab210d5d31d2 |
| preparation.stdout | 75 | 26522e1d5410b617e5dbb262ec9979330e551e7b7fdc613002e5600a40ee3012 |
| preparation.stderr | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| launcher.stdout | 49 | 1f47ba6d9192d711b37806deb89bc64b62738548014c41f915593fcba0da9836 |
| launcher.stderr | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| run/provider.log | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| run/provider-reaped | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| run/locked-state | 8 | 33be491b1e2786cdeb4a645943249afe1142de0a24524691045db25fa6747059 |

## Limits and final QA HOLD

The three formerly active/unrun configured selections now have this NEW13/13
observed evidence. Combined with the separate same-candidate SDK99/99 relay,
selected current-candidate observations total112/112 (20S2owning +92regressions),
not one combined process/suite run and not retroactive f1 acceptance.

Coordinator independently reviews full results, identities, lifecycle release and
remaining source audits before S2 disposition. The limited independent SDK
handshake2025-11-25 observation was Coordinator-reported separately, not guessed
from original reporter output. SDK-prefiltered whole-message cases remain S3
obligations. Actual stdio/parent integration/clean reproduction, authenticated
parent behavior, genuine backend/Google/Android/named Pi/packaging/release are
outside this grant. No automatic S2 acceptance/S3/context renewal follows.

QA HOLDs ALL source/static/build/install/target/session/fixture/provider/cleanup
and successor actions pending explicit review/permission. Synthetic scope retained.

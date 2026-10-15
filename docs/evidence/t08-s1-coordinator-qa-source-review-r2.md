# T08-S1 independent QA source review — r2

## Disposition

READINESS STILL REJECTED; no execution relay. Coordinator reviewed all same nine
repaired files against public specifications/OpenAPI, not production implementation.
The major r1 catch/return false passes and permissive outcome assertions are removed;
complete basic fixture shapes and exact Int64 oracles are improved. QA-reported
pinned syntax/lint/format reruns and toolchain-deviation detail remain source-only
self-reported evidence. Private provisioning-path removal is verified.

## Focused remaining blockers

1. **Accepted bootstrap API is called with an incompatible capture.** T06-S1
   installInitialGrant requires the exact pre-auth binding (null account, generation0)
   captured from the opened facade, not a proposed account/generation1 binding.
   prepareIsolatedProfile currently passes the latter. Its required-input loop also
   rejects null account even though signed-out preparation is explicitly intended.
   Correct against public T04/T06 signatures/transition rules and validate grant
   account through the normative response, not guessed local authority. T04 roots
   require0700; pre-created profile/anchor mkdir calls need explicit private modes,
   not reliance on an unstated inherited umask.
2. **Fixture lifetime leaks on setup failure.** buildIsolatedRuntime starts a
   listener and creates roots before provision/install/open without failure teardown.
   Its returned cleanup stops at the first rejection, leaving remaining resources.
   Required finally cleanup therefore is not yet complete. Settle/release owned
   gates, runtime/profile/server and temporary resources on all acquired-resource
   paths, preserving cleanup failure. Do not force-terminate durable work.
3. **Missing owning integration evidence remains.** No test actually begins refresh
   and closes while owned durable auth work settles. Invalid args with expired auth
   checks an error but not zero resource/refresh requests; the zero-request helper
   case uses a separate live-grant runtime. Paging responses are checked but effective
   search/filter/limit/token forwarding is not observed. The six-route/signed-out/
   conflict/stale/writes/expired environment configs still have no complete authored
   preparation/response path or explicit independently specified relay preparation
   contract. Coordinator must not invent QA oracles/setup in an execution launcher.
   Supply a small reusable fixture/preparation path or precise existing QA fixture
   reuse, with deterministic scenarios and publicly observable request evidence.
   Do not duplicate complete dependency matrices or introduce a general framework.
4. **Metadata cases can all fail for the wrong reason.** Every malformed-config
   case relies on the same otherwise-valid loader/path/bus assumptions without a
   positive valid-startup control using those assumptions. Verify that control;
   otherwise a loader rejecting every file could pass all negative cases. Missing
   selected file should be under an existing private subtree, not merely os.tmpdir
   directly, matching S1's sticky-parent/private-subtree rule. Aggregate preservation
   fixtures currently have empty exercises only; one meaningful ordered/nonempty
   aggregate with nullable fields is sufficient, not a broad permutation campaign.

## Coordinator correction — stale descriptor precedence

The r1 relay described stale binding as configuration_required too broadly. That
was a Coordinator ambiguity, preserved here rather than blamed on QA or erased.
S1 section3 already assigns ALL T04 opening failures to recovery_unavailable:

- Descriptor schema/origin/config incompatibility detected before storage opening
  => configuration_required.
- Internally valid same-origin descriptor that is stale versus durable T04 binding
  => storage opening/fence failure => recovery_unavailable.

The common specification now explicitly distinguishes these cases; both roles get
only this public clarification. QA chooses a deterministic fixture for each needed
case. No requirement to test all error combinations.

## Next grant/disposition

Focused repairs in the same nine QA sources/evidence and existing exact static
scope only; no target/provider/HTTPS/suite/install/build execution or new filenames.
Original r1/source/static/environment failures retained. Report corrected fixtures/
public signatures and exact focused results, then hold for separate source review.
Developer implementation continues independently. Existing bounded-window clock
and no automatic successor/context renewal stay unchanged.

# T06-S2 coordinator QA re-review r3 — final narrow observation fix

**Disposition: r2 cleanup/capture repairs verified; one source observation remains.**
No target execution or frozen relay. Production c2 is separately source-approved
and HELD. Reviewed revised gate adapters/harness, config-copy cases, new clock
case and [QA r2 evidence](t06-s2-qa-repairs-r2.md) against public specifications.
Other r1/r2 assertions remain specification-derived;40 declared cases are not
execution results.

The release registry, immediate real-commit promise handling, immediate current-
owner tracking, nested budget mutation99 and separate in-place CA mutation now
address the r2 blockers. Begun final-commit cancellation has owned-release cleanup.

## One required observation before source approval

makeCommitGateOwner.heldBytes is copied from the commit ARGUMENT at entry, not read
from durable storage. The ordering case currently calls that memory snapshot
"durable" before release but reads actual owner vault only AFTER dispatch.
While prepare completion is held, read the actual T04 owner vault before releasing
that gate and require byte equality to the captured argument/pending snapshot.
That real read queues behind the real commit and establishes its completion;
the adapter's returned promise remains held so dispatch must still be absent.
Then bounded no-dispatch observation/release and existing exact later-request
comparison have the intended durable-before-dispatch oracle. This is one additional
assertion/read in the EXISTING case, not another test/fixture campaign.

## Honest clock-case scope

The newly armed clock aborts on its FIRST epoch query, so it establishes a
representative synchronous clock-triggered abort/no-write and same-facade retry.
It does not independently pin the final post-serialization callback site; an earlier
abort check can satisfy this case. Label comments/evidence accordingly. Production
c2 source audit verifies both actual post-clock commit guards. No clock-call quota,
new timing gate or callback-permutation campaign is requested.

QA source-only repair allowed for this existing case/comment scope and follow-up
evidence; retain all histories/S1 sources. Scoped static checks then readiness/HOLD.
No target/provider/HTTP/Vitest/build/install, source expansion, time renewal or
successor. Original checkpoint90/stop120 applies; report partial if exhausted.
Source approval and named frozen inventory/relay remain prerequisites; S2/T06
incomplete, S3–S5 unassigned, no live state/writes/.pi/staging/commits/release.

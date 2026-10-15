# T06-S4 production source review c0 — repairs required

**Disposition: NOT SOURCE-APPROVED. Candidate c0 HELD; no frozen relay/execution.**
Bounded Developer repair source/build window opens only after the issued repair
assignment, on the same owned auth/ADR/compatibility paths. Independent QA source
repairs continue separately. Parent T06 incomplete; S5 unassigned, no product writes.

Reviewed all2248lines of new src/auth/authenticated.ts, additive index, ADR§10 and
bounded compatibility prose against the common work order, accepted public behavior
and unchanged dependencies. No QA test internals are Developer input. Source findings
below are review conclusions, NOT executed behavioral failures.

## Integrity and independently repeated production checks

Pinned Node24.21.0/npm11.19.0 via checked disposable T01_NODE_HOME/PATH.
Coordinator repeated typecheck, lint:production, format:check:production, build:
ALL PASS exit0.157 production/source/build/config/document hash rows stable before/
after; rebuilt output byte-identical to this candidate. No custom runtime/import/
provider/TLS fixture/QA suite execution. Static/build green is not source acceptance.

Against S3's269-file inventory, the ONLY changed existing rows are additive auth
index source+compiled JS/declarations and Developer-owned ADR/compatibility. Existing
session/refresh/recover/validate/errors/vault, HTTP/storage/domain/root/manifests/
configs and inventoried QA/dependency files unchanged. New authenticated source/
compiled JS+declarations are additions, not S3 rows. This is not a new frozen relay.

Candidate reviewed SHA256:

- src/auth/authenticated.ts:
  ca9b95fd91ab4ff9ccfda8d6b22aae49e1f9a932d49cb54b100ec121aa9cff1f
- src/auth/index.ts:
  c9f764d34189ce838c6c84fada47dcdfa584cb4b8d40642dedade07cfa3d94b9
- docs/decisions/t06-implementation-adr.md:
  0e350735a64e267004400b4e4b520660abe7a4db5884d48943723f3e3f1b2d1a
- docs/compatibility.md:
  600ae3609c64203a0395fda9e81bb639c831294b4bb4523adecdf7dd0f6a5d11
- dist/auth/authenticated.js:
  c5a7d220050d57563f39de125715d17cc34762d8dfa139fcd67fac7efe90e44f
- dist/auth/authenticated.d.ts:
  b03ee1581ade04726807b5fa0c94794e87ecbc058085ee989ccab892f459f45f

## Common questions adjudicated

[Common interface adjudication](../decisions/t06-s4-interface-adjudication.md)
settles ADR§10.3 questions: Session entry/state failures and Transport route/size
failures may retain their respective safe classes; no artificial universal-class
rewrite. Full operational head budget includes bearer and remains T05 pre-dispatch,
possibly after preflight, while malformed args/body-byte limits reject before auth.
No new public API or dependency change. Update ADR uncertainty prose to reference
settled decisions; preserve initial readiness/history honestly.

## Required production repairs

### P1 — Active auth coordination and benign owned vault transitions

ensurePreflightAuth1595–1624 does not inspect/join refs.active if live grant and no
pending yet. An auth cycle is published before prepare commit and pending is assigned
only AFTER its acknowledgement. A resource arriving during that interval can bypass
the shared cycle. selectCredential/beforeDispatch/isCurrent likewise do not establish
that no resource handoff uses unresolved shared auth state.

checkOwnerMatches635 takes an expected byte snapshot across an await. Prepare and
success commits update expected state only AFTER storage acknowledgement
(1287–1292,1366–1368,1533–1535). A same-binding resource owner read during a real
owned commit/held acknowledgement can see the newly durable state while expected
bytes are old, permanently fencing the facade as if external drift. Merely asserting
that current/expected "advance together" in ADR/comments does not make this atomic.

Coordinate valid preflight callers and resource dispatch/delivery with owned auth
transitions. Followers join the already active cycle even before pending is visible;
owned commit intervals must not be treated as foreign drift or cause unrelated
same-binding responses to fail. External vault/generation drift still fails closed.
Do not let auth hooks wait for their own cycle or serialize whole resource network
operations unnecessarily. Private synchronization/factoring is Developer choice;
no T04/T05 edits or competing credential facades/public hooks.

### P2 — Revision must identify the bearer actually dispatched

orchestrateResource1786 captures refs.grantRevision BEFORE T05's awaited hooks and
credential selection. An overlapping installation can advance grant/revision before
that leg selects bearer. A401 from that newer bearer is then treated as an old-revision
401 and retried using the SAME rejected bearer without its permitted forced rotation.

Track the revision corresponding to actual leg credential selection/handoff, with
per-leg isolation for overlapping calls and no mutable caller aliases. Preserve
older401 deduplication, one reactive cycle/one retry and pending replay priority.
No public revision/token getter or new transport seam.

### P3 — Auth terminal usability and post-clock fences on all paths

executeFreshRotation1300–1378 returns after installation without the final access/
refresh usability and post-clock leader/fence checks that runFreshRotation already
attempts. A valid fresh expired-access grant can therefore resolve the shared cycle
and later produce T05 authentication_required rather than specified S4
reauthentication_required. Followers must share the failed terminal cycle outcome,
not each discover an unusable grant after purported cycle success.

Apply the common terminal grant/signal/fence rules to EVERY fresh/recovery cycle
exit. Keep atomically installed state, no rollback/extra rotation/key. Clock-triggered
leader abort after installation must interrupt the shared outcome for live followers.
Do not weaken exact replay/account/precision/pre-commit invariants.

### P4 — Final delivery has missing post-await cancellation/expiry and uncertainty

orchestrateResource success paths1809–1820/1834–1845 check caller abort BEFORE final
awaited owner validation, but do not recheck it AFTER that await. No final epoch/
access/refresh expiry check occurs there. A caller aborted during the final owner
read can receive late success; a clock advance can deliver data past the required
final usable-credential boundary.

When a final owner/fence check does reject, the same paths can throw a bare
SessionError after a T05 MUTATION success was already received, dropping dispatched/
outcomeUnknown metadata at the added suppression boundary. That incorrectly suggests
an ordinary local/pre-dispatch interruption instead of a conservatively uncertain
mutation result withheld from the caller.

Use the COMMON final-delivery adjudication: recheck after every final await and clock
callback immediately before delivery; no late success. Suppressed received successes
for abort/fence/expiry/clock use a safe final-leg TransportError with dispatched=true
and outcomeUnknown=true for mutation (false for reads), no body/cause/data leak and
no invented aggregate metadata. Original non401 T05 failures remain unchanged,
repeated definite401 remains safe reauthentication_required, storage failures retain
their specified safe semantics. No additional retry in these paths.

## Boundaries, permitted repair and next gate

Developer may read this production-source review, common adjudication/work order,
owned production/ADR/metadata paths; NEVER QA-private tests/helpers/review/evidence.
Repair ONLY src/auth/, ADR and bounded compatibility rows; prefer new S4 file/index
without modifying accepted S1–S3 behavior. No config/manifest/dependency/HTTP/storage/
domain/root edits without a concrete separate approval. No new API/seam/version.

Permitted early/final typecheck, lint:production, format:check:production, build and
scoped owned ESLint/Prettier. NO runtime/import/custom diagnostic, suite/install or
fixture/provider/loopback execution. Report changed paths/exact commands/results
and how public requirements are met, then HOLD source/build for c1 review. No broad
proposal or generalized framework. Target60–90min/checkpoint90/stop120 honest partial
handoff and safe settlement; no automatic context renewal. Source repair is not
acceptance; independent reviewed sources/frozen relay/QA/clean proof still required.

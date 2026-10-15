# T08-S1 — Trusted runtime/read boundary: accepted work-order record

**Disposition:** ACCEPTED c3/f2. [Independent review](../evidence/t08-s1-coordinator-review.md):
39/39 owning +62/62 relevant unchanged regressions (101/101 total), stable137-input
identity, four pinned production checks and real isolated provider/HTTPS/cleanup PASS.
F1 failure/unknown original error and source/review deviations remain preserved.
ALL Developer/QA source/static/build/install/fixture/runtime windows CLOSED; HOLD.
[Accepted handoff](../handoffs/t08-s1.md). Parent T08 remains IN PROGRESS; no S2 grant.
Following permission/activation descriptions are historical window records,
superseded by this closure, not renewed permissions.
**Owner:** Coordinator; independent Developer w4:p2H and QA w4:p2M.
**Prerequisites:** accepted T03–T06 public capabilities. **Parent:**
[T08](t08-browsing-stdio.md). No automatic S2 successor.
[Opening evidence](../evidence/t08-s1-coordinator-start.md) records prerequisites,
baseline checks, staffing and remaining execution holds.

User delegated remaining design decisions after choosing the operator-facing
policy. [User choices](../decisions/t08-s1-user-decisions.md) and the
[settled S1 public specification](../decisions/t08-s1-runtime-spec.md) define
behavior, file formats, exports, errors and lifecycle. Public behavior is decision-ready.
User instruction now activates the bounded source window below; configured runtime
execution still requires a confirmed isolated environment and separate frozen relay.

## Outcome and non-goals

Implement `dist/runtime/index.js`: startup configuration/descriptor validation,
existing profile ownership, accepted auth composition, six canonical read envelopes
and close. Missing config is safe unavailable state; malformed/unsafe config or
storage/session opening failure is fatal. No initial login/provisioning/metadata
updates, MCP SDK/stdio process changes, mutation/journal capability, cache, automatic
pagination/retry worker, dependencies or shared-contract changes. Product writes
remain disabled even when the config snapshot contains `writesEnabled:true`.

## Normative references and settled interface

- Shared MCP draft0.2 tools/authentication/acceptance scenarios and unchanged
  backend v1 service protocol/OpenAPI, linked by the S1 specification.
- Accepted T03 domain exports; T04 protected-owner API/file/platform limitations;
  T05 fixed-route transport/query/budget/error contracts; T06 S1 unbound-state
  validation and S5 bound lifecycle facade (including S2–S4 refresh/fences).
- Current T06 closure with explicit user-waived checks; no automatic reopening.
- [Proportional testing](../decisions/proportional-testing-policy.md) and
  [bounded context policy](../agent-coordination.md#standing-bounded-work-and-context-safe-slicing-policy).

Exact runtime exports are openReadRuntime/ReadRuntimeError/isReadRuntimeError.
Runtime surface is six named reads plus close, no authority getters/control escape
hatch. Every read validates arguments before auth work, preserves complete canonical
records/pages and emits shared envelopes without SDK framing. The S1 specification
is common authority for independent Developer/QA; implementation details remain
Developer-owned, independent minimal case/fixture design remains QA-owned.

## Historical role/read/edit boundaries — first S1 window

**Developer:** scope new `src/runtime/` and, if useful, private `src/config/`
implementation modules. May read accepted production sources and public contracts,
not QA tests/fixtures/internal evidence or their diffs. Preserve all existing public
exports/behavior and inert root/server/CLI/companion entries in S1. No existing
storage/auth/http/domain edits, scripts/config/manifests/dependencies/compiler
relaxation unless separately Coordinator-approved. A short implementation ADR under
`docs/decisions/t08-implementation-adr.md` may record private implementation choices
but cannot redefine common behavior. No domain test execution.

**QA:** scope new `test/read-runtime/` sources/simple visibly synthetic fixtures and
QA evidence under `docs/evidence/t08-s1-*`. May read common/public specifications,
nonsecret package/build metadata and permitted compiled public API declarations,
not production source/diffs/maps or generated implementation. No manifests/config/
lock edits, no build/install, no discovery-based whole-repository execution. Existing
foundation server direct-launch expectations are unchanged in S1; S3 must explicitly
scope their replacement. Derive checks from specifications, not implementation.

**Coordinator:** common spec/work order/status/interface review, production/QA
source gates and frozen-artifact/environment relay. Own exact active filename/hash
manifest and permitted command argv. No role receives another role's private source
review or implementation-derived test oracle.

## Environment and commands — source activation only; runtime relay required

All Node/npm commands must begin with the provisioned disposable toolchain:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
# Node 24.21.0; npm 11.19.0
```

Developer may now implement in the source scope above and run only existing production checks:
`npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`. Locked install only in a
separately owned clean scope when authorized; never race a frozen QA target.
No npm test/smoke/check or whole-suite diagnostics by Developer.

QA may now author the new sources/simple synthetic fixtures/evidence in its scope.
Report the planned exact nonempty filename list early; Coordinator approval is
required before syntax/lint/format/import-resolution checks with that source argv. No compiled-target,
fixture/provider or suite execution before the separate frozen relay. Scoped test
execution uses explicit `.test.mjs` filenames, never an empty argv or repository
fallback. No global installs, system Node, personal bus/keyring/home or .pi changes.

Configured-runtime verification needs isolated supported Linux/ext4 private profile
and anchor roots, an isolated real Secret Service bus, private fixture CA/HTTPS
origin and only synthetic account/grant/resource data. Verify retained provider/
toolchain provenance privately or reprovision; do not assume old scopes survived
T06 closure. Values remain trusted placeholders outside repo/chat/evidence. A CA
may be supplied to the isolated fixture child via trusted Node CA environment,
not operator config or a new production diagnostic bypass. Use accepted public
T04 provision and T06 initial-install APIs only for synthetic fixture preparation.
No live backend, real Google/Android/person account or product resource mutation.

External environment availability, exact safe fixture launcher, active file/hash
manifest and cleanup commands are runtime-relay prerequisites, not inventions
or evidence supplied by this design draft. Missing prerequisites block execution,
not permission to run against ambient services.

## Small requirement/risk matrix

| Requirement / concrete risk | Minimal useful evidence |
| --- | --- |
| Trusted selection/schema/access | Focused cases for no/absent config, valid startup snapshot, duplicate/unknown/version/type failure, unsafe/link/file-bound failure, descriptor-origin incompatibility; independent file-loader observations. |
| Existing owner/auth boundary | Real isolated provider/store opening with signed-out and trusted synthetic installed grant; conflicting owner and stale descriptor fail without reset/provision or network. |
| Correct six reads | One meaningful successful mapping per read against isolated HTTPS; default20/effective filter+continuation, saved-only list/own draft get and foreign-not-found handling. Fixture responses establish adapter handling, not real-backend ownership certification. |
| Canonical data/error preservation | Exact large numeric revision, complete records/null/order, representative known transport rejection, conservative local failure and no raw exception/private metadata in envelopes. Reuse T03/T05 coverage rather than duplicate their entire matrices. |
| Validate before auth/dispatch | Representative malformed/nested/coercion input with pending/expired auth fixture and observed no request; correct no-config/signed-out envelopes; true write flag exposes no mutation capability. |
| Cancellation/fence/close | Held HTTPS read cancellation and close suppress late success; begun durable refresh settles safely; second explicit opener succeeds only after release. Idempotent close and safe cleanup failure; no forced kill or durability campaign. |
| Inert imports and unchanged entries | Small isolated public-import observation plus Coordinator source audit; relevant existing entry regressions. No general interception/sandbox claim. |

QA chooses representative cases/simple helpers within this matrix; no quota,
private-function assertions, generalized harness or exhaustive fault permutations.
Any added case needs a named distinct requirement/risk or observed defect.

## Verification cadence and deliverables

1. Early role-scoped static checks; report exact blocked interfaces before broad
   implementation/test growth. Developer's private choices need no proposal round.
2. Independent source readiness: Developer production checks/ADR; QA specification-
   derived sources and allowed source checks. Coordinator reviews each separately.
3. Freeze accepted compiled candidate and exact QA sources; verify safe environment,
   nonempty filename manifest and artifact hashes; issue a named runtime relay.
4. Focused repairs only for observed findings. Final S1 owning suite and relevant
   integration regressions; exact selections frozen before execution. Parent T08's
   complete active suite/relevant unchanged regressions and final clean reproduction
   occur at S3, not a full dependency rerun after each edit.
5. Deliver changed paths, safe exact commands/results/versions, frozen identity,
   cleanup/grant disposition and concise accepted/partial/blocked handoff. S1
   acceptance does not deliver stdio, operator login, T08 completion or release.

## Milestones and stop conditions

Target 60–90-minute work windows, checkpoint at90 and stop at two hours with an
honest handoff after safe owned persistence settlement. Partial work stays partial;
no automatic context renewal/role restart or successor assignment.

STOP/report before continuation on contract conflict, missing environment, unsafe
input/provider/path, unapproved dependency/source scope, output/hash/file selection
mismatch or cleanup failure. Preserve full original output and safe failure
identities; no tail-only reconstruction, hidden exclusions or skipped checks as
passes. Never stage/commit or modify .pi/contracts to hide failure.

## Historical source activation and next action

The user authorized starting S1. Existing independent role panes are available and
fresh conversations have been confirmed; source ownership is exclusive. Developer
source/four production checks/build and QA source preparation are OPEN for this
first window only. Coordinator privately supplies the verified disposable toolchain;
no install or ambient runtime fallback. QA sends exact source filenames for review
before static checks; no compiled imports or target/fixture/provider execution.

Report specific ambiguities promptly, then source/static readiness or an honest
partial handoff; hold at readiness or the two-hour stop. Coordinator separately
reviews both roles, confirms/reprovisions safe isolated execution prerequisites and
freezes candidate/QA filenames/hashes before issuing a runtime relay. No source
approval is runtime acceptance; no S2 continuation or automatic context renewal.

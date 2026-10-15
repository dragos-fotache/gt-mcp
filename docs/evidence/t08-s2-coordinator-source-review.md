# T08-S2 — Independent Coordinator source gates

## Disposition

Production c1 and QA r3 are SOURCE-APPROVED for a named frozen SDK relay, NOT
behaviorally accepted. Developer/QA source/static/build windows are HOLD. Target,
suite, fixture/provider/install grants remain CLOSED until separately named.

## Production review

Reviewed all six new protocol modules, runtime config/budget/index integration,
private read implementation and Developer ADR against common S1/S2 contracts.
Public declarations/build readiness are reported with final four production
scripts exit0 on Node24.21.0/npm11.19.0, SDK1.32.1/Zod4.5.4. Herdr transcript
confirms the submitted pinned command chain and retained outcome; independent
behavioral proof is still outstanding. Earlier format check exit1(adapter.ts),
preceding typecheck/lint exit0 and buildUNRUN are preserved; authorized exact
single-file formatter repair and new final green sequence are separate evidence.

Source audit establishes:

- Five protocol runtime exports and unchanged three-export S1 index facade;
  no SDK server/registry/binding/provider/mutation capability escape.
- Official low-level Server/public fallback request composition; no private SDK
  patch. Explicit generic result schema validation supplements unchanged T03
  canonical validation. Fixed catalogue descriptions/order/hints and detached
  output root-object adaptation preserve T03 artifacts.
- Known-tool local validation precedes read dispatch/cancellation. Valid create
  has no read/auth/backend/journal/mutation path, regardless of operator policy.
- Final UTF-8 JSON.stringify(CallToolResult) inclusive budget, whole-result
  replacement and safe fixed fallback; no record truncation/wire-memory claim.
- Private snapshot opener loads config once, validates protocol budget before
  descriptor/store opening, captures it in the same startup record as runtime,
  forwards it directly to adapter factory. Public S1 opener delegates to that
  same path; no config reread/reload or new public injection seam.
- Imports contain declarations/constants/intrinsic capture only; no new explicit
  IO/output/network/timer/process-handler call at module load. Dependency/source
  audit plus small later child observation is not comprehensive interception or
  OS-sandbox proof.
- Transferred runtime/transport lifetime: immediate close fence, shared retained
  cleanup promise, runtime close before SDK transport close even after failure,
  disconnect observes rejection without losing explicit-close failure outcome,
  one attempted connection/no reconnect. Runtime still owns durable settlement.

The SDK whole-message classifier question was resolved publicly in
[t08-s2-sdk-ingress-adjudication.md](../decisions/t08-s2-sdk-ingress-adjudication.md).
SDK-prefiltered invalid whole-message metadata/params belong to S3 protocol/transport
failure coverage; admitted structural failures and known-tool malformed arguments
retain their S2 protocol/application oracles. No production shortcut/SDK patch.

## Independent QA review

Reviewed all nine new QA sources and approved source-only command boundaries,
fixture provenance/oracles, six active suite selection and reused public QA helpers.
No implementation-derived QA expectations or private cross-role source relay.
Observed complete nine-file source-check log plus two focused repair transcripts:
pinned syntax, existing-local formatting/lint, nonexecuting resolution PASS; three
public target entries explicitly DEFERRED, never imported by static checks.

Retain two pre-execution authored-source findings, neither a runtime failure:

1. Reply-expecting cases for SDK-prefiltered whole-message params/metadata were
   inconsistent with settled SDK/S3 boundary. Narrow validation-errors repair
   preserves admitted error and every known-tool invalid-argument oracle, adds
   known-name unknown-call-field coverage, and explicitly inventories deferred S3
   malformed-message cases. No skips/passed deferrals or observed failure exclusion.
2. QA-F1 oversized backendErrorCode contained unsafe characters under normative
   T05 safe-code grammar. Fixture-only correction uses a long visibly synthetic
   safe code; independent byte oracle/result_too_large/replacement assertions
   unchanged, separate Unicode-success boundary preserved. Initial fixture UNRUN.

Simple capability tests independently establish six dispatches/inert create,
complete canonical envelopes/exact revisions, safe failures, inclusive duplicated
UTF-8 bytes, cancellation/disconnect/retained cleanup and factory/import boundaries.
Separate configured-policy source uses real isolated signed-out S1 profile/true
policy; no synthetic grant/auth campaign required solely for this check.
Post-open edits prove snapshot/no-reload only, not single-read/configured-budget
capture; those remain source-audit distinctions above. Preparation is still held.

## Revised source gate — c2 / QA r4

Original c1/f1 run FAILED95/99; [adjudication](../decisions/t08-s2-f1-sdk-adjudication.md)
governs narrow repairs. Source re-review accepts revised c2/r4 for a NEW SDK-only
relay, not behavior acceptance. Developer reports new four sequential production
checks/build exit0, with all original outcomes preserved; QA's exact two-file static
log confirms syntax/local-format/lint/nonexecuting resolution exit0 and target
entries DEFERRED.

Coordinator independently inspected repaired adapter list omission handling and
QA semantic/text/task-message boundaries; public declarations preserve exact five
protocol exports and unchanged three S1 exports. Revised identity collection
confirms ONLY four original input bytesets changed: src/protocol/adapter.ts,
dist/protocol/adapter.js, test/read-protocol/helpers.mjs and
validation-errors.test.mjs; no other frozen production/compiled/QA input changed.
The new common F1 adjudication is an added input. [F2 identity](t08-s2-f2-artifact-inventory.json):
217total/154QA-verification inputs, same seven SDK files. Original216f1bytes and
full failed observations retained privately. Fourth original received fields/code
remain UNKNOWN; source oracle clarification is not retroactive runtime proof.

## Next gate and limitations

Freeze exact production/compiled/QA/dependency identities and nonempty explicit
filename argv before any execution. First SDK relay may use five non-provider S2
suites plus the two proposed unchanged T03 schema/result suites in an isolated
nonsecret HOME/temp/cache environment with no product bus/network credentials.
Configured owning suite and relevant S1 startup-config/startup-ownership regressions
need a separate confirmed private real provider/ext4/CA/HTTPS preparation and relay.
They remain active requirements, not skipped/passed or silently removed.

No S2 acceptance before full active owning/relevant regression evidence and honest
cleanup. S3 actual stdio/parent integrated acceptance/clean reproduction, T07 login,
real backend/Google/Android/named-host/packaging/release are unverified and unassigned.
No dependency/shared-contract/test-oracle relaxation, staging/commit or .pi change.

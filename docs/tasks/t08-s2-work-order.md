# T08-S2 — Seven-tool adapter: accepted work-order record

**Status:** ACCEPTED c2 / SDKf2 +configuredf3. [Independent review](../evidence/t08-s2-coordinator-review.md):
112/112PASS=20owning+92relevant regressions across two same-candidate runs,
stable217-input freeze, final four Coordinator production checks exit0 and
126byte-identical compiled files, verified real isolated provider/HTTPS/release/cleanup.
Original95/99F1/unknown fourth fields and all earlier deviations preserved.
ALL source/static/build/install/target/fixture/provider/cleanup grants CLOSED;
Developer/QA HOLD. ParentT08 IN PROGRESS; S3 ready but UNASSIGNED/HELD.
[Accepted handoff](../handoffs/t08-s2.md). Following activation/grant sections are
historical records, superseded by this closure; none renews permission. **Requires:** T08-S1 [accepted c3/f2](../evidence/t08-s1-coordinator-review.md).
**Owner:** Coordinator; independent Developer w4:p2H and QA w4:p2M.
Fresh Pi sessions use openai-codex/gpt-6.1-sol with medium reasoning, as requested
for this experiment. [Opening record](../evidence/t08-s2-coordinator-start.md).
No automatic S3 successor or context renewal. Source activation is not acceptance.

## Outcome and authority

Deliver protocol factories, exact seven-tool catalogue, six strict read dispatches,
unavailable creation, canonical structured/text envelopes, tool-result budget and
owned close. The [settled public specification](../decisions/t08-s2-protocol-spec.md)
defines exact exports/signatures, SDK adapter, schema adaptation, failure precedence
and size/lifetime rules. Shared MCP draft0.2 tools/authentication and accepted T03–T06
remain normative. Preserve [S1 choices](../decisions/t08-s1-user-decisions.md) and
[S1 runtime](../decisions/t08-s1-runtime-spec.md). Use standing proportional testing
and context-safe slicing, not another broad proposal/QA planning round.

No stdio/process-entry delivery yet (S3); no login/logout, creation/visibility
precheck/admission/journal, mutable registry, remote transport, cache, autonomous
worker, dependency upgrade, backend policy expansion or named-host/release claim.
True writesEnabled cannot activate unfinished creation; valid create returns safe
configuration_required without any runtime method or backend dispatch.

## Important common decisions

- Official SDK1.32.1 Server with public fallback tools/call handling avoids the
  stock record-argument rejection; no SDK/prototype/private-map patch. Explicit
  generic SDK result validation replaces validation bypassed with that wrapper.
  [Ingress clarification](../decisions/t08-s2-sdk-ingress-adjudication.md): SDK-prefiltered
  whole-message params/metadata failures belong to S3's protocol/transport boundary,
  not S2 reply-expecting InvalidParams tests. Preserve admitted-params protocol
  errors and all known-tool malformed-argument application checks.
- Publish detached T03 output schemas plus root type:object, preserving meaning;
  accepted T03 artifacts stay unchanged. SDK client list/schema validation is a gate.
- Optional version1 config protocol.maxToolResultBytes defaults4194304, safe integer
  range4096..67108864. Measure entire serialized CallToolResult UTF-8, inclusive;
  bounded result_too_large on overflow, no truncation or full-wire/memory claim.
- Composite configured factory uses one validated config snapshot and opens S1;
  no double read/fallback. Six-method runtime API and descriptor format unchanged.
- Adapter owns transferred runtime/transport lifetime; close/disconnect awaits S1
  persistence and releases owner, closes transport, preserves safe failure outcome.
  SDK cancellation may suppress replies; no late success/automatic reconnect.

## Historical read/edit ownership — first bounded source window

**Developer:** new src/protocol/index.ts/private adapter modules. Existing
src/protocol/server.ts, root/CLI/companion remain unchanged in S2. Narrow private
src/config/ or src/runtime/ integration may add the optional protocol budget and
single-snapshot configured factory, preserving S1 exports/behavior; no new public
provider/credential/injection seam. Read production/public contracts only, never QA
sources/fixtures/private evidence/diffs. Optional task implementation ADR may extend
existing T08 ADR. No domain/auth/http/storage source changes, dependencies/manifests/
compiler/script/config relaxation without separate review.

**QA:** new test/read-protocol/ specification-derived sources/simple synthetic
fixtures and docs/evidence/t08-s2-* evidence. May extend narrow S1 config integration
checks solely for the new protocol field; preserve previous assertions. No production
source/diff/map/generated implementation reads or manifest/config/build edits.
Existing S1/foundation server-launch expectations remain unchanged until S3.

**Coordinator:** common specs/status/interface gates, separate production/QA source
reviews and exact frozen candidate/environment/source-filename relay. No private
cross-role source review disclosures or implementation-derived QA oracles.

## Environment/commands and execution holds

Use provisioned disposable Node24.21.0/npm11.19.0 for every Node/npm command:
`export PATH="$T01_NODE_HOME/bin:$PATH"`. After explicit Developer activation,
only existing production typecheck/lint:production/format:check:production/build;
locked install only in separately owned approved clean scope, never overlapping
frozen QA targets. No tests/smoke/check by Developer.

Coordinator additionally approves a narrow existing-local-Prettier repair:
pinned `node node_modules/prettier/bin/prettier.cjs --write` with an explicit
nonempty subset of changed S2 files only: src/protocol/{adapter,catalogue,errors,
index,results,validation}.ts and src/runtime/{config,index,protocolBudget,read}.ts.
These braces describe the allowed set, not command glob/expansion permission;
pass actual exact filenames. No unchanged/unrelated files, server entry, directory
fallback, download/install, new script/config or test path. Record exact argv/result;
other repair paths require separate review. Four final production checks remain.

QA source checks after explicit activation use reviewed nonempty filenames; target
execution/install/build/provider work remains prohibited without frozen relay.
S2's primary SDK Client/InMemoryTransport tests require no backend/provider. Any
configured S1 integration uses its approved isolated Linux/ext4/private real Secret
Service and synthetic HTTPS fixture scope, never ambient/personal services. No
new general harness or real credentials/resource IDs/private data in evidence.

Before target execution Coordinator freezes exact compiled inputs, QA sources,
nonempty Vitest argv, artifact hashes, safe command/environment and cleanup scope.
Any empty filename selection fails closed, never repository discovery. Preserve
full original output and safe failure identities. Source/hash/scope/output/cleanup
deviation => STOP before continuation. No tail-only pass reconstruction.

## Small acceptance matrix

| Requirement / risk | Representative check |
| --- | --- |
| Actual SDK catalogue boundary | Official Client initialize/list through linked SDK in-memory transport: seven names/order, hints, self-contained schemas and both output envelope variants validate; record observed pins/protocol, not all-version compatibility. |
| Strict application/protocol separation | Known-tool top-level and nested malformed args return invalid_arguments; omitted defaults; unknown name and malformed call/list params return protocol errors; tasks not supported. |
| Six dispatches and inert create | One meaningful success per read against simple public ReadRuntime capability; valid create invokes zero runtime methods, malformed create validates locally. Representative configured S1 true-policy integration proves no creation dispatch. |
| Safe output/error mapping | Matching structured/text/isError, exact large revision, recognized safe failure and invalid/unexpected runtime result with no native-message escape. No duplicate HTTP/auth matrix. |
| Size policy | Valid serialized result at equality and just over, escaped/Unicode case separating UTF-8/result bytes from data-only/character counts, bounded error and strict budget config/factory validation. Independent oracle, not private helper. |
| Owned cancellation/close | Held call canceled/disconnected: no late success; one runtime close; retained cleanup failure observable without unhandled rejection. Do not demand a reply SDK suppresses. |
| Config composition and imports | New optional budget preserves old valid configs and single-snapshot startup; small public-import observation/source audit, no generalized interception claim. |

Coordinator composition clarification: a signed-out/null-account isolated real
S1 profile with writesEnabled:true is sufficient for S2's representative configured
policy check; no authenticated fixture is required solely for that check. Observe
fixed create-unavailable and no synthetic HTTPS request, complemented by independent
capability dispatch checks. Preparation/execution still requires a frozen relay.
Post-open config editing proves detached/no-reload snapshot behavior, not exactly
one startup read; Coordinator source audit owns single-read and configured-budget
capture/forwarding evidence. If short signed-out errors fit both selected budgets,
unchanged responses do not prove which budget was captured. Preserve independent
adapter byte-boundary checks and strict additive config validation, and label
observable/source-audit limitations honestly. Authenticated stdio/parent proof is S3.

QA chooses small independent fixtures/cases from this matrix; no count/coverage
quota, private-function assertions or exhaustive metadata/error permutations.
Early role-scoped static/import checks, focused repairs, final full active S2 plus
relevant S1/T03 unchanged regressions. Freeze exact selections before execution.
No complete dependency/provider rerun every edit; parent integrated T08 checks,
final clean reproduction and actual stdio are S3 acceptance, not silently passed here.

## Deliverables, milestones and stops

Public declarations, production factories/config integration, independent QA
sources and safe scoped evidence, ADR, artifact identity and concise accepted/
partial/blocked handoff. Source/static readiness is not behavioral acceptance.
Target60–90-minute windows, checkpoint90, stop at two hours after safe owned
persistence settlement; honest handoff rather than weakened gates or auto-renewal.

Stop/escalate shared-contract conflict, missing accepted S1/public interface,
unapproved source/dependency changes, environment ambiguity or cleanup/hash/output
scope fault. Never hide failing exclusions/skips or modify contracts to fit code.
No .pi/settings changes, product writes, personal backend/Google/Android access,
staging/commits or release. No source/runtime window is opened by this document.

## Historical source activation

User explicitly instructed starting T08-S2 with fresh gpt-6.1-sol/medium Developer
and QA sessions. The first source window starts at the initial task prompts:
target60–90minutes, checkpoint90, stop120 after safe settlement; hold at readiness
or the stop, whichever comes first. Existing scopes above are now activated only
for Developer source/four production checks/build and QA source preparation.
Coordinator privately supplies the verified retained disposable toolchain.
No install, compiled import, suite/fixture/provider/runtime execution is authorized.
QA sends exact nonempty source filenames before any static checks.

Coordinator independently reviews each role, freezes candidate/QA identities and
nonempty file argv, confirms isolated environment/cleanup, then separately issues
a named runtime relay. Record failures and honest partial/blocked status rather
than auto-renewing or weakening checks. S3 remains unassigned/held.

## Accepted closure and next permitted action

Source gates c2/r4, exact SDKf2/configuredf3 full active S2/relevant regressions,
public protocol observation, pinned final production checks/identical build and
reviewed cleanup are accepted in the linked review. User waived90-minute checkpoint
for this run and explicitly resumed closure; a fresh Developer doc-only context
completed scoped compatibility/ADR notes, no source/runtime successor grant.
ALL windows CLOSED. Next only on separate explicit user authorization: activate
settled S3 work order, preserving S1/S2 behavior and independent frozen relays.
No stdio/parent/release claim, staging/commit, product write or automatic renewal.

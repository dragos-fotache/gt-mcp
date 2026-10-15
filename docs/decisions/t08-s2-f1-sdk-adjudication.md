# T08-S2 — First SDK relay failure adjudication

## Original evidence, preserved

Named c1/f1 SDK-only run exited1:99tests=95passed/4failed/0pending/0todo;
S2owning14passed/4failed and unchangedT03regressions81passed. Exact seven-file set,
153/153 before/after QA-input hashes unchanged, stderr empty. Coordinator independently
parsed the full original JSON/status/hash observations. All216original input bytes
(source, compiled candidate, QA sources and metadata) copied and hash-verified into
private retained storage before any new edit grant. Original failures never become
passes retroactively; no raw private paths/bodies published.

[Independent QA evidence](../evidence/t08-s2-qa-f1-sdk.md) retains exact titles and
observation hashes. Four failed cases were catalogue listing, catalogue dispatch,
admitted-call/name/task rejection, and safe read-metadata/envelope mapping. The first
two original messages identify InvalidParams. Third identifies -32603 versus an
expected -32602. Fourth reporter retains an assertion mismatch/line but omits the
actual returned fields/diff; original received error code/order is therefore UNKNOWN,
not reconstructed from source. New focused evidence must establish corrected behavior.

## F1-P1: official Client omitted tools/list params

Shared/S2 contract requires ordinary official Client initialize/list to succeed and
omitted/empty list params to be accepted. The original official Client.listTools()
without arguments failed InvalidParams. SDK1.32.1's public convenience method carries
its optional params property with undefined in the in-memory transport; JSON
serialization would omit it. This omission representation must not require a client
workaround. Fix adapter list handling for SDK's omitted optional params while keeping
supplied cursor/null/nonobject/unknown fields rejected according to ingress authority.
No change to strict tool arguments/factory options or SDK patches/dependency changes.
Both original catalogue failures stopped at list, so the six-success/schema assertions
are not yet established by this run.

## F1-Q1: unsupported task capability rejection

Existing S2 table requires **protocol rejection** of unsupported task requests, no
runtime dispatch/task authority; it does not require every task rejection to have
InvalidParams. SDK1.32.1 checks negotiated task-handler capability before invoking
the fallback and returns a standard protocol InternalError(-32603) when absent.
The original task row's uniform -32602 expectation overspecified this boundary.
An SDK-generated fixed safe capability rejection satisfies that row. Keep exact
InvalidParams expectations for ordinary admitted malformed call/name/list structures,
unknown-name fixed text, MethodNotFound for unknown methods, no data/private-message
leakage, and all known-tool malformed-argument application assertions. Narrow task
oracle correction must still prove protocol rejection and no runtime/task dispatch;
no blanket acceptance of arbitrary failures/timeouts or new task capability.
This capability gate is distinct from whole-message prefilter/S3 parse failures.

Pinned SDK1.32.1 safe-message oracle, verified from the external SDK capability
helper and public McpError formatting (not private project implementation):

- For -32603, raw protocol error message is exactly
  `Server does not support task creation (required for tools/call)`.
  The official Client's caught McpError.message is exactly
  `MCP error -32603: Server does not support task creation (required for tools/call)`.
  Require this equality, SDK McpError identity, no data/taskId/private marker and
  no runtime dispatch/task advertisement; arbitrary -32603 faults do NOT qualify.
- An ordinary adapter -32602 rejection must retain the fixed
  `Invalid parameters.` message. A Client-message predicate may allow only its
  exact SDK prefix plus at most one additional identical wrapped prefix:
  `^MCP error -32602: (?:MCP error -32602: )?Invalid parameters\\.$`.
  Do not match arbitrary message substrings or normalize unknown native errors.

These are bounded pinned-SDK observations/expectations, not cross-version promises;
experimental task APIs remain unused/unexposed.

## F1-Q2: semantic envelope plus identical serialized actual content

Shared/S2 results require semantically exact structuredContent, exactly one text
block equal to JSON.stringify(that actual structuredContent), matching isError,
no additional result fields and preservation of values/array ordering. Neither
shared JSON schemas nor S2 prescribe JSON object member insertion order.
A reply oracle must not serialize an independently expected object's insertion
order as a mandated protocol order when a semantically identical actual object may
have a different member order. That would overconstrain optional metadata without
contract authority. The original reporter did not capture actual returned fields;
do not label the original runtime cause/code as observed or proven. Correct this
oracle boundary only: retain exact semantic expected envelope and actual-structured/text identity,
root-field/content/isError constraints, values and ordered arrays. Do not compare
text to a private implementation helper or remove substantive error assertions.
Use safe code-level assertions where meaningful so new original failures retain
useful codes without dumping records/private values. New run may reveal another bug.

## Narrow repair activation

Developer: source repair OPEN only src/protocol/adapter.ts for F1-P1; optional
Developer ADR note. Existing local pinned formatter --write on adapter.ts and four
production scripts typecheck/lint:production/format:check:production/build authorized,
sequential stop/report on failure; complete original output retained. No other source,
config/domain/auth/storage/http/dependency changes or tests/target/provider/install.
Hold at source/four-check/build readiness; no rebuild after a new freeze.

QA: source repair OPEN only test/read-protocol/helpers.mjs and
validation-errors.test.mjs for F1-Q1/Q2, plus approved readiness/static evidence.
Preserve existing success/error/schema/byte/lifetime/policy assertions. Existing
source-only syntax/local Prettier write/check/local ESLint/nonexecuting resolver
checks authorized with exact two-file array and count2; all public target entries
DEFERRED. No target import/session/suite/fixture/provider/build/install grant.
Hold at revised source/static readiness.

Coordinator independently re-reviews both, freezes new identities and names a new
focused/full owning relay before execution. Do not reuse f1's execution permission,
mask failed exclusions or count source/static readiness as behavior acceptance.
Configured-policy and two relevant S1 suites remain ACTIVE/UNRUN; private real
provider provenance remains unconfirmed. No automatic context renewal/S3, live
services/product writes, .pi/settings/trust edits, staging/commits or release.

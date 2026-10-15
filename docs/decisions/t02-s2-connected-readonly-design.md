# T02 S2 connected-readonly design draft

**Audience:** coordinator and Developer only; implementation design, not QA input.
**State:** historical design draft, superseded by the
[concrete S2A work order](../tasks/t02-s2a-work-order.md). Only generic-readonly/sdk
implementation and S1 regression are now authorized; QA execution remains held.
S1 is accepted only as an unavailable-call baseline.

## Next slice must be smaller than the remaining matrix

Proposed S2A target: **generic-readonly/sdk only**, preserving no-companion/sdk.
Do not assign direct/deferred/codemode/nested, conflicts, modes, sidecar, approval,
PTY/RPC or ADR completion together with the first connected fixture.

Generic read-only means a controlled native MCP connection to the fixture's
read-only default, not an approval companion with synthetic consent. The current
experimental companion blocks non-TUI creation before the receiver; using it
here would not establish receiver-origin write_approval_required. Do not modify
that guard to make this baseline pass. Actual companion gate routes belong to a
later separate slice. Publish this profile distinction as a common contract
clarification before delegation; no QA-private expectations inform the design.

## Concrete architecture under review

1. Preserve the accepted S1 worker. Add one SDK readonly worker and one small
   shared journal helper; minimally dispatch generic-readonly from the bootstrap.
   Reuse the native provider factory, explicit runtime/model, in-memory settings,
   no-discovery named SDK factories and awaited runtime shutdown.
2. Native MCP loadConfig supplies exactly one explicit direct-exposure stdio
   fixture entry, selected Node executable and absolute approved fixture entry.
   No external URLs, sidecar flags or approval binding file. Do not manually
   pre-spawn the fixture or rely on copied-extension relative paths. The native
   MCP lifecycle owns the one child; fixture environment/argv are trusted launcher
   data, never model arguments. Confirm inherited child environment is closed.
3. Keep the native transport implementation. Observe successful discovery from
   real protocol output and actual Pi tool availability, not a constant tool list.
   At the first provider request, require all seven qualified fixture tools and
   no unrelated model tools. Prefer a tiny optional observation callback in the
   existing provider factory, reading the actual session tool inventory after
   native direct-tool startup synchronization; no provider subsystem or polling.
4. Fixture transparently observes its real StdioServerTransport.send messages.
   A real tools/list response supplies emitted tool_list names; initialize
   supplies observed negotiated protocol. Do not replace the SDK listing handler
   with a hand-written list or claim response construction alone establishes
   client discovery. Pair fixture observations with actual Pi inventory.
5. Record fixture startup and exactly-once shutdown/final ledger, including
   process ownership information in private diagnostics only. Handle stdin end,
   close and termination idempotently. A final ledger must be independently
   emitted by the receiver, never synthesized from a driver expectation.

## Journal and report decisions

Bootstrap creates the owned journal once, mode0600, before either writer starts.
Worker and fixture append protected JSON records with fixed source/layer and a
producer-local sequence. A checked single write on a local O_APPEND descriptor
emits each bounded record. No writer truncates/reinitializes the shared file;
no writer generates a supposed globally authoritative seq from local counters.

After actual child/stdio/group closure, parent parses append order and assigns
public seq=1..N. Validate producer sequences, record shape, origin and budgets;
retain the separate fixture-final ledger as an independent effects source.
A concurrent size-precheck cannot alone enforce an aggregate cap: parent must
reject over-budget files before reading/reporting success. Partial/malformed
records and exceeded budgets fail, never silently truncate into a pass.
This supported local-filesystem assumption is not arbitrary cross-host ordering.

SDK call/results append in their real callbacks, preserving native IDs. Log causal
fixture observations before their actions; never concatenate streams afterward
or reorder by producer, expected outcome or coarse timestamps. Final parent
cleanup remains last and never rewrites older events.

Passing connected report requires exactly one discovered fixture, seven actual
tools, a successful joined get_exercise result, actual creation receiver refusal
write_approval_required, no approval stimulus/listener, and exactly one fixture
final ledger with totalDispatches0/operations[]. Report effects source:fixture,
observation:fixture-final/total0; absent S1 remains source:none/not-spawned.
No missing, ambiguous or malformed final ledger becomes zero. Unknown failure
state remains clearly unverified, with bounded owned-resource cleanup.

## Proposed path limits and checkpoints

Potential edit set: driver/run.mjs, one driver/sdk-readonly-worker.mjs, one
shared journal helper under driver/, driver-files/t02-scripted-provider.mjs only
for an optional observation seam, fixture-server/server.mjs only for protocol/
lifecycle/journal observations, and metadata readiness/entry aliases. Do not
change companion approval/gate behavior, diagnostics, root config/dependencies,
scenario data/registry or accepted S1 semantics. No backend, personal state,
staging, commits or publication.

Before authorization, coordinator must verify the public transport observation
API and provider synchronization seam, exact file ownership/byte limits and
fixture shutdown path. Then publish a concrete S2A work order and a common
profile/observation clarification. Developer implements only that slice, runs
permitted checks plus generic-readonly/sdk, and stops. Coordinator reviews and
independently runs it, confirms S1 remains passing, then relays only that named
subset to QA. All other scenarios stay held; source/build/install freezes apply
throughout each QA execution window.

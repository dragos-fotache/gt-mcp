# T08-S2 — Official SDK ingress classification clarification

## Decision and authority

Coordinator resolves Developer's SDK-boundary question before target execution.
The shared MCP contract is unchanged. This clarifies the settled S2 requirement
for **requests reaching call/list handling**, consistent with S3's already settled
malformed-message failure behavior; no SDK patch or custom JSON-RPC engine.

Pinned SDK1.32.1 public JSONRPCRequestSchema incorporates object request params,
object `_meta`, protocol progress tokens (string or integer) and valid related-task
metadata shape. Protocol.connect classifies the whole message against this schema
before calling public request/fallback handlers. Schema-invalid messages produce
an SDK protocol/transport error, not an adapter InvalidParams response. Source
inspection of the dependency establishes this boundary, not executed behavior.

## Required public behavior

- SDK-admitted call/list requests keep all S2 fixed safe protocol errors. Absent
  call params, empty params, absent/nonstring name, unknown names/call-level fields,
  supplied list cursors/unknown fields, valid-shape unsupported task/related-task
  requests reach the adapter and must reject without dispatch. Unknown methods
  remain MethodNotFound. Valid known-tool malformed **arguments**, including
  null/array/primitive values, remain application invalid_arguments; no exception.
- SDK-prefiltered malformed whole-message params/metadata are transport/protocol
  failures, never application results or backend authority. S2 supplies no raw
  ingress wrapper or promised error reply for them. S3 must verify fixed orderly
  malformed-message failure, no dispatch/private diagnostic leakage, using the
  official SDK parser and owned cleanup. S3's malformed-message parse path exits65;
  its unexpected-SDK-fault retained close path exits70 as already specified.
- No SDK/private handler/prototype patch, fabricated response identity, custom
  decoder or dependency/config relaxation is authorized by this clarification.

Concrete prefiltered shapes to retain in the deferred S3 boundary inventory:
null or array request params; array `_meta`; object/boolean progressToken; invalid
related-task metadata shape. Fractional numeric progressToken is likewise outside
valid protocol metadata. Absent params are SDK-admitted and are NOT deferred.

## Independent verification disposition

QA's authored reply-expecting S2 request table included null/array params and
malformed metadata. These cases have not executed or failed. Narrowly move those
specific whole-message expectations to the explicit S3 boundary inventory; preserve
all S2-admitted invalid-params and known-tool-invalid-arguments assertions. Do not
count deferred cases as skipped/passed or use timeouts as invalid-params evidence.
No broader test deletion, oracle relaxation or hidden failing exclusion.

QA may repair only test/read-protocol/validation-errors.test.mjs for this clarified
boundary and record disposition in its approved readiness evidence. Existing approved
source-only checks may rerun with that exact single file; compiled imports and
all target/suite/fixture/provider/runtime execution remain CLOSED. Both roles use
this common decision, not each other's private source findings. Coordinator still
independently reviews the revised sources and frozen evidence before acceptance.

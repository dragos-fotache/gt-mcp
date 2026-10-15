# T06-S1 production c0 source review — NOT artifact accepted

Coordinator-only production review. Do not relay implementation details to QA.
Developer reported production checks PASS and artifact-ready/HOLD. Coordinator
read all five auth modules and the implementation ADR; no target execution or
independent acceptance occurred. Source findings below are static, not observed
runtime failures. Candidate is NOT frozen/relayed; bounded production repairs
are required before any QA execution.

## Blocking contract findings

1. **Ordinary object JSON main path:** the duplicate-key parser's object-entry
   state leaves expectValue true while expecting an object key. Reading a first
   string key calls afterValue against object-key state and rejects nonempty
   objects. Valid ServiceSession and version1 vault objects cannot take the main
   success path as written. Preserve strict duplicate/UTF-8 validation; repair
   ordinary object/nested-object/array handling, not the contract.
2. **Opaque refresh interpreted as grammar:** current validator rejects dots,
   NUL, equality with account UUID or access token. Backend v1 only specifies
   nonempty opaque strings. Coordinator's original 'not a JWT' wording was
   misleading; common work order now explicitly means DO NOT decode/infer
   identity, not reject JWT-like spelling. Remove unsupported restrictions.
3. **Mutable hook input after queue:** checkBinding/selectCredential/beforeDispatch
   validate binding at entry but later check the original caller object. Summary
   routeLabel is likewise read from the original after awaits. Detached binding
   and dispatch-summary captures must determine the invocation, not later
   mutation (including foreign-to-current change). Entry copying is normative.
4. **Trusted capability getter/method support:** own binding getters are rejected,
   though the common work order supports the documented T04 getter. Clock class/
   prototype methods are rejected despite trusted receiver-method semantics.
   Common order now explicitly settles support for own getters and prototype
   nowMs methods. Never invoke accessors in ordinary data arguments/bindings.
5. **Unapproved parse caps:** 1MiB auth byte cap and depth64 were introduced
   without a settled public operational limit; T05 configurable response budgets
   can exceed its default. Remove new auth-specific caps; do not lower accepted
   T04/T05 limits or invent service token/additive-field constraints. Depth/size
   robustness remains an implementation responsibility, not contract relaxation.
6. **Future vault version:** version-specific exact-key validation precedes
   version check. A syntactically valid future-version object with new fields
   must fail state_version_unsupported, preserve bytes, not be misclassified as
   a corrupt version1 record. Common order explicitly clarifies this priority.

## ADR interpretations adjudicated

- Malformed/foreign async hook binding => operation_interrupted; synchronous
  isCurrent returns false. Accepted, subject to entry captures.
- Malformed/inconsistent summary => invalid_arguments; consistent disallowed
  label => operation_interrupted. Accepted. T05 supplies attempt1..5, no new
  authorization derived from larger attempt values.
- Failed initial-install validation is not a trusted transition: no persistence,
  no required permanent fence. Accepted. Existing invalidation, owner drift or
  owner failure remains permanent; successful validation fences before bind.
- Refresh syntax restriction and new byte/depth caps: NOT approved (above).

## Disposition and next action

Developer may repair only the existing S1-owned production/ADR/compat paths,
run permitted production checks early, and report a new candidate then HOLD.
No tests/custom runtime diagnostics, accepted source/dependency/config changes,
S2, product writes or live fixtures. QA remains independent and receives only
updated public behavior, not this review or implementation structure.
Source readiness is not conformance; required real isolated integration and
frozen independent acceptance remain outstanding.

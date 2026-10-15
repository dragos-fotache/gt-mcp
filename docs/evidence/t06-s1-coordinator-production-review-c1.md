# T06-S1 production c1 source review — bounded boundary repairs

Coordinator-only production review; not QA input. C1 source and updated ADR
reviewed. No target/tests or independent acceptance executed. All six c0 findings
are source-repaired: ordinary object JSON, opaque refresh, detached hook inputs,
trusted capability support, removed extra caps and future-version priority.
Static source review does not establish runtime conformance.

Two remaining initial-install boundaries prevent freeze:

1. Expiry is checked before the awaited owner-vault validation, with no renewed
   check immediately before bind. A refresh deadline can expire during that await,
   then be installed despite the expired-initial-grant rejection requirement.
   Common order now explicitly settles the immediate pre-commit expiry check;
   no mutation when already expired at that boundary. It does not authorize
   retracting a commit whose credential naturally expires after it began.
2. The install sets refs.fenced itself before commit, and after bind checks only
   caller.aborted. An explicit invalidate while the commit is unresolved is not
   distinguished from the internal transition fence and does not suppress the
   returned new binding. Common order now explicitly settles local cancellation
   of that handoff: finish handling owned commit, operation_interrupted, permanent
   fence and preserved durable state. Internal transition fence alone still allows
   an ordinary successful install to return its new binding. No rollback/cleanup.

Small defensive validation cleanup: DispatchSummary route membership currently
uses prototype-aware `in`; recognized routeLabel means the actual fixed T05 labels,
not inherited Object property names. Malformed/unknown summaries must safely yield
invalid_arguments, never acquire route meaning through inherited properties.

Developer bounded repairs only within existing S1 paths, original window clock
unchanged; permitted production/static checks, then new readiness/HOLD. No QA
reads/custom runtime diagnostics, target/tests, accepted-module/config/dependency
changes or S2. These public boundary clarifications are sent to QA independently;
no implementation-derived test recipe or private source details are shared.

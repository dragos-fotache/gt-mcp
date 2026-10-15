# T05 c4 targeted production review (Developer/coordinator-private)

Source delta against frozen f2:ONLY src/http/wire.ts and its emitted JS; all other
frozen sources/declarations/artifacts and QA oracles unchanged. ADR repair history
updated by its owner. Native control isolated the observed-response truncation
race; no fixture/oracle workaround accepted.

Review: responseSeen/seenStatus set after validated accepted response head; later
request error/close now reports malformed with that status. The existing settled
flag ensures explicit timeout/abort completion still wins; no-response fallback
and parser-fault handling remain. No API/dependency/config/compiler expansion.

Coordinator public-entry probe, Node24.21.0, owned loopback sockets:5/5PASS.
- Observed read truncation: internal_error, attempts1, connections1, definite.
- Observed mutation truncation: internal_error, attempts1, connections1, uncertain.
- No-response mutation: network_error, attempts2/connections2, uncertain.
- Post-response explicit timeout: network_error, attempts1, uncertain.
- Complete response: success, attempts1/connections1.
No raw bodies/credentials persisted; fixture sockets closed. No broad new harness.

Developer reports four permitted production checks PASS. Independent clean locked
install/checks/build plus owning/regressions are still final acceptance gates.
f3relay193files freezes c4; this readiness note alone is NOT acceptance. f2failed
clean-snapshot result retained separately; QA sources held unchanged.

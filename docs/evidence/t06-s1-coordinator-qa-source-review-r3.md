# T06-S1 QA R3 source review — three focused fixture/synchronization fixes

Coordinator-only QA review. Read repaired QA sources/evidence; no target/tests
executed. R2 identity, fence-oracle, summary and representative pre-prepare-fault
fixes are source-addressed. Accepted zero-tail roundtrip now has product assertions.

Three remaining source issues block relay:

1. **Cancellation timing:** abort/invalidate immediately after calling the async
   install occurs before its queued work starts, not during bindAccount. The abort
   case additionally expects a permanent fence despite a prevented-before-commit
   cancellation (not required by common contract). Unresolved outer Promise is not
   evidence a storage transition began. Use a small trusted profile-capability
   adapter delegating to the actual isolated T04 owner: signal when public
   bindAccount is entered, control its returned Promise, then cancel/invalidate
   while the install is waiting for that public storage result. Allow/await owned
   completion; assert suppressed success and retained *committed* same-account
   grant on explicit reopen, not an empty pre-auth vault/rollback. No production
   reads or private synchronization points; no general harness needed.
2. **Expiry synchronization:** the clock changes on clock-call count. That is not
   a reliable after-owner-validation boundary oracle and depends on how many clock
   readings happen. Use a mutable fixed clock and a small delegated readVaultBytes
   gate: after initial open, signal observed owner-validation read, advance to the
   exact refresh boundary while that validation is unresolved, release it and
   verify rejection without mutation. Assertions derive from public method/expiry
   semantics, not a prescribed private sequence/call quota.
3. **Cleanup and request handling:** closeQuietly silently swallows all owner-close
   failures. An unexpected cleanup failure must fail the check, not pass. Local
   cleanup must still attempt facility removal and listener shutdown even if an
   earlier cleanup step fails. Nested finally blocks suffice; no general framework.
   Handle pending transport rejection immediately and cancel/await owned requests
   when dispatch wait/assertion fails, so test failure does not leave live work or
   an unhandled rejection. Reused bounded wait helper is appropriate.

Evidence must not describe immediate same-task abort as committed/mid-commit
coverage. Keep all real requirement assertions; small deterministic adapters are
permitted trusted test composition, not a production bypass or backend claim.

## Disposition

QA SOURCE-ONLY window reopens for these three fixes, original90/120minute clock
unchanged. Complete other source repair is held; do not expand the test matrix.
Static role-owned checks then actual readiness/HOLD. Execution CLOSED pending
named frozen relay. Production c2 source gate passes and remains HELD separately;
QA gets only common specification and its own review, never production internals.
No S1 acceptance, S2 successor, product writes, .pi changes or staging/commits.

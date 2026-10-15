# T06-S1 QA source review — initial readiness claim rejected

Coordinator-only review of QA sources/evidence. Do not relay QA internals to
Developer. User asked why QA stopped; one agent get/read showed QA idle and its
final message claiming source preparation complete/HOLD. No asynchronous milestone
had reached Coordinator. Coordinator then read QA's five new files.

## Initial disposition

NOT source-ready. Initial sources are mostly comment outlines, export/type checks
and tautological expect(true) assertions. The expiry/grant table exercises QA's
own validator, not the public target; its calendar oracle also lacks leap-second
validation. No product requirement is proved by those assertions. Static parse/
lint/format results are useful source checks, not executable acceptance readiness.

Execution being CLOSED forbids running target/tests/providers, not authoring
complete tests against the settled API. The initial artifact is partial scaffolding;
claiming that phase completed was inaccurate. No QA test execution occurred and
no frozen relay or acceptance was issued. Preserve honest historical results;
QA owns correcting its evidence and replacing placeholder assertions.

## Bounded repair grant

Reopened QA source-only repair window, original90/120minute limits unchanged:
write complete independent public-API checks with literal contract expectations,
small reused fixtures, no skips/todos/placeholders counted ready. Static source
checks allowed; target/test/provider/HTTP execution still CLOSED until named relay.

Clarified from existing public T04 spec: dist/storage/test-facility.js provides
createStorageTestFacility(), whose issued facility supplies provision/open/
armFault/cleanup; no coordinator-issued external ticket is needed for creation.
Use isolated issued roots only. Real T05 composition uses dist/http/index.js,
S1 hooks and existing synthetic test CA over loopback HTTPS with the SAME storage/
transport origin. T04 requires HTTPS; no personal provider or keyring fallback.
Final regression selection is Coordinator relay work, not a source-authoring
blocker. No new general fixture/interceptor campaign.

Asked QA to remove disposable toolchain/private paths from repository evidence,
replace them with T01_NODE_HOME placeholders, and honestly record invalid
node --check-on-Markdown/||true diagnostic usage. No masked diagnostic is a pass.
Read boundaries stay independent; send actual milestones/questions to coordinator
via asynchronous Herdr prompt rather than final-pane text alone.

## Pending

Repaired executable sources, source-quality results and honest evidence await
review. Production review and frozen relay remain separate gates. S1/T06 are not
accepted; actual product writes stay disabled; no S2 successor.

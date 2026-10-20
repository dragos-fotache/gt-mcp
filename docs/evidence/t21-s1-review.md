# T21-S1 — Contract/interface acceptance

**Disposition: accepted/closed, documentation only (2026-10-17).** Primary-agent
review under the user assignment and [work order](../tasks/t21-s1-work-order.md).
This is not independent T20 review or runtime acceptance. Parent T21 remains
incomplete; S2–S6 require separate assignment.

## Delivered behavior and interfaces

- Five shared MCP pages and shared entry summary now identify draft0.3, preserve
  draft0.2 permission history and leave backend v1 unchanged. Creation has no
  operationId, persisted journal/receipt or cross-call deduplication. Success is
  `{routineId,status:"saved"}`; every creation error/fallback has retryable:false;
  the creation idempotent hint is false. Partial/uncertain work is disclosed.
- Existing within-call resource HTTP identity, response validation, numeric/domain
  rules, encrypted credentials, exact pending refresh and auth fences remain.
- [Successor spec](../decisions/t21-single-record-storage-spec.md) settles config2,
  one authenticated binding/vault record, crypto/AAD/key lookup, storage/creation
  APIs, ownership/IO failures, setup/login/lifecycle/removal and fresh-profile refusal.
  No separate mutable descriptor, anchor, filesystem-name gate or stale-restore
  detection. Actual Btrfs support remains unverified until the owning later slices.
- [Path map](../decisions/t21-s1-path-dispositions.md) and its JSON enumerate413
  existing production/test/support paths with retained/adapted/removed dispositions.
  Recovery-only removals are explicit; mixed suites keep retained auth/domain
  oracles. No broad test exclusion or old evidence deletion.
- AGENTS/architecture/current roadmap and scoped T04/T09/T12 notices establish
  successor authority. T17 exact recovery is retired, not passed; other host/release
  gates remain. Historical evidence/task completion records are preserved.

## Verification and limits

[Documentation/input checks](t21-s1-doc-checks.json) record the final counts:
all45 shared scenario IDs unique/accounted for, complete unique413-path map, local
file/anchor links and JSON fences valid. The tools JSON Schema compiled through
installed Ajv2020 in the pinned Node runtime; the documented input passed, obsolete
operationId and missing exercises failed, and success/error examples and annotation
matched the new contract. These validate documentation, not production tools.

The baseline captured1140 repository source/test/docs/input files before S1 edits.
All1119 outside the explicit existing-document edit allowlist remain byte-identical,
including backend/other shared28 files, production/test sources, dependency/config/
packaging inputs, parked experiments and existing evidence/handoffs. No install,
build, runtime tests, fixture, provider, backend, laptop or network execution occurred.
The retained R1 tarball still hashes to
`ed5877dd16fc79043bc8773d3d15bb6fed2887dc891100ccebf8ddf2b3b22563`.
Formatting checks explicitly bypassed docs ignore rules for the new deliverables;
whitespace checks passed for the changed documentation. No skipped check is a pass.

Review caught and corrected an API gap: after key deletion during profile removal,
normal open cannot provide a cleanup handle. The spec now defines an explicit
trusted removal factory that acquires ownership and permits narrowly scoped cleanup
when the exact key is absent; account-proof cleanup cannot use unauthenticated header
hints. No external rollback/removal tombstone is reintroduced. It also clarified
that new setup creates a new root exclusively, rather than silently reusing a root
whose previous credential state disappeared.

An initial documentation transformation assertion failed before any file write;
the corrected transformation was rerun successfully. An unmatched patch likewise
made no change. Neither was an application/test failure. Subsequent checks covered
the final documents; historical package/source bytes remained stable throughout.

## Next permitted work

S2 is ready for a separate assignment: invocation-local creation, schema/result/
annotation changes and focused protocol/HTTPS checks. S3–S6 remain held. S2 still
uses prior storage temporarily and is not an installable final candidate. The
existing laptop installation and R1 application behavior are unchanged by S1.

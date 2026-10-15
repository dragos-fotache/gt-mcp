# T08-S1 QA source gate — r4 narrow safety hold

Reviewed r3 corrections in fixture aggregates, startup controls and query/close
sources against the same public specifications. Derived label, lowercase repeated
query context, explicit unsafe-file mode, deterministic missing-store rejection,
refresh-route observation and post-close reopen now address those findings.
No production implementation was used; no target behavior executed. Source-only
results remain QA-reported; future runtime import resolution remains blocked.

One safety blocker remains in buildIsolatedRuntime.releasePartial:
prepareIsolatedProfile can reject because its profile.close failed, or
openReadRuntime can reject because startup-owned close failed. releasePartial only
tracks HTTPS fixture closure; if that succeeds it deletes scratch, including durable
profile/anchor roots whose release is still uncertain. This contradicts the reported
failure-preserving teardown and the mandatory evidence/release safety boundary.

Narrow correction: retain scratch on setup failure whenever profile/runtime owner
release cannot be established; simplest conservative posture is retaining it for
any setup failure and leaving later cleanup to a confirmed safe private relay.
Listener teardown success alone is not owner-release proof. Surface failures safely,
without interpolating native/private path messages into ordinary output. No new
case, filename, harness or compiler/config change is required.

Same-nine source-only focused repair/static grant remains. QA HOLD after that
correction; no target/provider/HTTPS/fixture/suite/install execution or acceptance.
Production source gate, complete import resolution, safe isolated environment and
frozen relay remain independent prerequisites.

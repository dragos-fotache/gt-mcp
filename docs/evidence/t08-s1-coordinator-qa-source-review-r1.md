# T08-S1 independent QA source review — r1

## Disposition

QA source readiness REJECTED; focused repairs required within the existing S1
source window. No QA target execution/frozen relay authorized. Developer work is
not blocked by these QA-private findings; none are relayed as implementation oracles.

Coordinator read all nine approved .mjs sources and QA's plan, against settled S1
and normative shared tools/backend OpenAPI. No production implementation was used
to derive findings. QA-reported pinned syntax9/9, lint and formatting green are
SOURCE-ONLY results, not independent Coordinator reruns or behavior acceptance.
Future runtime-entry import resolution remains honestly blocked pending build.

## Required repairs — specification-derived

1. **False-pass setup paths.** Configured tests across ownership, reads, paging,
   errors, validation and close catch factory failure and return successfully;
   some accept any safe factory code. Missing fixture or broken startup must fail
   clearly, never turn a required success/behavior case into a passing no-op.
   Remove success-shaped catch/return and default invented fixture locations.
   Require explicitly prepared isolated fixtures; absent prerequisites are blockers,
   not skipped/pass outcomes. Always release acquired owners in finally.
2. **Non-oracles/optional assertions.** Pre-aborted valid calls and reads after
   explicit close must report operation_interrupted; own prepared draft get must
   succeed; the prepared continuation must actually be exercised; controlled
   backend error must require its exact mapped code/retry metadata. Assertions
   conditional on ok/hasMore/revision presence or accepting any string do not prove
   these requirements. Cancel/held-read outcomes need synchronization at the real
   isolated HTTPS boundary and explicit no-late-success assertions, not a race
   permitting successful or arbitrary unavailable results. Reopening after successful
   release must succeed, not return on failure. Normal callable methods may be on
   a prototype; Object.keys equality adds an unspecified enumerability requirement.
3. **Canonical/fixture completeness.** Exercise returned data must have a specified
   exact expected revision at the runtime boundary; optional guessed domain-helper
   imports do not prove S1 projection. Compare meaningful complete records/pages,
   nulls and ordered aggregate fields against independently specified fixture values,
   not merely IDs/types or a regex. OpenAPI WorkoutSummary requires startedAt and
   revision; Routine requires revision, currently absent from synthetic constructors.
   Fixture responses must match complete normative shapes, including raw numeric
   Int64 where the projection risk is exercised.
4. **Missing concrete risk checks.** Source comments are not tests: no actual unsafe/
   malformed/duplicate/version/unknown-field/bounds/descriptor-origin/file access
   fixtures are present. The configured tests rely on external placeholder config
   variables without any isolated HTTPS/provider/public-API preparation source.
   Add the smallest real fixture setup and meaningful representative metadata/owner/
   request observations needed by the work-order matrix. Verify validation prevents
   request/refresh with pending/expired auth, and begun durable refresh/close/owner
   release with simple held-response coordination. No generalized harness or fault
   cross-product. Do not execute any preparation until a separate relay is authorized.
5. **Evidence and toolchain honesty.** QA plan's status/limits still say static
   approval/checks pending despite later results. Update current disposition without
   erasing original failures/format repairs. It also discloses an initial system-Node
   invocation not in the milestone message: preserve known exact command/phases,
   versions/output and limitations from retained observations only; unknown details
   stay UNKNOWN, no retrospective reconstruction. Pinned reruns do not erase this
   environment deviation. Private provisioning-path sanitization is verified in the
   current plan. Every future Node/npm command must explicitly export the privately
   supplied T01_NODE_HOME and PATH; do not assume cross-shell inheritance.

## Common clarification and repair scope

Factory caller-input shape/field/path failures => invalid_arguments; malformed/
unsafe/incompatible config/descriptor metadata => configuration_required. This
small public clarification is added to the common S1 specification and shared with
both roles independently, not derived from production behavior. Other precedence
and startup/storage error requirements were already settled.

QA may repair only the same nine sources/simple fixtures and its S1 QA evidence;
existing exact source-only static grant remains available, with no new filenames,
configs/dependencies/test execution or target/provider/install grant. Report focused
repair results and honest remaining fixture/coverage blockers; hold at readiness or
existing stop. Runtime and complete source review remain future gates.

# T03 adjudication — pinned Zod in-memory import registries

**Decision:** coordinator-approved interpretation/test correction under the
existing T03 public specification; NOT a shared-contract change or acceptance.
**Tested target:** frozen t03-f1; production/build/spec-inventory bytes unchanged.

## Observed failure and authority

Independent QA reports T03-f1:220 tests,219 passed/1 failed; foundation100/100.
The sole failure is a blanket global-property-name equality assertion. Domain
import adds exactly __zod_globalConfig and __zod_globalRegistry; all output,
exit, forbidden-attempt, handler, resource, argv, cwd and write-observation
channels are clean. Initial failed evidence must remain unchanged.

Public T03 section2 prohibits IO, output, timers, processes, network, state
loads and global handlers. Section3 mandates Zod4.5.4. It does not prohibit
ordinary dependency in-memory metadata/configuration registry initialization.
"State loads" is private/persisted/environmental application-state access,
not allocation of dependency schema metadata. No permission/configuration guard,
credential store, fitness cache or user operation state is introduced.

## Coordinator verification

Coordinator inspected pinned installed vendor initialization, not QA-derived
production expectations:

- zod/v4/core/core.js initializes globalThis.__zod_globalConfig with an object
  if absent and exposes it as library configuration data.
- zod/v4/core/registries.js initializes globalThis.__zod_globalRegistry with
  the library registry if absent (WeakMap/Map metadata storage).
- These operations create in-memory data properties, not process event
  handlers, listeners, timers, IO, external state loads or commands.

The reviewed frozen domain imports Zod and constructs static schemas. It does
not add an application-global permission channel or retain read/creation input
in these globals. This is a narrowly identified dependency initialization
exception to the QA probe's stronger blanket-global equality, not a waiver of
any explicit forbidden effect. Removing vendor properties behind the library's
back would be an implementation workaround, not required conformance.

## Authorized QA correction and proof

QA may amend only its owning probe source/tests/evidence:

1. Add a separately isolated Zod-only control fixture importing the pinned
   public zod package, never project production contents. Record observable
   global additions and nonsecret descriptor categories only.
2. Inert control keeps EXACT zero global delta. Zod-only control must show
   exactly the two named additions, own DATA descriptors with nonnull object
   values, no accessors. No wildcard/prefix/global blanket ignore.
3. Domain import may show only that same verified pinned-dependency addition
   set; no other added/removed global names or handler/resource/output/exit/
   forbidden-attempt/write effects. Do not serialize registry/config contents.
4. Existing denial tripwires, readonly-loader guards, preflight, restoration,
   full resource/listener equality, synthetic environment and controls remain.
   Library global DATA is not permission to ignore global process handlers.
5. Repeat owning domain/foundation suites on unchanged frozen t03-f1; record
   revised QA-source inventory/hash and actual counts. Prior219/220 failed run
   remains historical evidence; no retrospective rewriting as pass.

No production rebuild/repair is needed for a test overconstraint. Developer
continues HOLD on production/source/build/install/config/ADR. Any actual target
change still requires closing the window, rebuilding and a new artifact relay.
This separate decision file is not part of t03-f1's frozen source inventory;
verify existing source/build hashes unchanged. Do not modify the frozen public
spec/ADR during this execution window to disguise a changed artifact identity.

## Limits

This accepts only Zod4.5.4's observed/verified initialization for the pinned
Node24.21.0 task. Upgrades require a new reviewed baseline; additional properties
or changed descriptor kinds fail. Instrumentation is not an OS sandbox; source
review complements it. No real writes, live state, credentials, parked-target
execution, protocol/host/backend certification, staging/commits or release pass.
Final T03 acceptance still needs independent green results and coordinator
reproduction/clean locked-install evidence.

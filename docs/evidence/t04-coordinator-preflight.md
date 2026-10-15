# T04 coordinator preflight — dependency/facility and final design decisions

**State:** public design/preflight evidence, NOT T04 production acceptance or QA
artifact relay. [Approved spec](../decisions/t04-approved-storage-spec.md) resolves
candidate interfaces; implementation remains separately gated by work order.
Initial design failures/revisions are retained in
[review](t04-coordinator-design-review.md). Role independence unchanged.

## Rev2 adjudication

Developer rev2 improved whole-store boundaries, ambiguity and lease confinement,
but accepting a `previous` manifest also accepts a restored previous ACKNOWLEDGED
snapshot. Those states are indistinguishable locally; no previous-manifest fallback
is approved. The spec requires COMMITTED=current-only; PREPARED always fails closed.
No automatic roll-forward/reconciliation in T04. Whole-state rollback still excluded.

Mutable Secret Service anchor acknowledgments also lack an established filesystem
flush contract. Coordinator inspected pinned GNOME Keyring51.1 sources:
`gkm-secret-collection.c` calls `gkm_transaction_write_file`; `gkm-transaction.c`
write_sync_close conditionally fsyncs the file then the write path renames it.
No parent-directory flush was found in that inspected path. This limited source
review does not establish daemon power-loss durability. Approved design instead
uses our own encrypted/current filesystem anchor in a separate, disjoint root,
with file+directory flushes. Secret Service keeps only the immutable master key;
key loss is fail-closed, never fallback/reconstruction.

Other decisions: one pre-auth skeleton -> verified one-way bind; atomic replacement
vault+generation; asynchronous holder digest; no explicit acquire/release API;
no foundation-interface replacement; distinct per-envelope random salt/HKDF/GCM
nonce safety argument rather than an invalid acknowledged-counter attempt bound;
explicit256MiB operational budget (not domain schema cap) with later pre-admission
headroom reservation; exact issued-root diagnostic interface in the public spec.

## Dependency evaluation (outside repository)

All npm commands used SHA256-verified provisioned Node24.21.0/npm11.19.0,
--ignore-scripts, disposable candidate directories. No root manifest/lock/config
changes, global install, lifecycle-hook execution or Pi settings changes.

1. `npm view dbus-next@0.10.2 ... --json`: metadata matched Developer's candidate,
   including optional native usocket and xml2js^0.4.17.
2. Disposable `npm install --ignore-scripts --omit=optional --no-audit --no-fund
   --save-exact dbus-next@0.10.2`:17 packages. `npm audit --omit=optional --json`
   exited1:2 moderate entries, xml2js prototype pollution
   https://github.com/advisories/GHSA-776f-qx25-q3cc and affected parent dbus-next.
   This is a FAILED candidate review, not masked or counted as passed. No root
   dependency approval and no silent override/vendoring/custom framing fallback.
3. Alternative `@homebridge/dbus-native@0.7.8` metadata: MIT, exact integrity
   in approved spec, updated xml2js^0.6.2, no optional native dependencies.
   Disposable `npm install --ignore-scripts --no-fund --save-exact
   @homebridge/dbus-native@0.7.8`:16 packages. Full `npm audit --json` exited0,
   zero advisory entries. This is bounded dependency evidence, not secure-code
   certification or a final combined root-lock audit.
4. Coordinator inspected its public index.js, bus.js and declarations. Raw
   createClient exists but declarations omit it; reviewed local unknown/structural
   adapter is permitted, no own any/compiler/declaration suppression. Address
   handling permits tcp/unixexec/fallback and default Hello can throw raw error;
   production adapter must bypass those via validated single Unix socket and
   direct/manual bounded Hello, with child output suppressed/sanitized. No
   introspection/service proxy generation required by the Secret Service subset.

Registry source:
https://registry.npmjs.org/@homebridge%2fdbus-native/0.7.8 .
Audit snapshots only reflect advisories at execution; root locked closure needs
review after the separately authorized Developer manifest edit.

## Portable real provider fixture

Read-only pacman metadata/source database supplied exact public archive filenames
and SHA256s. Downloaded via HTTPS from fastly.mirror.pkgbuild.com; verified against
those repository hashes, extracted usr/ only into a disposable directory. No
pacman installation, package hooks, global/system files or personal keyring access.

- GNOME Keyring1:51.1-1 x86_64 package archive SHA256:
  `8e6dc27e40ebadae6569098dff9fffcad4ca9f67c211951f80a17c01485b4de4`.
- gcr3.41.2-2 x86_64 archive SHA256:
  `790e5564c8560118f05452609ec1db90b928e25ca21a692ad23a954fd98eb37d`.
- Extracted daemon reported51.1; required libraries resolved with the portable
  gcr library directory and existing system libraries. This fixture depends on
  the recorded host libraries, not a self-contained product package.
- Initial tar extraction failed because colon in epoch filename was interpreted
  as remote archive syntax. Corrected with tar --force-local; no package executed
  before verification. Failure retained here, no system workaround.

Fixture invocation used `timeout ... env -i` with only provisioned PATH, fresh
HOME/XDG_DATA_HOME/XDG_CACHE_HOME/XDG_CONFIG_HOME/XDG_RUNTIME_DIR, portable library/
daemon/probe paths, followed by `dbus-run-session`. Private bus only, secrets
component only; fresh synthetic nonempty password supplied on stdin, never argv/
environment/log/evidence. No inherited personal bus/control directory. Bounded
service-start readiness checks are fixture checks, not agent status polling.

Coordinator used libsecret secret-tool only as an isolated synthetic fixture
client (not the production mechanism). Stored/read one synthetic sentinel with
assertions and no printed payload/key. Then a separate dependency probe negotiated
exact `dh-ietf1024-sha256-aes128-cbc-pkcs7` session via the alternative raw D-Bus
client, validated DH computation, and closed the session. Finally killed the
private daemon with SIGKILL, restarted against the same disposable encrypted
keyring, and asserted sentinel retrieval. Cleanup killed/waited only that fixture
process and removed only its disposable roots; dbus-run-session terminated its
private bus.

First probe FAILED (exit1) after successful store/read: diagnostic callback decoded
variant array nesting incorrectly; runtime directory also had not been created
before bus startup. Corrected fixture decoder and created restrictive runtime root
before launch. Repeated complete probe exited0:

- isolated provider store/read: PASS;
- alternative client encrypted-session negotiation: PASS;
- daemon SIGKILL/restart retained fixture: PASS.

This proves fixture/client feasibility only, not production adapter secret transfer,
locked/duplicate/error behavior, T04 stores, lease implementation, daemon power loss,
backend auth or release compatibility. QA must independently test the production
adapter on its later frozen artifact; no access to coordinator private probe code
is required. Actual provider fixture provisioning is available, acceptance pending.

## Kernel/protocol references

- Installed flock --help confirms --no-fork, direct command arguments and conflict
  exit option; --command runs a shell and is not approved.
- Pinned source reviewed: https://raw.githubusercontent.com/util-linux/util-linux/v2.42.4/sys-utils/flock.c
  shows --no-fork exec preserves lease descriptor; default fork is not the proposed
  owner topology. Node core flock assumption remains withdrawn.
- https://specifications.freedesktop.org/secret-service/latest/ch07s03.html
  defines the FULL DH/HKDF/AES session algorithm name; `OpenSession("dh",...)`
  is not that algorithm. Exact byte/reply parsing is required by the spec.
- https://raw.githubusercontent.com/GNOME/gnome-keyring/51.1/pkcs11/gkm/gkm-transaction.c
- https://raw.githubusercontent.com/GNOME/gnome-keyring/51.1/pkcs11/secret-store/gkm-secret-collection.c

## Additional feasibility checks and final clarifications

Coordinator strict no-emit TypeScript probe of the alternative package's published
declarations plus an unknown/runtime-validated local structural boundary passed
with the approved strict/NodeNext flags, no skipLibCheck or added types package.
No root production source changed. Host mount lookup reports ext4 for the available
persistent fixture parent; installed flock reports2.42.4.

A separate synthetic kernel-lease probe passed: parent opens/passes fd3 and closes
its copy; direct no-fork flock execs Node holder with inherited IPC; holder confirms
matching WRITE FLOCK via its own fdinfo, a contender exits73, holder SIGKILL releases
the kernel lease and a new contender exits0. No keys/profile bodies involved.
This is mechanism feasibility, not the production holder/source acceptance.

Developer rev3 reported exact API/diagnostic feasibility with no blocker. Coordinator
settled FQ1-FQ6 in the public spec: exact-one fdinfo lease match with bigint identities;
mountinfo ext4 identification (correcting the claim Node lacks statfs: Node24 has it,
but ext-family magic alone is insufficient); malformed/unknown IPC and post-holder-
death handles fence commit_ambiguous, not clean io_failure; INCOMPLETE empty file;
encrypted canonical path/directory identity commitments. QA reported exact API/plan
alignment. Additional single-fault error mappings and mandatory per-call immutable
key-facility recheck are explicit public requirements, not implementation-derived
expectations. Close can always release stale/fenced/key-unavailable holders.

## Private provider lock/reset controls qualification

Coordinator qualified fixture controls only, not the production adapter, under
fresh env-i/private dbus-run-session/disposable HOME-XDG with portable daemon.
Collection Lock + Locked=true verification PASS. **busctl Unlock returned success
but a prompt was required and Locked stayed true**; direct unlock is NOT qualified.
Initial control probe exited2. A separate foreground --unlock helper attempt did
not settle and exited124 under its explicit timeout; not counted passed. All
owned private fixture processes/roots were cleaned; no personal bus/GUI actions.

An explicit fixture-owned daemon SIGKILL/restart with the same encrypted private
keyring and synthetic stdin password then qualified: Locked=false and retained
synthetic sentinel asserted, exit0. This is a trusted private fixture lifecycle
control, never a production automatic unlock/prompt feature. QA helpers must use
a coordinator-supplied private reset affordance (or keep the locked negative as
an isolated last case with fixture teardown); status0 busctl alone is insufficient.
Precise reset command/environment is supplied with the later execution relay.

## Next gate

Developer/QA feasibility/coverage reports received; FQ1-FQ6 and final key/error/
namespace mappings settled. A fresh private-provider qualification again passed
store/read, encrypted-session negotiation and SIGKILL/restart retention, exit0;
fixture roots/daemons cleaned. Coordinator now opens bounded production implementation
and independent QA owning test-source windows in the work order. QA target/provider
execution remains closed until an explicit frozen relay. Baseline remains
install/production PASS, foundation100/100, T03221/221. No T04 production artifact,
frozen relay, independent storage tests or actual product writes exist yet.

Before the exclusive Developer metadata grant, coordinator retained nonsecret
package/lock/compiler baseline copies outside the repository and recorded hashes:
package.json6495846c292e25b93fc39a0f3c32b895d2e0974f42cc9d200b317e0922245916;
package-lock.json797f6c5b116ec1683e50fb010f6b1960caffa6a0e3a71fb6c7ee24c7f56b642b;
tsconfig.jsonf215c56241cf84395053ad7e4e42f59f945d5cb701b8ac085dc114063c720a71.
Root/foundation/server/CLI/companion source hashes also recorded in the command
result for later unchanged-scope review. Local spec/work-order/preflight links PASS.
No root metadata/source was changed by coordinator evaluation/qualification.

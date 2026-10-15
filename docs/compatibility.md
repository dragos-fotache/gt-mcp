# Compatibility matrix

Every product compatibility row remains **unverified**. Selection, foundation
build results and parked synthetic experiments are not product/release passes.
Current [user-approved config-only policy](decisions/routine-creation-config-policy.md)
is aligned in shared MCP draft0.2 (uncommitted working-tree revision based on9a96dcb).
Only config-file writesEnabled:true enables routine creation, without a custom or
external permission extension or per-routine prompt. Backend v1/OpenAPI1.0.0 unchanged.

| Component                                  | Selected / candidate version                                                 | Owning task / evidence boundary                   | Status                  | Limitations                                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                                    | 24.21.0 (LTS Krypton), engines >=24.21.0 <25                                 | T01 foundation; T08/T15/T17 product tests         | unverified              | import.meta.main Stability1.0/early development, accepted only for pinned inert foundation; retest upgrades                                          |
| npm                                        | 11.19.0                                                                      | T01 lock/packageManager; later clean install      | unverified              | --ignore-scripts; no lifecycle-hook requirement                                                                                                      |
| TypeScript                                 | 5.9.3                                                                        | T01 typecheck/build                               | unverified              | Strict flags; legacy inert companion skipLibCheck exception documented in T01 ADR; no new relaxation                                                 |
| Official MCP SDK                           | 1.32.1                                                                       | T08 stdio and T15 integration                     | unverified              | v1 maintenance horizon recorded in T01 ADR; no general protocol claim                                                                                |
| MCP protocol                               | candidate2025-11-25                                                          | T08/T17 actual product negotiation                | unverified              | Parked synthetic fixture negotiation is not product/host certification                                                                               |
| Zod                                        | 4.5.4                                                                        | T03 schema/lossless codec                         | unverified              | No domain implementation in T01; exact Int64 proof still required                                                                                    |
| Vitest                                     | 4.1.11                                                                       | Independent task suites                           | unverified              | Discovery test/**/*.test.mjs; no pass-with-no-tests or silent parked/failing suite exclusion                                                         |
| Node types                                 | 24.19.2                                                                      | T01 declarations                                  | unverified              | Dev-only                                                                                                                                             |
| ESLint / JS / TS ESLint / Prettier         | 10.12.0 /10.0.1 /8.71.1 /3.9.10                                              | T01 tooling                                       | unverified              | Dev-only; exact package versions/integrities in lockfile                                                                                             |
| Pi runtime                                 | coding-agent1.1.0 locked development pin                                     | T17 ordinary portable-server interoperability     | unverified              | No required permission companion; supported paths/modes need actual evidence                                                                         |
| Config-file routine-creation guard         | writesEnabled strict boolean, default false                                  | T09/T15/T17                                       | unverified              | True allows valid authenticated explicit calls without confirmation; no extension/UI/client metadata enablement; normal auth/recovery still required |
| Pi companion / approval ordering           | Retired product scope; T02 parked                                            | Historical T01 inert scaffold/T02 experiment only | not in current delivery | Preserve four accepted slices/six synthetic SDK profiles and unaccepted R3 candidate; no PTY/overall T02 or product approval certification           |
| OS / secret facility                       | Linux x64 Secret Service key + ext4 anchor; dbus-native0.7.8 locked          | T04                                               | unverified              | Production interop, lease contention, PREPARED-kill fencing, power loss pending QA relay/review                                                      |
| Backend / OpenAPI / shared docs            | Backend v1/OpenAPI1.0.0; committed9a96dcb plus MCP draft0.2 working revision | T16                                               | unverified              | Shared policy aligned; no backend/domain/schema change or live service touched                                                                       |
| Google / helper origin                     | Unselected placeholders                                                      | T07/T19                                           | unverified              | No audience/client ID/registered port invented                                                                                                       |
| Android sync observation                   | Unselected                                                                   | T16                                               | unverified              | Ordinary sync observation, not immediate/offline delivery guarantee                                                                                  |
| Artifact / journal / intent / key upgrades | T04 GTMS2 v1 envelopes, anchor v1, digest v1 built                           | T04 built; T11/T18 own upgrades                   | unverified              | Exact-byte migration/ownership/recovery fences need proof; T04 interop pending QA relay                                                              |

### T08-S2 SDK-factory observations (bounded evidence, not a matrix row)

Coordinator independently observed the same c2 candidate pass SDK 99/99 and
configured 13/13: 112/112 total (20 S2 owning checks, 92 regressions), with all
217 input hashes stable. Source audit confirmed one validated startup snapshot
and result-budget forwarding. SDK 1.32.1 / Zod 4.5.4 on Node 24.21.0 / npm
11.19.0 were used; supplemental actual Client/InMemoryTransport initialization
negotiated 2025-11-25. These observations cover seven tools, six read dispatches,
full schemas and semantically matching structured results with text equal to
JSON.stringify of the actual structured content.

`protocol.maxToolResultBytes` defaults to 4194304, with inclusive range
4096..67108864. It measures the whole serialized CallToolResult in UTF-8,
including duplicate text; equality passes and overflow replaces the result,
without truncation. It is not a whole-wire or memory bound. Real isolated
GNOME 51.1 / ext4 / private-CA HTTPS signed-out composition with
`writesEnabled:true` demonstrated inert creation: true config cannot activate
the placeholder. This is not authenticated stdio, login, host, real-backend or
release verification.

The [common S2 specification](decisions/t08-s2-protocol-spec.md) and
[Coordinator closure review](evidence/t08-s2-coordinator-review.md) bound any
acceptance; this section is not a blanket product claim. The
[original f1 adjudication](decisions/t08-s2-f1-sdk-adjudication.md) remains
95/99 with four failures; the original fourth failure's returned fields remain
UNKNOWN. Historical notes and broad component statuses above remain unchanged.
Parent T08 is incomplete; S3 is unassigned and held.

### T05 transport implementation notes (unverified prose, not a matrix row)

The fixed-origin backend transport is implemented in `src/http/` (Node
builtins `http`/`https` plus the public T03 entry; no new dependencies)
with budgets, hook order, sticky uncertainty, and error mapping per the
approved T05 transport specification. No compatibility status is claimed:
wire/TLS behavior, lossless numeric results, loopback fixtures, and host
interoperability remain pending independent QA relay and coordinator
review. The 17 component rows above are unchanged.

### T06-S1 session state notes (unverified prose, not a matrix row)

The version-1 session vault reader, initial service-grant installation,
exact-expiry decisions, and read-only T05-compatible hooks are implemented
in `src/auth/` (no new dependencies; type-only T04/T05 reuse) per the
S1 work order. No compatibility status is claimed: persistence identity,
transport hook order, expiry boundaries, and fence behavior remain pending
independent QA relay and coordinator review. The 17 component rows above
are unchanged. No refresh, lifecycle, browser, MCP, or write behavior is
supplied in S1.

### T06-S2 durable refresh rotation notes (unverified prose, not a matrix row)

The refresh-only rotation capability is implemented in `src/auth/`
(`refresh.ts` plus an additive version-2 vault codec; no new
dependencies; one unchanged T05 transport constructed internally per
facade) per the S2 work order: exact durable predecessor/token/body/key
persistence before dispatch, single shared serialized attempt with
conservative pending retention and follower cancellation, atomic
same-account successor installation with joint pending clearing, and
blocked recovery state without replay. S1 exports and behavior are
preserved. No compatibility status is claimed: durable
predecessor/body/key-before-dispatch identity, shared-attempt behavior,
transport hook order, commit-failure/cancellation boundaries, and fence
behavior remain pending independent QA relay and coordinator review. The
17 component rows above are unchanged. No restart replay, retry,
lifecycle, browser, MCP, or write behavior is supplied in S2.

### T06-S3 exact refresh recovery notes (unverified prose, not a matrix row)

The recoverable refresh-session capability is implemented in `src/auth/`
(`recover.ts` plus one additive entry export; no new dependencies, vault
version, or error codes; one unchanged T05 transport constructed
internally per facade) per the S3 work order: explicit original-attempt
replay with durable body/key even after local predecessor expiry, atomic
recovered installation with pending cleared before any distinct rotation,
at most one follow-on fresh rotation with a distinct key (two control
requests per cycle at most), read-only live no-op and expired-refresh
refusal without commit/dispatch, full pending retention on every failed
replay, shared entire-cycle semantics for concurrent valid recover
callers with follower-local cancellation, and different-kind overlap
rejection without joining or disturbing the leader. S1/S2 exports and
behavior are preserved. No compatibility status is claimed: exact replay
identity after lost response/close/reopen, install-before-prepare
ordering, follow-on bounds, shared-cycle/cancellation boundaries, and
fence behavior remain pending independent QA relay and coordinator
review. The 17 component rows above are unchanged. No resource
orchestration, lifecycle, browser, MCP, or write behavior is supplied in
S3.

## Parked work and scope boundary

The custom extension lives in experiments/t02/companion, with driver and fixture
separate; production companion/src remains inert T01 scaffolding. Neither is
required for the config-only server. Old package/compiler/Pi pins remain untouched
by this documentation revision. Later removal/package/build reconciliation needs
an explicit Developer-owned window and relevant independent regressions.

Historical T02 acceptance records preserve failures/repairs under the old experiment
contract. R3 is candidate artifact-ready only; no independent QA artifact relay.
No new test, protocol, config-guard, host or release acceptance is claimed here.

### T06-S4 authenticated requests notes (unverified prose, not a matrix row)

The authenticated-request capability is implemented in `src/auth/`
(`authenticated.ts` plus one additive entry export; no new npm
dependencies, vault version, or error codes; one unchanged T05 transport
constructed internally per facade with privately capped resource attempts)
per the S4 work order: read-only v1/v2 open, exact pre-refresh local
validation (T03 query parser plus T05-exact body gates), shared
serialized auth controller with exact S3 pending-recovery priority and
durable fresh rotation, nine fixed resource methods with single-attempt
legs and at most one 401 refresh-and-retry, private volatile
grant-revision reuse for concurrent/delayed 401s, unchanged captured
identity across the retry, safe error mapping with pending retention and
mutation-uncertainty preservation, and cancellation-owned commit
settlement with permanent invalidate fence. S1/S2/S3 exports and behavior
are preserved. No compatibility status is claimed: live/preflight/replay/
rotation ordering, revision reuse, cancellation/invalidate settlement,
unresolved-auth mapping, uncertainty preservation, and hook order remain
pending independent QA relay and coordinator review. The 17 component rows
above are unchanged. No lifecycle, browser, MCP, or write behavior is
supplied in S4.

### T06-S5 trusted lifecycle notes (unverified prose, not a matrix row)

The trusted-lifecycle capability is implemented in `src/auth/`
(`lifecycle.ts` plus additive version-3 vault codec and two additive entry
exports; no new npm dependencies, config, or error codes; one unchanged
T05 resource transport plus a neutral-hook cleanup transport per facade)
per the S5 work order: read-only empty/v1/v2/v3 open with bound-account
gate, strict v3 superseded-evidence retention with older factories still
refusing v3 safely, full S4 resource/auth semantics with v3-preserving
refresh transitions, fence-first `signOut`/`replaceGrant` via one T04
`advanceSessionGeneration` with begun-commit settlement and no optimistic
repair, durable clearing before best-effort logout bounded by one shared
monotonic nonrenewable `totalDeadlineMs` window with safe settlement, clock-callback
interruption priority at both replacement deadline boundaries, and shared-deadline
admission rechecked at logout pre-dispatch and final wire handoff (no new wire
attempt after original expiry), and integrated
stale read/write/refresh suppression. S1–S4 exports and behavior are preserved. No compatibility
status is claimed: validation/retention/old-version refusal, replacement
evidence and restart isolation, offline sign-out ordering, and
representative lifecycle races remain pending independent QA relay and
coordinator review. The 17 component rows above are unchanged. No browser,
MCP, journal/creation, caching/cleanup, deletion, or successor behavior is
supplied in S5.

### T08-S3 stdio implementation scope

The actual server entry now composes the accepted runtime and SDK adapter over
local stdio. Node 24.21.0 / npm 11.19.0 / SDK 1.32.1 remain pinned. Public SDK
parsing/serialization, strict UTF-8, 10 MiB input buffering, initialization gating,
fixed diagnostics, callback-based output and owned graceful cleanup implement the
settled S3 contract. See [launch and privacy notes](stdio-server.md).

Current acceptance results are recorded separately in the S3 review; historical
S2 and earlier unassigned descriptions above are prior checkpoints. No named Pi,
Google/browser, live-backend, Android, product-write or release compatibility is
implied by local stdio implementation.

Observed local boundary: actual SDK/stdin-stdout read server on Node 24.21.0 /
npm 11.19.0 / SDK 1.32.1 / protocol 2025-11-25. [T08 acceptance](evidence/t08-s3-review.md)
records active941/941 and clean T08 replay82/82, isolated provider/HTTPS and
lifecycle checks. Named hosts/live services/release remain unverified. This is
local task evidence; the 17 product compatibility rows above remain unchanged.

### T07-S1 protected login composition

The additive `src/login/index.ts` entry provides trusted setup, protected exchange,
initial/same-account session installation and explicit binding-publication recovery.
Temporary v4 vaults require trusted login recovery and remain unsupported by T08
startup. Settled grants use the existing v3 format, strict T08 config and descriptor.
No dependency, public auth/storage contract or packaging change is required.

[S1 evidence](evidence/t07-s1-review.md) records isolated Secret Service/ext4/HTTPS
and T08 read integration plus focused replay/fence/metadata checks. Browser GIS,
executable login commands, genuine Google/backend interoperability, named hosts,
Android, routine creation and release remain outside this slice. Operators cannot
yet invoke a delivered login CLI; S3 owns that delivery.

### T07-S2 secured browser helper

The additive startBrowserLoginHelper entry now reserves both fixed-port loopback
listeners before S1 challenge creation and serves the nonce-protected GIS page,
credential callback and Cancel route. Strict Host/Origin/CSRF, bounded HTTP input,
single callback admission and owned cleanup compose with S1 persistence/recovery.
No dependency, package entry, model tool or existing configuration change is made.

[S2 evidence](evidence/t07-s2-review.md) records real loopback, controlled page/GIS,
isolated S1 storage/HTTPS and unchanged-regression checks. Actual Google/browser
interoperability and CSP enforcement remain T19 gates. Fixed browser launching,
process signal wiring and operator CLI delivery remain S3; no executable login
workflow is claimed yet. The product compatibility matrix above remains unchanged.

### T07-S3 trusted CLI delivery

The compiled `node dist/cli/main.js` entry delivers setup/login/resume/cancel/
recover, fixed Linux desktop launching, fixed stderr-only guidance and bounded
owned cancellation/cleanup. Configured browser composition captures one settings
snapshot for S1 and S2. Legacy package/bin wiring remains unchanged for T18.

[S3 evidence](evidence/t07-s3-review.md) records actual process/SDK stdio workflows
with isolated Secret Service/ext4/HTTPS and a trusted controlled launcher. Direct
entry checks exercise non-browser commands, strict usage and headless failure.
The selected /usr/bin/xdg-open desktop success/timeout behavior and genuine Google/
browser interoperability are not runtime-certified by those fixtures. Named
host/backend/Android/release gates remain separate; creation remains unavailable.
The historical S2-only CLI boundary above is superseded by this delivery; the
17 product compatibility rows remain unchanged.

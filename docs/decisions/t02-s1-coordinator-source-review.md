# T02 S1 source review and bounded repair order

**Audience:** coordinator and Developer only; implementation review, not QA input.
**Disposition:** S1 is not artifact-ready. QA execution remains held. Only the
same `no-companion/sdk` repair is authorized; S2+ stays unauthorized.

Coordinator independently passed `npm run typecheck`, `npm run t02:build`,
`npm run lint:t02` and `npm run format:check:t02` on Node 24.21.0/npm 11.19.0.
No target diagnostic was rerun: source isolation/evidence concerns must be
resolved first. No QA suite diagnostics inform these findings.

Native provider wiring, explicit child environment, genuine runtime event
subscription and awaited `runtime.dispose()` are useful progress. They do not
resolve these blockers:

1. **Closed resources/configuration are incomplete.** Loader options do not set
   `noExtensions:true`; the three factories are anonymous, and validation accepts
   any three structurally similar `<...>` entries. Runtime version probing still
   runs `npm` from the inherited bootstrap environment.
2. **Actual mode/UI context is not observed.** Preflight reports mode/hasUI null
   and later records only a requested `bind-mode:print` string.
3. **Chronology is still reconstructed.** Subscription callbacks collect maps;
   call/result records are appended after prompt completion. A missing end event
   is converted into an invented `isError:true` result.
4. **No-spawn/effects are asserted, not adequately observed.** Ledger/socket
   absence is insufficient; parent effects are unconditional. Unexpected files
   do not even cause worker failure. This cannot prove no transport was attempted.
5. **Cleanup/completion can pass unsupported claims.** Parent waits for `exit`,
   not stdio `close`; timeout resolves immediately after signaling. It removes
   roots even if the owned group survives. `completed` ignores rootsRemoved and
   listener observations, and assumes listenersClosed in its fallback record.
   Worker logs cleanup before runtime disposal and force-exits on success.
6. **Budgets/protected records and metadata are incomplete.** Journal is unbounded,
   envelope fields can be overwritten by payload fields, truncation does not
   prevent completion, and metadata sdkWorker still points to the deleted file.

## Exact repair design

Keep the existing native provider factory. Use only already authorized S1 paths,
including `roots.mjs` and `report.mjs` for narrow corrections; no new subsystem,
dependencies, matrix runs, companion/fixture/diagnostic behavior or QA access.

- Use in-memory settings with empty tools and retry/compaction disabled. Set
  noExtensions/noSkills/noPromptTemplates/noThemes/noContextFiles on the loader.
  Supply named inline objects for the three installed native factories and one
  small launcher observer. Validate the exact expected identities/surfaces from
  actual loader metadata, including the observer; no startsWith-only allowlist.
- For **this absent-only S1**, construct native `createMcpExtension` with the public
  `loadConfig` callback returning `{servers:[],errors:[],autoEnableCodemode:false}`.
  Record when the native extension actually invokes it. Set public
  `createTransport` to a fail-closed counter/throw guard: any invocation increments
  an observed attempt and fails the scenario before any transport can be created.
  This is intentionally no transport, not a mocked successful MCP connection.
- The named observer captures genuine `session_start`/`session_shutdown` contexts
  and `pi.getMcpServers()` (extension registrations). Combine observed empty
  configuration, zero registrations before/after the attempted call, zero
  transport attempts and owned-group cleanup to substantiate absence. File/socket
  absence is corroboration only. Unexpected state fails explicitly. Do not claim
  this absent-only guard establishes connected MCP or approval feasibility.
- Emit inventory separately before bind, then preflight with actual ctx.mode,
  ctx.hasUI and uiInjected:false. Record registration:none before the attempted
  creation using the observed state, not a desired scenario flag.
- Append native tool_call/tool_result directly inside start/end event callbacks;
  parse the actual end result for code/reason. Preserve actual isError and IDs.
  Reconcile with turn/transcript afterward; throw on missing/unmatched endpoints,
  never fabricate an error. Require the real expected creation attempt and joined
  unavailable outcome. Track timeout explicitly even if abort resolves normally.
- Protect seq/source/type/layer from payload overrides. Use a checked synchronous
  single write per bounded JSONL record, mode 0600, an aggregate byte budget and
  parent size validation before reading. S1 has one journal writer; cross-process
  sequence ownership remains an S2 design checkpoint.
- Probe npm in the sanitized worker (or an explicitly sanitized disposable child),
  never via inherited bootstrap defaults. Name installed package versions, with
  lock integrity references distinguished from actual installed-version readings.
- Worker awaits runtime disposal before final observations/result; finish naturally
  with flushed stdout, not `process.exit(0)`. Parent awaits child/stdio closure.
  Timeout/error cleanup must await reaping before journal reads or root deletion.
  Signal only the owned live worker/group. If owned-resource disappearance remains
  unknown, fail and retain sanitized resource ownership information; do not remove
  roots or publish passing cleanup. No timeout socket probe becomes success.
- Final completion must include worker success, actual absence/outcome validation,
  valid bounded journal, no truncation/timeout, observed group/listener closure and
  successful root removal. Do not silently overwrite contradictory worker cleanup
  or fabricate source:none/not-spawned/zero on an unverified failure path.
- Fix metadata sdkWorker to `driver/sdk-s1-worker.mjs`; clearly mark current
  implementation partial and only no-companion/sdk as a candidate launchable
  subset. Other declared registry combinations remain planned, not ready. Do not
  create PTY/RPC files merely to satisfy inventory.

Run the four permitted checks and only the single no-companion SDK diagnostic.
Send a sanitized completion/blocker report and stop. Coordinator will inspect the
repair and run its own isolated diagnostic before any QA subset relay. The
approved public scenario/report contract is unchanged.

## Re-review: isolated healthy-path observation

The repaired artifact was independently run as `no-companion/sdk` in a closed
parent environment with disposable HOME/TMPDIR/agent/session roots and two
nonsecret synthetic environment sentinels. Exit 0, 750 ms; stdout and the
operator-owned report file agreed. Actual mode:print/hasUI:false; one native
creation attempt joined to isError:true/code:null/reason:unknown-tool;
loadConfigCalls:1/transportAttempts:0; all four exact named resource profiles;
13 parsed journal records; no remaining experimental roots. This is SDK
unavailable-call evidence, not approval/gate feasibility or S1 acceptance.

Final narrow corrections were issued before QA relay: context-bearing public
preflight instead of null inventory fields; before/after/shutdown registration
observations; final parent cleanup appended after worker closure/root removal
rather than patched into an earlier record; no unconditional zero effects on
unverified failure; actual close/reap/read/remove gating; strict filesystem
errors and complete endpoint/abort handling. QA remains held. No S2+ work is
assigned and no QA diagnostics informed these corrections.

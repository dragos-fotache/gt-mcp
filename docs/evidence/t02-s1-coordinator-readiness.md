# T02 S1 coordinator artifact readiness

**Audience:** coordinator and Developer. QA uses the explicit subset relay,
public approved experiment specification and metadata, not implementation review.
**Scope:** `no-companion/sdk` only. This is an actual SDK unavailable-call
baseline; it does not establish gate, approval, sidecar, connected fixture or TUI
feasibility. T02 remains in progress. All other combinations remain held.

## Source disposition

The bounded S1 review blockers are resolved for artifact readiness. Native local
provider wiring uses the same explicit runtime/model; resources and configuration
are closed; real context supplies public preflight; native call/results retain
IDs and callback chronology; registration precedes the attempt; shutdown is
observed; one final parent cleanup follows worker closure and root removal.

After Developer paused, coordinator took temporary integration ownership of
`experiments/t02/driver/run.mjs` and `driver/sdk-s1-worker.mjs` and corrected:
actual close-event tracking on error/timeout; signaling only a still-live owned
worker group; journal reads gated by known closure/group disappearance;
listener closure required before root removal; verified effects conditioned on
worker/stream/journal success; explicit post-call registration snapshot; and
unknown shutdown registration state failing closed. No QA diagnostics informed
these changes. No other subsystem, dependency or manifest was changed.

## Independent checks

Selected toolchain: Node 24.21.0/npm 11.19.0. Independently passed:

```sh
npm run typecheck
npm run t02:build
npm run lint:t02
npm run format:check:t02
```

The typecheck covers root, inert companion and experimental companion configs.
No QA suite was invoked by Developer or during these coordinator build checks.

## Independent isolated runtime observations

Public command:

```sh
node experiments/t02/driver/run.mjs --scenario no-companion --harness sdk --out <disposable-report.json>
```

The coordinator supervisor supplied a closed environment with disposable
HOME/TMPDIR/Pi-agent/session roots, selected Node executable and two nonsecret
synthetic environment sentinels. No personal settings or credentials were
copied. Stdout and the operator-owned report file matched.

Healthy run: exit 0, 685 ms; 15 journal records plus final parent cleanup (16
report records). Actual preflight mode:print/hasUI:false/uiInjected:false. Native
empty configuration was loaded once; zero transports attempted; registrations
empty before/after call and at shutdown. Exactly one native creation call joined
to isError:true/code:null/reason:unknown-tool. Registration:none preceded it;
native shutdown followed it; worker-done preceded final parent cleanup. Effects
source:none/observation:not-spawned/total:0. Actual stdio close and owned-group
absence observed; listeners closed, roots removed, remaining counts zero. The
outer supervisor independently found no remaining experimental roots.

Same-target failure control: PATH intentionally excluded npm while the selected
Node executable remained absolute. No new scenario, backend or tool arguments
were introduced. Native shutdown occurred, then runtime probing failed. Exit 1,
607 ms; completed:false; effects observation:unverified/total:null rather than a
fabricated zero. Stdio close and group absence observed; roots intentionally
retained because final worker closure evidence was incomplete. The supervisor
removed its own disposable outer tree only after known process closure. This is
a report-failure control, not approval or interactivity evidence.

Timeout, oversized-output and malformed-journal failure paths are not claimed as
behaviorally calibrated by this S1 checkpoint. They remain later verification
work; no general runtime certification is implied.

## Handoff

Artifact is ready for independent QA execution of **only no-companion/sdk**.
Developer stays paused and all source/build/install mutations are frozen during
that execution. QA does not receive or read this implementation review. No other
scenario or suite-wide target execution is authorized. S2 requires a fresh
coordinator-designed work order after the bounded QA result is reviewed.

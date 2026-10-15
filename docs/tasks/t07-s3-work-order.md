# T07-S3 — Trusted CLI delivery and parent integration

Status: COMPLETE, user-assigned and verified on2026-10-15. See
[S3 and parent acceptance](../evidence/t07-s3-review.md). Direct primary implementation
with optional bounded helpers; prior user override of QA/Developer/Herdr relays
continues. This assignment completes T07 only; no successor is authorized.

## Outcome and authority

Deliver compiled `dist/cli/main.js` setup/login/resume/cancel/recover workflow,
fixed Linux browser launching, safe diagnostics/signals and operator guidance.
Follow shared MCP draft0.2/backend v1, accepted S1/S2/T04/T05/T06/T08 and the
[T07 design](../decisions/t07-general-design-and-slices.md). No backend API/policy
changes, model-facing login, token paste/argv/environment input, account switching,
routine creation, broader T12 lifecycle, real Google/backend or release claim.
Keep legacy cli/index and package/bin wiring unchanged; T18 owns packaging.

## Frozen interface and behavior

New inert CLI module exports async main(args,io?,launcher?) -> Promise<number>.
io has stderr(text):void|Promise<void>; no stdout output. launcher is a trusted
library composition capability (url,signal)->Promise<void>, default fixed production
launcher. The executable guard supplies no overrides. It is not a CLI flag,
environment/config provider override or model route. This small seam permits
successful compiled-main child-process tests without opening a personal browser.

Accepted commands (command first, following flags any order):

```text
node dist/cli/main.js --help
node dist/cli/main.js setup --config <absolute normalized path>
node dist/cli/main.js recover --config <absolute normalized path>
node dist/cli/main.js login --config <path> --login-config <path>
node dist/cli/main.js login --config <path> --login-config <path> --resume
node dist/cli/main.js login --config <path> --login-config <path> --cancel
```

Only these exact flags/commands; duplicates, unknowns, extra positionals, missing
values, unnormalized/relative/control-bearing paths, login flags on other commands
or simultaneous resume/cancel fail before filesystem/network/browser/signal IO.
Exact standalone --help writes fixed usage to stderr and exits0. All stdout empty.
No ambient config lookup. No IDs, paths, client IDs, bodies, tokens or native
exceptions in diagnostics; only fixed safe status/guidance.

setup uses S1 provisioning/publication and discloses unresolved evidence retention
and host/model transcript exposure through fixed stderr guidance. recover only
reconciles recorded metadata. resume/cancel use S1 directly, never helper/browser/
new challenge. Normal login reserves S2 listeners, obtains one challenge and
launches its exact canonical localhost URL. An additive configured browser factory
captures/validates files once and passes identical settings/budgets to S1 and S2;
it releases acquired ownership on all failures. Existing configured S1 behavior
remains unchanged through the shared internal composition.

SIGINT and SIGTERM both map to cancellation130. Register only during valid main
execution; remove all handlers after owned settlement. Abort browser/network,
cancel helper/transaction, await already-begun persistence and release. Signals
during uninterruptible setup/recover await those operations without rollback or
claiming their effects undone. Recovery/storage ambiguity takes precedence as3;
otherwise cancellation suppresses success. No process.exit or global import hooks.
Unexpected exchange failure preserves bounded exact S1 recovery; launcher failure
cancels active foreground attempt and releases all owned resources. Completion
can settle while launcher is pending; abort/reap that owned launcher before exit.

Exit codes:0 acknowledged completion;2 usage/unsafe or missing configuration;
3 ownership/storage/corrupt/version/metadata recovery required;4 sign-in/provider/
network/expiry/no resumable attempt/unsupported launcher/internal failure;130
cancellation. Cleanup ambiguity maps3. A begun install may have committed; report
recovery required, never claim rollback or revocation. Failed stderr writes never
fall back to stdout or expose native exceptions.

## Fixed launcher baseline

Linux only; exact executable /usr/bin/xdg-open, one URL argument, shell:false,
stdio ignored. Require DISPLAY or WAYLAND_DISPLAY and executable availability;
otherwise fixed sign-in/setup guidance. Validate URL is exactly an accepted
canonical localhost origin plus /, no token/query/fragment/path/credentials.
Ignore BROWSER and caller executable settings. Pass only ordinary explicitly
allowlisted desktop/home/XDG/PATH/LANG environment, never arbitrary credential
environment. PATH fixed /usr/bin:/bin. No new external invocation during tests:
use trusted launcher capability; direct default path tested headless/refusal.
An invalid URL/signal fails invalid_arguments before any launcher IO; this is
argument validation, distinct from sign_in_failed after desktop/spawn checks.

Await launcher exit0 as handoff acknowledgement, with a10s total bound. On abort/
timeout terminate only the owned child, escalate after500ms, and await reaping.
Nonzero/spawn failure -> sign_in_failed; cancellation -> operation_interrupted.
No shell interpolation, command strings, custom executable or token-paste fallback.
This is selected support, not actual desktop/Google interoperability evidence.

## Edits, execution and proportional acceptance

Own new src/cli/main.ts/launcher.ts, additive configured login composition, login
entry export, focused test/login/cli-*.test.mjs/helpers, operator guide and scoped
ADR/status/evidence. No dependency, compiler relaxation or manifest change. Reuse
S1/S2 isolated fixtures; no general interception/browser harness. Preserve tests
and prior evidence; repair only concrete integration defects within scope.

Pin provisioned Node24.21.0/npm11.19.0 for every command. Allowed locked install
--ignore-scripts, production static/build checks, focused tests and final complete
active T07 plus relevant unchanged T08/foundation/provider regressions. Use only
owned loopback and disposable Secret Service/ext4/private-CA HTTPS. No personal
bus/backend/browser/credentials or product writes, .pi edits/staging/commits.

Focused acceptance: strict no-IO usage/import behavior; actual compiled process
setup/resume/cancel/recover and safe diagnostics; successful compiled-main process
with trusted controlled launcher then actual SDK stdio read; same-account re-login;
exact uncertain restart replay; metadata recovery; competing owner; signals and
cleanup; headless/launcher failure; disclosure and empty stdout. Final full active
T07 suite and relevant unchanged regressions, clean locked reproduction/compiled
identity and honest original failure/repair evidence. No exhaustive permutations,
general runtime harness or live Google claim. Missing isolated prerequisites block
affected checks, never skip. Stop on contract conflicts, uncertain storage authority,
new dependency needs or inability to release owned resources. Finish T07 only.

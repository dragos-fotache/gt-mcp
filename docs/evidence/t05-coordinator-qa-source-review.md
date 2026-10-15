# T05 coordinator independent QA source review — round1

**Disposition: NOT source-ready for artifact execution.** Coordinator read all13
owning mjs sources plus QA readiness/plan against approved public spec. No
production source consulted for these findings, no owning targets/tests/lint run.
This QA-private review is NOT Developer input. Keep role boundaries. Existing
QA sources/evidence remain owned by QA; coordinator changes none of them.

## Objective defects to repair

1. **Broken relative imports:** all three fault suites import
   `../unit/t05/helpers.mjs`; from test/fault/t05 this resolves to nonexistent
   test/fault/unit/t05. Correct to the owning unit helper path. Read-only path
   validator confirmed all three failures; no target execution needed.
2. **Undeclared binding:** 02-validation-identity uses ACCOUNT_B without importing
   it. Repair all unresolved/unused bindings and source lint issues in scope;
   do not count parse-only syntax as an import-resolution or lint pass.
3. **Impossible request-size oracles:** draftBody is45UTF8 bytes, not >64; test
   expecting request_too_large at64 is wrong. Equality45 sets an illegal factory
   budget below64. Construct legitimate whitespace-preserving bodies >=64 and
   measure exact independent byte counts for equality/+1. budgetTransport passes
   budgets:undefined in one case although explicit undefined rejects by spec;
   omit absent options. Remove dead duplicate handle/setup that masks assertions.
4. **Wrong status/code fixtures:** errorBody always400 but tests feed not_found,
   validation_error, invalid_state; cursor_expired tested on400 although norm410.
   Correct known-pair fixtures; wrong-pair cases must expect internal_error.
   Sticky tests must assert intended final code/count as well as uncertainty so
   an unintended malformed response cannot satisfy the intended scenario.
5. **Poisoning/whitelist probes:** the claimed known-code/short-token test never
   changes token to overlap the code; exercise the actual condition. Sensitive
   substring test using a hyphenated resource UUID already fails safe grammar;
   add an otherwise-safe unknown code containing an alphanumeric opaque token
   so the sensitive matching branch is independently tested. Unknown code>64
   must survive when safe. Add optional message:null known/unknown-code cases:
   approved spec corrected from string-only to match backend OpenAPI string|null.
6. **Error own-field oracle:** spec requires exact own fields, not all fields
   enumerable. Object.keys cannot enforce exact ownership and wrongly rejects
   a normal nonenumerable Error.message. Use Reflect.ownKeys/own descriptors and
   frozen checks, with no extra own symbols/cause/stack. Do not impose an
   unapproved enumerable-message requirement.
7. **Malformed cases masked by wrong status:** several createDraft negative
   payload cases use200 rather than expected201, so status rejection alone
   passes them. Use expected status for malformed-body/UTF8/duplicate/encoding/
   ID negatives, and separate wrong-status cases. Same principle for size gates.
8. **Cookie fixture defect:** jsonResponse spreads an object of extra headers;
   cookie case passes an array of pairs. That produces a numeric header key,
   not Set-Cookie, so cookie refusal is currently untested. Make actual server
   response contain Set-Cookie and independently observe that precondition.
9. **Timing/cleanup harness:** IncomingMessage req.close means request completion,
   not necessarily disconnected response socket; current timeout/slow-drip timers
   may be canceled before the intended stimulus, and res.end on req.close races
   abort. Use owned response/socket events and explicit request/response barriers.
   Slow-drip must emit partial VALID JSON bytes before the deadline, keep dripping
   too slowly, then assert network_error precisely (not network OR internal).
   Bounded event promises with real deadline, not200setImmediate busy turns.
   Always attach rejection handler to pending calls immediately, clean servers/
   connections/timers in finally, handle listen errors, no unhandled server/socket
   events. closeServer must not hang indefinitely on leaked active connections.
10. **Refused-connection test:** fixed localhost port1 is not an owned fixture,
    and comment says pre-handoff contrary to approved conservative handoff.
    Use an explicitly owned isolated endpoint/fault; prove dispatched/attempts/
    uncertainty. TLS negatives already provide actual trust failures: assert
    no HTTP handler invocation and mutation uncertainty without false claims.

## Required strengthening before source-ready claim

11. **Import inertness:** static top-level import occurs BEFORE listener snapshot;
    current test only compares factory listeners and detects neither import IO
    nor timers/network/output. Build an independent child import interception
    harness from PUBLIC T01/T03 calibration requirements, do not copy private
    historical harness. Validate interceptors with visibly synthetic controls;
    permit only pinned-Zod registry exception, no broad network/IO whitelist.
    Check stdout/stderr and direct writes, not only console. Add declaration
    public API checks without emitted implementation reads. Fixture-factory
    config/deps mutation needs a later actual call showing capture, not merely
    unchanged handle method names; assert frozen returned handle/data trees.
12. **Hook/race coverage:** arrays per hook do not establish cross-hook order.
    Record shared ordered trace including wire, isCurrent/pre-delivery; verify
    two-attempt full ordering, SAME frozen capture after caller binding mutation,
    summary immutability/signals/attempt numbers. Deferred-hook races: generation
    changes during check/select/beforeDispatch, final synchronous veto, late hook
    resolve/reject after abort/deadline, pre-delivery suppression for success AND
    backend error before retry, hook timeout, sleep abort, late sender results.
    Assert no later dispatch/application, exact timeout vs veto error and cleanup.
13. **Replay identity:** actual multi-attempt byte comparison of method, origin,
    concrete target, header key and body, for draft/populate/save and changed
    bearer selection under same binding. Current whitespace-only one-call test
    does not prove numeric spelling/order retained under replay. Populate canary
    contains40.0/exponent/whitespace; mutate original input AND first sender-copy,
    assert second attempt original bytes; same handle/raw response copy mutation
    tests must retain shared seam buffer to detect alias, not construct fresh
    unrelated handles/buffers. Same auth/resource key value permitted.
14. **Budget/header production coverage:** actual streaming body cap, response
    maxHeaderSize/count, duplicate critical headers, wrong Content-Length/truncation,
    invalid UTF8, content encoding without decompression, malformed JSON at the
    expected status, informational heads/trailers/upgrades,204 framing negatives.
    Include request-head independent exact accounting/+1 and large q/pageToken,
    response/projected exact equality/+1 where projected data is just2bytes
    larger than raw Int64 numeric JSON (not merely setting both below record).
    Stub-only full buffers do not prove incremental abort or real header parser.
15. **Retry/uncertainty matrix:** default backoff caps/exponential attempt limits,
    RetryAfter on429/503/500, OWS/equality-to-remaining/safe-but-unfit/huge values,
    no-auto-retry malformed success/error/redirect/other5xx,502/504 and empty500,
    abort during active/sleep/hook phases,503 standalone uncertainty, body vs
    projected overflow, uncertain then local hook/credential/size failures,
    current pre-delivery fence and429 vs503 distinctions. Safe errors may expose
    backendErrorCode, diagnostics never. Table cases should assert the full
    observable tuple not only code or outcomeUnknown.
16. **Real proxy/redirect isolation:** dynamically setting NODE_USE_ENV_PROXY
    after Node startup doesn't exercise startup global-agent configuration.
    Use isolated child env/--use-env-proxy with owned local proxy trap and explicit
    NO_PROXY/no_proxy control; cover global proxy replacement with clean restore.
    No fixed port1/proxy endpoint belonging to an unknown process. Both HTTP and
    HTTPS direct paths. Redirect actual wire matrix must include same-origin,
    cross-origin,307/308 preserving potential write body and no second contact;
    current single302GET alone does not cover mutation credential/body forwarding.
17. **Runtime input/JSON safety and controls:** descriptor/getter/symbol/cycle/
    prototype rejection without executing getters, inherited required fields,
    allowed own __proto__ convenience data preservation, factory/deps replacement,
    BOM/escaped duplicate keys and invalid UTF8; all control success/private-result
    shapes including one-attempt network/429/503 failures and no bearer injection;
    captured control token/challenge matching privacy. Confirm no source row
    quietly claims full T06/T10/control grant authorization.

Coverage does not demand combinatorial duplication of every field across every
route; use independent representative matrices with explicit scenario assertions.
All approved mandatory branches must have real assertions and required production
wire cases. Unknown/deferred coverage remains a gap, not a fulfilled plan heading.

## TLS fixture provisioning (resolved outside repository)

Coordinator generated three independent visibly synthetic self-signed RSA2048
pairs with OpenSSL3.6.5 in a disposable directory, no network or personal files:
valid IP127.0.0.1/::1 dates2026..2036; expired same IPs2024..2025;
wrong-host DNSexample.invalid dates2026..2036. No trust installed. Public keys
match private keys; openssl verify sslserver/IP127.0.0.1 positive PASS, expiry
and IP-mismatch negatives fail for their exact intended reasons.

Certificate file SHA256:
- valid:383b250a95c4af24a1775905b0dab835c22638fa8f85035ab4905dbd3b737bb3
- expired:62f3b966721938abb29ee6ef2bf4c225110c6f2781516aa8644bcc597efd2a9f
- wronghost:02aadc01b6a8b403c7ad508767687a155b0acfe8e244d4df05ea6eba9249651e

QA receives the disposable location out of band and is authorized ONLY to copy
six named test-only PEMs plus README/provenance into its fixtures directory.
Synthetic fixture keys are deliberately public test data, not live credentials;
never print PEM contents to prompts/evidence or install trust. Expiration in2036
is an explicit fixture limitation. Coordinator owns provisioning; QA remains
exclusive repository test/fixture owner. Missing fixture blocker resolves only
once QA copies/verifies the inventory. T04 private provider remains relay work.

## Repair window

QA may revise owning source/helpers/evidence and copy the named fixture files.
Pinned `node --check` on owning mjs/cjs is now allowed (parse-only, no imports or
node_modules needed), plus read-only own relative-import path validation. No
installed ESLint/Prettier/Vitest, compiled targets, loopback/provider execution,
OpenSSL generation, builds or production reads. Developer owns active install/
build; no overlap with moving targets. Report exact source-ready delta and
parse checks, then HOLD for independent re-review/frozen relay. Initial faulty
sources and unexecuted claims remain reported here; no tests counted passed.

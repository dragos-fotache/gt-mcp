# T03 QA round-5 readiness (no execution; hold unchanged)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Window:** source preparation only — NO compiled execution (no smoke/domain/
target/control runs). Static review (prettier/eslint) only.
**Date (UTC):** 2026-10-11.

## Changes (public spec only; no implementation reads)

- Exports are a MINIMUM surface: subset names/kinds checks, exact-equality
  removed. `CodecError(code, message?)` default + explicit generic messages.
- JSON boundaries: own-vs-inherited required fields; `__proto__`/
  `constructor`/`toString` ordinary own data (preserved where additive with
  agreeing text, rejected where exact, no bypass, no prototype mutation);
  non-JSON values (functions, unexecuted getters, required `undefined`,
  BigInt, cycles) reject with generic `CodecError`; padded exponents valid
  revisions, every zero form rejects there, `-0`/`0e-1`/`3e1`/`0E0`/`30e-1`
  exact Int32 decodes (short synthetic tokens, negligible cost — no
  long-mantissa stress fixture added); escapes per code-unit semantics;
  `1e1000` additive fails closed; non-string `rawJson` fails.
- Page token iff at decode AND compiled-schema level; schema-expressible
  invariants compiled (non-draft lists, set completion/rest bans, custom
  type/revision/equipment, status/boolean/date-time).
- Prototype assertion corrected: null-prototype records permitted, so output
  checks own-key preservation + no global/attacker prototype effects +
  structured/text equality instead of exact `Object.getPrototypeOf`.
- Deny lists extended: http2, tls, dgram, dns + dns/promises resolve family,
  `node:timers` and `node:timers/promises`; ordinary loads untouched.
- Probe honesty corrected: synthetic HOME/XDG/TMP/cwd is credential-denial
  plus write observability, NOT filesystem or network containment; method
  patches + deltas observe the rest; coordinator source audit accompanies
  execution. Child PATH prepends `dirname(process.execPath)` (provisioned
  runtime), never hardcoded system paths alone.
- Artifact-free split: probe runner shared via `import-probe-runner.mjs`
  (no dist import); controls live in `import-probe-controls.test.mjs`
  (clean + ten deny controls, zero dist references). `public-surface`
  keeps export-shape checks plus the relay-only domain run.

## Controls executed: NONE — nothing proved until run

No runs of any kind before the final relay. The battery is designed so that,
once executed: clean control passing proves zero harness delta; each deny
control proves its tripwire throws/records/fails-import with an empty
sandbox and zero real I/O (wrappers throw first); the design is
self-validating (e.g. if ESM-sync did not propagate, the spawn/write
fixtures would fail loudly rather than pass silently).

## Questions (practical harness assumptions; async)

- Deny boundary now covers globals, child×7, Worker, fs/fs-promises writes,
  http/https/http2/tls/net servers+clients, dgram sockets, dns both APIs,
  both timers modules, process.exit. Anything else to deny pre-relay, or is
  the remainder (dgram send/bind post-creation, tls contexts, exotic
  process methods) audit-covered?
- Resource-noise policy unchanged (full equality, HOLD/report, no relax).

## Scoped review commands and results (no execution)

- `npx prettier --check` over `test/unit/t03/` +
  `test/foundation/package-contract.test.mjs`: clean.
- `npx eslint` over the same paths: exit 0, no findings.
- 22 `test/unit/t03/` files; 107 `it`/`it.each` declarations (rows expand at
  run time). Nothing executed, nothing accepted. No package/config/parked
  edits; no foundation reads beyond the authorized single assertion.

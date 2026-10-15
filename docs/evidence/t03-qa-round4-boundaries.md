# T03 QA round-4 boundaries (no execution; hold unchanged)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Window:** source preparation only — NO compiled execution (no smoke/domain/
target/control runs). Static review (prettier/eslint) only.
**Date (UTC):** 2026-10-11.

## Spec updates applied (read from the public spec; no implementation reads)

- Required exports are a MINIMUM surface: `public-surface.test.mjs` checks
  required names/kinds as a subset, never exact namespace equality.
- `CodecError(code, message?)`: default nonempty generic message plus explicit
  generic message honored (contains-check), both ID-free.
- JSON boundaries, all spec-derived:
  - Required fields must be OWN data (inherited required rejected,
    inherited unknown ignored) — `parse-normalize-identity.test.mjs`.
  - `__proto__`/`constructor`/`toString` stay ordinary own data through
    parsing/projection/detachment/serialization: preserved where additive
    (decode, result data with agreeing text), rejected where exact
    (unknown creation fields, envelope roots/errors); prototypes unmutated;
    additive names never bypass known-field validation.
  - Non-JSON values (functions incl. never-executed getters/accessors,
    required-position `undefined`, BigInts, cycles) reject with generic local
    `CodecError` — no coercion, drops, or execution.
  - Numerals: padded exponents (`4e01`, `40e00`, `1E3`, `1e0000000`) valid
    revisions; every zero form (`0`, `0.0`, `0e0`, `0e-1`, `-0`, `-0.0`)
    rejects for revisions; `-0`/`0e-1`/`3e1`/`0E0` decode as exact Int32
    values. Escaped code units (`\u0041`, surrogate pair, quote/backslash)
    follow ordinary JSON semantics. Unrepresentable additive numbers
    (`1e1000` → Infinity) fail closed. Non-string `rawJson` fails.
  - Page `nextPageToken` iff `hasMore` (null iff terminal) at decode AND
    compiled-schema level; only decode normalizes backend omission.
  - Schema-expressible invariants at compiled level: non-draft list items,
    forbidden routine-set completion/rest fields, custom type/revision/
    equipment constraints, status enums, boolean shapes, date-time formats.
    Calendar/cross-identity semantics stay runtime-only (already covered).

## Import-probe hardening (own harness)

- `test/unit/t03/import-deny-setup.mjs` (new): `installProbe()` arms
  deny/record wrappers over globals (`fetch`, `WebSocket`, macro timers,
  `process.exit`) and builtin methods (child ×7, `Worker`, fs ×23,
  fs/promises ×11, http/https ×3 each, net ×3, dns `lookup`), synced to ESM
  views; per-patch results recorded; best-effort restore with error record.
  Ordinary module loading untouched.
- `public-surface.test.mjs`: `--` argv separator; child env is an explicit
  allowlist (synthetic HOME/XDG/TMP in-scope, no credential/provider
  inheritance); sandbox asserted recursively empty; full-equality deltas kept.
  Honesty note in-test: the allowlist denies credential/private-state
  inheritance only — it is NOT containment against transient module
  network/child/fs actions; method patches + deltas observe, coordinator
  source audit accompanies execution.
- Five synthetic deny fixtures (fetch/timer/exit/spawn/write) prove each
  representative deny path throws inside module evaluation, records exactly
  once, fails the import with a forbidden error, and leaves the sandbox
  empty — no real I/O occurs (wrappers throw first).

## Controls executed: NONE

No compiled runs before the final relay — not smoke, domain, target, or
control runs. At relay the control battery proves: (a) clean control →
harness contributes zero delta; (b) five deny controls → tripwires live;
(c) domain result then attributes cleanly (pass = meaningful, fail =
target-attributed, control-fail = harness-attributed).

## Questions (practical harness assumptions; async)

- Is the deny-family boundary right — http2/tls/dgram/dns-promises left to
  delta-observation plus your source audit — or should those join the deny
  lists before relay?
- Resource-noise policy kept as answered (full equality on pinned
  Node24.21.0; observed noise = HOLD/report, no auto-relaxation).

## Scoped review commands and results (no execution)

- `npx prettier --check` over `test/unit/t03/` +
  `test/foundation/package-contract.test.mjs`: clean.
- `npx eslint` over the same paths: exit 0, no findings.
- 15 QA-owned T03 files; 107 `it`/`it.each` cases. Nothing executed, nothing
  accepted. No package/config/parked edits; no foundation reads beyond the
  authorized single assertion.

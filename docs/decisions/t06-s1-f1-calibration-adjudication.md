# T06-S1 f1 regression adjudication — isolated environment layout, no waiver

**Rerun grant CLOSED:** QA focused16/full399passes, zero skips, unchanged hashes;
[final S1 acceptance](../evidence/t06-s1-coordinator-review.md). The initial failed
run and adjudication below remain historical; no further rerun or successor.

**Disposition:** initial QA regression run remains FAILED398/399. Owning51/51
passes; independent clean locked reproduction passes owning51 and regressions399,
with identical compiled bytes and all249frozen inputs unchanged. No S1 acceptance
yet. No source/assertion change, skip, failing-suite exclusion or waiver authorized.

## Specification-level diagnosis

Frozen T01 QA harness creates a child synthetic scope under `os.tmpdir()` and
sets `QA_REAL_HOME` to the parent process's HOME. Frozen preload classifies paths
outside the repo under that parent HOME as `private`, as well as explicit private-
looking path patterns. The sync-write calibration probe expects its neutral
`note.txt` under the synthetic temp scope to be classified `other` (write is still
blocked either way). Thus placing parent TMPDIR at/inside parent HOME changes the
calibration fixture's declared stimulus; fresh/disposable alone does not ensure
that the two roots are disjoint.

Observed QA failure is private classification of the neutral temp probe; no auth
entry participates in this calibration. Coordinator's clean reproduction uses
sibling HOME and temp directories, and all399regressions pass with unchanged
assertions. Fresh isolated roots remain mandatory, but their layout must preserve
the probe's documented neutral-vs-private distinction. Do not weaken the private
path guard or change the expected violation to fit an incorrectly situated probe.
QA should record initial HOME/TMPDIR relation without actual private paths to
confirm the environment diagnosis; no new general calibration campaign.

## Bounded QA rerun grant, same frozen artifact

Production/tests/helpers remain HELD. Same t06-s1-f1 inventory249files/checksum;
source identity is unchanged, so no new artifact is fabricated. Only environment
layout changes. All other f1 safety/role/execution/cleanup/time-limit rules remain.

Use ONE newly issued disposable scope with sibling directories:

```text
<issued scope>/home     -> HOME; XDG roots underneath home
<issued scope>/tmp      -> TMPDIR, TMP, TEMP (NOT inside HOME)
<issued scope>/cache    -> npm cache
```

Use neutral directory components, not private/vault/profiles/journals/receipts or
credential-looking filenames. No real HOME/keyring fallback. Pinned Node/npm;
clear inherited Node/TLS overrides. Before/after checksum and all249row verification
mandatory. No build/install/source/oracle edits.

1. Focused unchanged failure suite:

   ```sh
   node node_modules/vitest/vitest.mjs run test/foundation/intercept-calibration.test.mjs
   ```

2. Only if focused suite fully passes, repeat the **entire original regression
   selection**, with the SAME sibling-root environment:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/foundation test/unit/t03 test/unit/t04 \
     test/unit/t05/04-hooks-fences-dispatch.test.mjs
   ```

Do not rerun green S1 owning51 merely for this launch-layout correction. Its frozen
identity is preserved and independently reproduced; no product repair occurred.
If focused or full rerun fails, stop, verify hashes, safely clean owned work and
report blocked/partial; do not alter expectations or perform another unguided run.

New sanitized `docs/evidence/t06-qa-f1-calibration-rerun.md` only. Preserve the first
failed evidence unchanged; report exact commands/exits/counts/skips, disjoint-root
relationship, hash stability/cleanup and limits. Asynchronous milestone then HOLD.
Original90/120minute checkpoint/stop apply, not automatic context renewal.
No product writes, real credentials, S2, .pi changes, staging/commits or release.

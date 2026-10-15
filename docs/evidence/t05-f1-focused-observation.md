# T05-f1 focused observation window — production-limits only

**CLOSED:** the authorized observation ran once,17/20passed,3failed,0skips;
all191frozen hashes unchanged. Missing details recovered. See
[adjudication](../decisions/t05-f1-verification-adjudication.md); no further
execution on this window. Original command/grant retained below.

The first complete owning run is CLOSED/FAILED:220/226passed,6failed in4files,
0skips; all191frozen hashes unchanged. Its missing failure details remain an honest
observation gap, not a pass. No source repair or product disposition yet.

Coordinator authorizes QA ONE no-edit re-observation of ONLY
`test/fault/t05/production-limits.test.mjs` against the SAME t05-f1inventory/c3build.
Use structured output so failure details cannot scroll away. All source/build/
install/config/helpers/fixtures remain held. QA may write its execution evidence.
No other suite/full rerun/regression/provider or deferred-harness work.

1. Verify provisioned pins and191-file inventory exactly as the f1relay.
2. With umask077 create an owned temporary JSON output path and run:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
umask 077
OUT=$(mktemp /tmp/gt-mcp-t05-f1-limits.XXXXXX.json)
node ./node_modules/vitest/vitest.mjs run \
  test/fault/t05/production-limits.test.mjs \
  --reporter=json --outputFile="$OUT"
```

Retain the Vitest exit status (a subsequent output command is NOT its status).
Read the structured failed assertion records, record ALL names and expected/
observed details safely; no production source reads, raw bodies/PEMs/credentials
in evidence. Report temporary result location out of band for coordinator review.
Do not change tests/oracles or rerun again automatically.

3. Reverify inventory even on failure. Append a separately labelled observation
   to QA f1execution evidence or write a t05-qa-f1-observation report; do not
   overwrite the initial220/226result.
4. Send asynchronous exact exit/counts/failure details/cleanup/inventory status,
   then HOLD. Coordinator classifies failures and issues any later repair grant.

This is a focused observation window under the standing proportional policy,
not a new whole-suite acceptance claim. Real writes/live services remain disabled.

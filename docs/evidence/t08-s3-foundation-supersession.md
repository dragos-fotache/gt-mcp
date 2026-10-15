# T08-S3 foundation executable supersession

S3 changes only the following T01 test identities, as authorized in the S3
specification and reviewed with the primary agent before editing:

- `server-inert.test.mjs`: the three `direct execution with argv ... exits 78
  with exact stderr` cases for `[]`, `["--stdio"]`, `["--help","extra-arg"]`.
- `server-inert.test.mjs`: `a JSON-RPC initialize/tools-list request produces no
  protocol response`.
- `server-inert.test.mjs`: `main() returns 78 without effects when called directly`.
- `symlink-argv-regression.test.mjs`: the three `server through symlink with argv
  ... exits 78 with exact stderr` cases using the same argument vectors.

The replacement checks execute the actual delivered entry: clean EOF exits 0,
unsupported arguments exit 64 with fixed usage, initialize answers via SDK framing,
and exported `main([])` returns an awaited numeric status without assigning
`process.exitCode`. They use small real subprocess helpers because T01's inert
preload deliberately rejects stdin/stream/signal observation required by S3.

All server import interception and argv-match inert-import assertions, root,
CLI and companion checks remain intact. CLI symlink assertions still use their
existing inert preload. Historical T01 evidence remains unchanged. This source
supersession record alone claims no executed pass or OS sandbox guarantee.

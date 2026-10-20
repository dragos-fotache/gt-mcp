# Further improvements

This is the backlog for work beyond the implemented behavior. These items are not completed
verification or authorization to deploy, publish or enable writes.

## Integrated acceptance and release gates

- Complete integrated multi-client acceptance: serialized calls across real stdio processes, one
  refresh rotation, exact refresh recovery after owner death, cancellable/expired acquisition
  without late dispatch or worker leaks, and EOF/SIGTERM/abrupt-death cleanup. Verify sign-out and
  profile replacement fences, provider/corrupt-state failures, disabled creation across clients and
  truthful independent creation under interrupted or delayed result delivery. Use existing isolated
  fixtures, then run affected owning suites and relevant regressions.
- Independently review multi-client delivery/ownership and the current installer update path.
  Reproduce the current deliverable from a clean locked source and verify the exact installed
  archive; earlier package results do not qualify new bytes.
- Finish actual Pi CLI/interactive registration and supported host modes, lifecycle,
  cancellation/reconnect, restart/fork with fresh calls, output limits/truncation, untrusted text
  and privacy behavior. SDK print mode alone is insufficient.
- Qualify real Google/browser login with an operator-supplied public client, registered localhost
  origin/port and approved test account, including nonce, audience and recovery behavior. Synthetic
  browser/provider fixtures are insufficient.
- Refresh Android ordinary-sync observations against the current delivery and verify the saved graph
  without assuming earlier artifact results still apply.
- Complete independent contract/security/release review, supported-data budget checks and a go/no-go
  decision naming actual versions, limitations and blockers. Publishing, deployment and real-account
  write enablement require separate grants.

## Operational qualification

- Btrfs qualification remains user-owned. Required safe IO is checked at runtime; there is no
  filesystem-name gate. Process interruption and ext4 fixtures do not certify hardware/power-loss
  durability or network storage.
- Consider focused interrupted-update activation/restore checks if broader crash guarantees are
  needed. The current two-rename update is not an atomic exchange; preserve and follow
  [manual recovery](recovery.md#interrupted-application-update).
- Reassess the Node 24 minimum separately if older runtimes are desired. Current manifests, storage
  and packaging enforce it; removing the checks requires a dependency/platform compatibility
  decision. Local development uses machine Node.

## Tooling compatibility

- Remove the archive packer's exact npm 11.19.0 requirement while preserving explicit membership,
  modes and the runtime shrinkwrap. Machine npm 12 changes the `pack --json` report shape and
  excludes `npm-shrinkwrap.json` from archives; support needs a deliberate packaging change and
  installed/locked verification. Ordinary development uses machine Node/npm; this limitation is
  specific to archive generation.

## Optional maintenance

- Review whether the inert companion workspace and retained experimental sources still merit
  inclusion in developer checks. Remove them only in a scoped code/test cleanup that preserves
  required coverage; they are not runtime dependencies.
- Simplify historical test helpers and reproduction scripts where they no longer serve a distinct
  regression risk. Preserve specification-derived expectations and do not use cleanup to exclude
  failing behavior.
- Before public distribution, choose release/versioning and licensing policy and document the
  supported deployment matrix. Private version 0.0.0 and an archive digest alone do not establish
  release readiness.

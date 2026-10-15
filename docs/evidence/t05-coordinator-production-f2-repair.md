# T05 production repair — observed truncation event ordering

Developer/coordinator-private instruction, no QA source/test details. Common
[adjudication](../decisions/t05-f2-truncation-adjudication.md) preserves the existing
public contract. c3/f2not accepted; do not weaken classification or retry oracle.

Independent clean snapshot reproduced a validly-started response with an incomplete
body being classified network_error and automatically retried, rather than the
specified internal_error/no in-call retry. Native Node24control confirms response
callback/data/aborted occur BEFORE ClientRequest.close, which may precede the
IncomingMessage.error/close callbacks. This is an observed response truncation,
not a no-response socket failure.

**Exact repair scope:** src/http/wire.ts and an honest repair entry in the T05
implementation ADR only. Ensure generic request-close/request-error callbacks
cannot win with network classification after response receipt. Preserve explicit
wire timeout/caller-abort precedence, parser errors, refusal/no-response failures,
all cleanup and conservative dispatch/uncertainty. No extra exports/API changes,
no new dependencies/manifest/config/compiler or other production edits.

Developer may run the FOUR permitted production checks, then report c4artifact-ready
and HOLD all actions. No QA/coordinator probe source reads or runtime execution,
no self-authored diagnostics/domain tests. QA code stays unchanged and closed.
Coordinator will verify the targeted public behavior then create a new relay for
focused limits + conditional final gates. Earlier failures remain; no actual writes,
private/live service, .pi, staging/commits or successor work.

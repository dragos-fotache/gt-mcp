# T08-S1 production follow-up — c1

Developer reports full unmasked pinned production checks green; source fixes are
reviewed separately here, not accepted solely from that report. Bounded accumulation,
missing-path ancestor checks, sanitized load errors, config-before-descriptor access,
listener detachment, recognized interruption mapping and remaining owner release
are substantially improved. Environment qualification is already accepted separately.

Three narrow source findings still block production readiness/runtime relay:

1. The final public delivery guard treats any runtime-owned signal abort as caller
   interruption. But a storage/session corruption fence itself aborts owned signals;
   this can overwrite the required recovery_unavailable result with
   operation_interrupted. Distinguish caller/close cancellation from internal recovery
   fencing while maintaining the settled precedence and late-success suppression.
2. Native-signal probe still reads arbitrary caller properties and accepts a forged
   AbortSignal-prototype object with shadowed boolean/method fields. A guarded property
   access is not native branding. Use native intrinsic brand/access/listener operations
   without invoking caller getters/methods; invalid native inputs must remain local
   invalid_arguments, not configuration-required or raw exceptions.
3. Protected-loader checks still omit observable changes: the original selected
   dev/ino is not compared with the opened descriptor; ancestor revalidation ignores
   current permissions; live file revalidation ignores nlink/uid/mode. Preserve the
   pre-open identity and revalidate actual safety, not only inode/type. Open regular
   candidates nonblocking to avoid a regular-to-FIFO substitution hanging before the
   fstat rejection. These are focused completion of c0's identity/type guard, not a
   privileged-same-user/OS-sandbox guarantee or generalized race campaign.

Same four runtime modules/ADR, same four unmasked production checks, no new scope/
dependency/QA reads/compiled probes/provider/test execution. Existing source-window
checkpoint90/stop120 remain; report corrected readiness or honest partial handoff.
No additional QA test campaign requested. Private relay control is prepared and
syntax-checked but unexecuted; QA execution still needs the accepted frozen candidate.

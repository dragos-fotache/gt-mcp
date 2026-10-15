# T08-S1 production follow-up — c2 narrow signal hold

File identity, live permissions/link checks, O_NONBLOCK, config-before-descriptor
validation and recovery-vs-owned-abort ordering now address prior findings. No
runtime execution performed; source readiness still held for two signal details:

- Native throwIfAborted throws the signal's arbitrary reason, not necessarily an
  AbortError. Genuine already-aborted native signals with string/Error/object reasons
  are therefore rejected as invalid_arguments. Inspecting reason.name can invoke a
  caller getter or itself throw. Brand/read abort state through the captured native
  aborted getter, without reading reason or caller-shadowed properties. The link still
  uses caller.aborted directly despite native-brand comments; use intrinsic access.
- linkOwnedSignal's forward callback updates one link object but returns a different
  object with callerAborted=false. Return/use the same observed cancellation state
  through the invocation/delivery lifetime.

These are focused fixes to the existing public native-signal/interruption contract,
not new public behavior or another design campaign. Same production source/check
scope; full unmasked results then HOLD. QA receives only the public signal requirement
for a minimal independent regression, never these private source details.

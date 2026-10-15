/**
 * T04 protected storage — fault-injection probe interface.
 *
 * The shared engine consults a FaultProbe at every named diagnostic point.
 * Production workers wire NoopFaultProbe (no file reads, no timers, no
 * activation path). Diagnostic workers wire the file-backed probe from the
 * diagnostic facility (see test-facility.ts), which re-reads the issued
 * controls file on every probe so armFault ordering is observed.
 *
 * A probe that fires with action "throw" raises FaultArmed; the engine maps
 * it to io_failure before any PREPARED write was attempted and to
 * commit_ambiguous (fencing the handle) in uncertain phases. Action
 * "kill-holder" terminates the worker immediately.
 */

import type { StorageFaultPoint } from "./types.js";

export type { StorageFaultPoint };

export class FaultArmed extends Error {
  readonly point: StorageFaultPoint;

  constructor(point: StorageFaultPoint) {
    super("storage fault armed");
    this.name = "FaultArmed";
    this.point = point;
  }
}

export interface FaultProbe {
  probe(point: StorageFaultPoint): Promise<void>;
}

export class NoopFaultProbe implements FaultProbe {
  async probe(): Promise<void> {
    return;
  }
}

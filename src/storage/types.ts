/** Shared verified binding and isolated diagnostic types. */
export interface StorageBinding {
  readonly origin: string;
  readonly accountUuid: string | null;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}
export type { ProfileSession, StoreUpdate, ProfileLocation } from "./credential/types.js";
import type { ProfileSession } from "./credential/types.js";
export interface TestFacilityTicket {
  readonly root: string;
  readonly capability: string;
}
export type StorageFaultPoint =
  | "replace.before.rename"
  | "replace.after.rename"
  | "replace.reply"
  | "remove.key.deleted"
  | "fs.write"
  | "fs.fsync.file"
  | "fs.rename"
  | "fs.fsync.directory";
export interface StorageFault {
  readonly point: StorageFaultPoint;
  readonly action: "throw" | "kill-holder";
  readonly occurrence?: number;
}
export interface DiagnosticSession extends ProfileSession {
  readonly holderPid: number;
}
export interface StorageTestFacility {
  readonly ticket: TestFacilityTicket;
  readonly locations: { readonly profileRoot: string };
  readonly profileGenerationId: string;
  provision(origin: string): Promise<DiagnosticSession>;
  open(expectedBinding: StorageBinding): Promise<DiagnosticSession>;
  armFault(fault: StorageFault): Promise<void>;
  clearFault(): Promise<void>;
  setKeyState(
    state: "available" | "missing" | "locked" | "ambiguous" | "unavailable",
  ): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * T04 protected storage — public TypeScript surface (types only).
 *
 * This module carries no runtime behavior. The production entry
 * (index.ts) re-exports these types alongside its exact six runtime
 * exports; the diagnostic entry (test-facility.ts) re-exports the
 * diagnostic types. All object shapes are readonly and exact.
 */

export interface StorageBinding {
  readonly origin: string;
  readonly accountUuid: string | null;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}

export interface StorageLocation {
  readonly profileRoot: string;
  readonly anchorRoot: string;
}

export interface StorageAccess {
  readonly secretServiceBusAddress: string;
  readonly timeoutMs?: number;
}

export interface ProvisionRequest extends StorageLocation, StorageAccess {
  readonly origin: string;
  readonly profileGenerationId: string;
}

export interface OpenRequest extends StorageLocation, StorageAccess {
  readonly expectedBinding: StorageBinding;
}

export interface StoreUpdate {
  readonly vaultBytes?: Uint8Array;
  readonly operationBytes?: Uint8Array;
}

export interface ProfileSession {
  readonly binding: StorageBinding;
  readVaultBytes(): Promise<Uint8Array>;
  readOperationStoreBytes(): Promise<Uint8Array>;
  commit(update: StoreUpdate): Promise<void>;
  bindAccount(accountUuid: string, replacementVaultBytes: Uint8Array): Promise<StorageBinding>;
  advanceSessionGeneration(replacementVaultBytes: Uint8Array): Promise<StorageBinding>;
  keyedIntentDigest(identityMaterialUtf8: Uint8Array): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface TestFacilityTicket {
  readonly root: string;
  readonly capability: string;
}

export type StorageFaultPoint =
  | "lock.acquired"
  | "provision.marker.durable"
  | "provision.key.stored"
  | "provision.stores.durable"
  | "provision.anchor.committed"
  | "provision.marker.removed"
  | "commit.before.prepare"
  | "commit.anchor.prepared"
  | "commit.vault.renamed"
  | "commit.vault.synced"
  | "commit.operations.renamed"
  | "commit.operations.synced"
  | "commit.anchor.committed"
  | "commit.anchor.synced"
  | "commit.reply"
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
  readonly locations: StorageLocation;
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

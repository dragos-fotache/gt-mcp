/** Successor API. The legacy entry remains wired only until T21-S4 integration. */
import type { StorageBinding } from "../types.js";
export type { StorageBinding };

export interface ProfileLocation {
  readonly profileRoot: string;
  readonly secretServiceBusAddress: string;
  readonly timeoutMs?: number;
  readonly origin: string;
}
export interface StoreUpdate {
  readonly vaultBytes: Uint8Array;
}
export interface ProfileSession {
  readonly binding: StorageBinding;
  readVaultBytes(): Promise<Uint8Array>;
  commit(update: StoreUpdate): Promise<void>;
  bindAccount(accountUuid: string, replacementVaultBytes: Uint8Array): Promise<StorageBinding>;
  advanceSessionGeneration(replacementVaultBytes: Uint8Array): Promise<StorageBinding>;
  removeProfile(): Promise<void>;
  close(): Promise<void>;
}

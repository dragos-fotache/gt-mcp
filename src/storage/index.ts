/** Single-record credential store. Importing performs no IO. */
export {
  StorageError,
  isStorageError,
  provisionProfile,
  openProfile,
  removeProfile,
  MAX_STORE_BYTES,
} from "./credential/index.js";
export type { StorageErrorCode } from "./errors.js";
export type {
  ProfileLocation,
  ProfileSession,
  StorageBinding,
  StoreUpdate,
} from "./credential/types.js";

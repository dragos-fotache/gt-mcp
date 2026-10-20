/** Inert single-record storage entry; T21-S4 will replace the legacy entry. */
import { fileURLToPath } from "node:url";
import { launch } from "./client.js";
import type { ProfileLocation, ProfileSession } from "./types.js";
export { StorageError, isStorageError } from "../errors.js";
export { MAX_STORE_BYTES } from "../validate.js";
export type { ProfileLocation, ProfileSession, StorageBinding, StoreUpdate } from "./types.js";

function holder(): string {
  return fileURLToPath(new URL("./worker.js", import.meta.url));
}
export async function provisionProfile(request: ProfileLocation): Promise<ProfileSession> {
  return (await launch(request, "provision", holder()))!;
}
export async function openProfile(request: ProfileLocation): Promise<ProfileSession> {
  return (await launch(request, "open", holder()))!;
}
export async function removeProfile(request: ProfileLocation): Promise<void> {
  await launch(request, "removeProfile", holder());
}

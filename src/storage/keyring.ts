/**
 * T04 protected storage — immutable master-key access.
 *
 * The production backend performs a fresh Secret Service connection for
 * every protected operation: availability checks (service owner, default
 * alias resolving to the persistent login collection, unlocked), DH
 * encrypted session, reserved-attribute search with the exact
 * 0/1/>1/locked mapping, and encrypted read (with constant-time comparison
 * against the held key by the engine) or replace=false creation with
 * encrypted read-back. No cached-key fallback: a missing/locked/changed
 * key fails with its specific code on every call, and closing never
 * requires the key. Connections always close; sessions close best-effort.
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import {
  closeDhSession,
  connectBus,
  createMasterItem,
  DbusCallError,
  dhDecrypt,
  ensureSecretsService,
  getItemSecret,
  LOGIN_COLLECTION_PATH,
  openDhSession,
  readLoginCollection,
  searchMasterItems,
  type DbusClient,
  type DhSession,
  type SecretStruct,
} from "./dbus.js";
import { StorageError } from "./errors.js";

export const MASTER_KEY_LEN: number = 32;
export const MASTER_KEY_LABEL: string = "GymTracka MCP profile key";
export const MASTER_KEY_CONTENT_TYPE: string = "application/octet-stream";
export const KEY_ATTR_PROFILE: string = "x-gymtracka-profile";
export const KEY_ATTR_VERSION: string = "x-gymtracka-key-v";
export const KEY_ATTR_ROLE: string = "x-gymtracka-role";
export const KEY_ATTR_VERSION_VALUE: string = "1";
export const KEY_ATTR_ROLE_VALUE: string = "master";

export function masterAttributes(profileGenerationId: string): Record<string, string> {
  return {
    [KEY_ATTR_PROFILE]: profileGenerationId,
    [KEY_ATTR_VERSION]: KEY_ATTR_VERSION_VALUE,
    [KEY_ATTR_ROLE]: KEY_ATTR_ROLE_VALUE,
  };
}

export interface MasterKeyAccess {
  loadMaster(deadlineMs: number): Promise<Uint8Array>;
  createMaster(key: Uint8Array, deadlineMs: number): Promise<void>;
}

function isLoginItem(itemPath: string): boolean {
  return itemPath.startsWith(`${LOGIN_COLLECTION_PATH}/`);
}

export class SecretMasterKey implements MasterKeyAccess {
  private readonly socketPath: string;
  private readonly profileGenerationId: string;

  constructor(socketPath: string, profileGenerationId: string) {
    this.socketPath = socketPath;
    this.profileGenerationId = profileGenerationId;
  }

  private async withClient<T>(
    deadlineMs: number,
    work: (client: DbusClient) => Promise<T>,
  ): Promise<T> {
    // The key backend emits only published StorageError codes: dependency
    // transport failures become provider_failure here, never generic IO or
    // native errors.
    const client: DbusClient = await connectBus(this.socketPath, deadlineMs);
    try {
      return await work(client);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof DbusCallError) {
        throw new StorageError("provider_failure");
      }
      throw new StorageError("provider_failure");
    } finally {
      client.destroy();
    }
  }

  private async checkedCollection(
    client: DbusClient,
    deadlineMs: number,
  ): Promise<{ collectionPath: string; session: DhSession }> {
    await ensureSecretsService(client, deadlineMs);
    const collectionPath: string = await readLoginCollection(client, deadlineMs);
    const session: DhSession = await openDhSession(client, deadlineMs);
    return { collectionPath, session };
  }

  private async closeSessionQuiet(
    client: DbusClient,
    session: DhSession | null,
    deadlineMs: number,
  ): Promise<void> {
    if (session !== null) {
      await closeDhSession(client, session.sessionPath, deadlineMs);
      session.aesKey.fill(0);
    }
  }

  async loadMaster(deadlineMs: number): Promise<Uint8Array> {
    return this.withClient(deadlineMs, async (client: DbusClient) => {
      const checked: { collectionPath: string; session: DhSession } = await this.checkedCollection(
        client,
        deadlineMs,
      );
      try {
        const found: { unlocked: string[]; locked: string[] } = await searchMasterItems(
          client,
          masterAttributes(this.profileGenerationId),
          deadlineMs,
        );
        const foreign: string[] = [...found.unlocked, ...found.locked].filter(
          (itemPath: string): boolean => !isLoginItem(itemPath),
        );
        // Reserved attributes on unqualified collections deny outright.
        if (foreign.length > 0) {
          throw new StorageError("key_unavailable");
        }
        const unlocked: string[] = found.unlocked.filter(isLoginItem);
        const locked: string[] = found.locked.filter(isLoginItem);
        if (unlocked.length + locked.length === 0) {
          throw new StorageError("key_not_found");
        }
        if (unlocked.length + locked.length > 1) {
          throw new StorageError("key_ambiguous");
        }
        if (locked.length === 1) {
          throw new StorageError("key_locked");
        }
        const itemPath: string | undefined = unlocked[0];
        if (itemPath === undefined) {
          throw new StorageError("key_not_found");
        }
        const secret: SecretStruct = await getItemSecret(
          client,
          itemPath,
          checked.session.sessionPath,
          deadlineMs,
        );
        if (secret.session !== checked.session.sessionPath) {
          throw new StorageError("provider_failure");
        }
        const plain: Buffer = dhDecrypt(checked.session.aesKey, secret.params, secret.value);
        secret.params.fill(0);
        secret.value.fill(0);
        try {
          if (plain.byteLength !== MASTER_KEY_LEN) {
            throw new StorageError("provider_failure");
          }
          return new Uint8Array(plain);
        } finally {
          plain.fill(0);
        }
      } finally {
        await this.closeSessionQuiet(client, checked.session, deadlineMs);
      }
    });
  }

  async createMaster(key: Uint8Array, deadlineMs: number): Promise<void> {
    if (key.byteLength !== MASTER_KEY_LEN) {
      throw new StorageError("invalid_argument");
    }
    return this.withClient(deadlineMs, async (client: DbusClient) => {
      const checked: { collectionPath: string; session: DhSession } = await this.checkedCollection(
        client,
        deadlineMs,
      );
      try {
        // Namespace reservation covers any prior item carrying this
        // profile-generation id, not just exact-attribute matches: an
        // unknown-version, corrupt, or foreign reserved item never reads
        // as a fresh namespace.
        const reserved: { unlocked: string[]; locked: string[] } = await searchMasterItems(
          client,
          { [KEY_ATTR_PROFILE]: this.profileGenerationId },
          deadlineMs,
        );
        if (reserved.unlocked.length + reserved.locked.length > 0) {
          throw new StorageError("already_provisioned");
        }
        let itemPath: string;
        try {
          itemPath = await createMasterItem(
            client,
            checked.collectionPath,
            checked.session.sessionPath,
            MASTER_KEY_LABEL,
            masterAttributes(this.profileGenerationId),
            checked.session.aesKey,
            key,
            MASTER_KEY_CONTENT_TYPE,
            deadlineMs,
          );
        } catch (error) {
          if (error instanceof DbusCallError) {
            const raced: { unlocked: string[]; locked: string[] } = await searchMasterItems(
              client,
              { [KEY_ATTR_PROFILE]: this.profileGenerationId },
              deadlineMs,
            );
            if (raced.unlocked.length + raced.locked.length > 0) {
              throw new StorageError("already_provisioned");
            }
          }
          throw error;
        }
        // Revalidate exact uniqueness after creation, then exact
        // read-back with session equality.
        const again: { unlocked: string[]; locked: string[] } = await searchMasterItems(
          client,
          masterAttributes(this.profileGenerationId),
          deadlineMs,
        );
        if (again.unlocked.length + again.locked.length !== 1) {
          throw new StorageError("already_provisioned");
        }
        const readBack: SecretStruct = await getItemSecret(
          client,
          itemPath,
          checked.session.sessionPath,
          deadlineMs,
        );
        if (readBack.session !== checked.session.sessionPath) {
          throw new StorageError("provider_failure");
        }
        const plain: Buffer = dhDecrypt(checked.session.aesKey, readBack.params, readBack.value);
        readBack.params.fill(0);
        readBack.value.fill(0);
        try {
          if (plain.byteLength !== MASTER_KEY_LEN || !crypto.timingSafeEqual(plain, key)) {
            throw new StorageError("provider_failure");
          }
        } finally {
          plain.fill(0);
        }
      } finally {
        await this.closeSessionQuiet(client, checked.session, deadlineMs);
      }
    });
  }
}

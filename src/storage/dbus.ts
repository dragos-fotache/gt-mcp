/**
 * T04 protected storage — reviewed D-Bus framing and Secret Service subset.
 *
 * Production uses only raw message framing from @homebridge/dbus-native
 * 0.7.8 through a narrow local structural adapter: the dependency module is
 * loaded as unknown, its createClient factory is runtime-validated, and all
 * further access is structurally checked (no any, no ambient declarations,
 * no patched dependency, no @types package). Dynamic introspection, object
 * proxies, service discovery, and autostart helpers are never used; every
 * call is an explicit invoke with a pinned signature. The socket is created
 * by this module from the validated Unix path only (no ambient bus
 * discovery, no TCP/abstract/unixexec fallback); SASL is restricted to
 * EXTERNAL so no HOME keyring files are consulted; Hello is manual and
 * wrapped so no raw dependency throw escapes.
 *
 * Secret Service subset: service availability, default-alias login
 * collection checks, dh-ietf1024-sha256-aes128-cbc-pkcs7 encrypted sessions
 * (IETF Second Oakley Group via node:crypto modp2, HKDF-SHA256 NULL-salt
 * empty-info 128-bit key, AES-128-CBC PKCS#7), reserved-attribute search
 * across locked/unlocked matches, encrypted GetSecret, and replace=false
 * CreateItem. No Unlock, Prompt, CreateCollection, or SetSecret invocation.
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import net from "node:net";
import { clearTimeout, setTimeout } from "node:timers";
import { StorageError } from "./errors.js";

export const SECRET_SERVICE_NAME: string = "org.freedesktop.secrets";
export const SECRET_SERVICE_PATH: string = "/org/freedesktop/secrets";
export const SECRET_SERVICE_IFACE: string = "org.freedesktop.Secret.Service";
export const LOGIN_COLLECTION_PATH: string = "/org/freedesktop/secrets/collection/login";
export const PROPERTIES_IFACE: string = "org.freedesktop.DBus.Properties";
export const DH_ALGORITHM: string = "dh-ietf1024-sha256-aes128-cbc-pkcs7";
const DH_PRIME_BYTES: number = 128;

export class DbusCallError extends Error {
  readonly dbusName: string;

  constructor(dbusName: string) {
    super("dbus call failed");
    this.name = "DbusCallError";
    this.dbusName = dbusName;
  }
}

function remainingMs(deadlineMs: number): number {
  return deadlineMs - Date.now();
}

export interface DbusMethodMessage {
  path: string;
  destination: string;
  interface: string;
  member: string;
  signature: string;
  body: unknown[];
}

type InvokeCallback = (error: unknown, ...args: unknown[]) => void;

interface RawBusLike {
  invoke: (message: Record<string, unknown>, callback: InvokeCallback) => void;
  connection: unknown;
}

interface RawConnectionLike {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  once: (event: string, listener: (...args: unknown[]) => void) => void;
}

function asRawBus(value: unknown): RawBusLike {
  if (typeof value !== "object" || value === null) {
    throw new StorageError("provider_failure");
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof record["invoke"] !== "function") {
    throw new StorageError("provider_failure");
  }
  return value as RawBusLike;
}

function asRawConnection(value: unknown): RawConnectionLike | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof record["on"] !== "function" || typeof record["once"] !== "function") {
    return null;
  }
  return value as RawConnectionLike;
}

function loadDbusModule(): {
  createClient: (params: Record<string, unknown>) => unknown;
} {
  const requireFn: NodeRequire = createRequire(import.meta.url);
  let loaded: unknown;
  try {
    loaded = requireFn("@homebridge/dbus-native");
  } catch {
    throw new StorageError("provider_failure");
  }
  if (typeof loaded !== "object" || loaded === null) {
    throw new StorageError("provider_failure");
  }
  const record: Record<string, unknown> = loaded as Record<string, unknown>;
  if (typeof record["createClient"] !== "function") {
    throw new StorageError("provider_failure");
  }
  return {
    createClient: record["createClient"] as (params: Record<string, unknown>) => unknown,
  };
}

export interface DbusClient {
  call(message: DbusMethodMessage, deadlineMs: number): Promise<unknown[]>;
  destroy(): void;
}

class DbusClientImpl implements DbusClient {
  private readonly bus: RawBusLike;
  private readonly socket: net.Socket;
  private readonly pending: Set<number>;
  private socketFailed: boolean;
  private nextLocalId: number;

  constructor(bus: RawBusLike, socket: net.Socket) {
    this.bus = bus;
    this.socket = socket;
    this.pending = new Set<number>();
    this.socketFailed = false;
    this.nextLocalId = 1;
  }

  markSocketFailed(): void {
    this.socketFailed = true;
  }

  async call(message: DbusMethodMessage, deadlineMs: number): Promise<unknown[]> {
    if (this.socketFailed || this.socket.destroyed) {
      throw new StorageError("provider_failure");
    }
    const waitMs: number = remainingMs(deadlineMs);
    if (waitMs <= 0) {
      throw new StorageError("provider_failure");
    }
    const wire: Record<string, unknown> = {
      path: message.path,
      destination: message.destination,
      interface: message.interface,
      member: message.member,
      signature: message.signature,
      body: message.body,
    };
    const localId: number = this.nextLocalId;
    this.nextLocalId += 1;
    this.pending.add(localId);
    try {
      const result: unknown[] = await new Promise<unknown[]>((resolve, reject) => {
        const timer: NodeJS.Timeout = setTimeout(() => {
          this.pending.delete(localId);
          this.cancelCookie(wire);
          reject(new StorageError("provider_failure"));
        }, waitMs);
        const callback: InvokeCallback = (error: unknown, ...args: unknown[]) => {
          if (!this.pending.has(localId)) {
            return;
          }
          this.pending.delete(localId);
          clearTimeout(timer);
          if (error !== null && error !== undefined) {
            reject(error);
            return;
          }
          resolve(args);
        };
        try {
          this.bus.invoke(wire, callback);
        } catch {
          this.pending.delete(localId);
          clearTimeout(timer);
          reject(new StorageError("provider_failure"));
        }
      });
      return result;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        typeof (error as { name: unknown }).name === "string"
      ) {
        throw new DbusCallError((error as { name: string }).name);
      }
      throw new StorageError("provider_failure");
    }
  }

  private cancelCookie(wire: Record<string, unknown>): void {
    const serial: unknown = wire["serial"];
    if (typeof serial !== "number") {
      return;
    }
    const cookies: unknown = (this.bus as unknown as Record<string, unknown>)["cookies"];
    if (typeof cookies === "object" && cookies !== null) {
      try {
        delete (cookies as Record<number, unknown>)[serial];
      } catch {
        // Best effort only.
      }
    }
  }

  destroy(): void {
    try {
      this.socket.destroy();
    } catch {
      // Best effort only.
    }
  }
}

/**
 * Open a raw framed connection to the private bus socket. Unix-connect
 * failures map to key_unavailable; everything after a successful connect
 * maps to provider_failure.
 */
export async function connectBus(socketPath: string, deadlineMs: number): Promise<DbusClient> {
  if (remainingMs(deadlineMs) <= 0) {
    throw new StorageError("key_unavailable");
  }
  const socket: net.Socket = net.createConnection(socketPath);
  const connected: Promise<void> = new Promise<void>((resolve, reject) => {
    const onError: (error: unknown) => void = () => {
      reject(new StorageError("key_unavailable"));
    };
    socket.once("connect", () => {
      socket.removeListener("error", onError);
      resolve();
    });
    socket.once("error", onError);
  });
  const connectWait: number = remainingMs(deadlineMs);
  let timer: NodeJS.Timeout | null = null;
  const timeout: Promise<void> = new Promise<void>((_resolve, reject) => {
    timer = setTimeout(
      () => {
        reject(new StorageError("key_unavailable"));
      },
      Math.max(1, connectWait),
    );
  });
  try {
    await Promise.race([connected, timeout]);
  } catch (error) {
    try {
      socket.destroy();
    } catch {
      // Best effort only.
    }
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("key_unavailable");
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
  const module: {
    createClient: (params: Record<string, unknown>) => unknown;
  } = loadDbusModule();
  let rawBus: unknown;
  try {
    rawBus = module.createClient({
      stream: socket,
      direct: true,
      authMethods: ["EXTERNAL"],
      ayBuffer: true,
    });
  } catch {
    try {
      socket.destroy();
    } catch {
      // Best effort only.
    }
    throw new StorageError("provider_failure");
  }
  const bus: RawBusLike = asRawBus(rawBus);
  const client: DbusClientImpl = new DbusClientImpl(bus, socket);
  const rawConnection: RawConnectionLike | null = asRawConnection(bus.connection);
  if (rawConnection !== null) {
    // The dependency re-emits stream errors on its own emitter; without a
    // listener it would throw. Socket handlers below do the real work.
    rawConnection.on("error", () => {
      client.markSocketFailed();
    });
  }
  socket.on("error", () => {
    client.markSocketFailed();
  });
  // Manual Hello (the dependency's automatic Hello throws raw on failure).
  try {
    const reply: unknown[] = await client.call(
      {
        path: "/org/freedesktop/DBus",
        destination: "org.freedesktop.DBus",
        interface: "org.freedesktop.DBus",
        member: "Hello",
        signature: "",
        body: [],
      },
      deadlineMs,
    );
    if (reply.length !== 1 || typeof reply[0] !== "string" || reply[0] === "") {
      throw new StorageError("provider_failure");
    }
  } catch (error) {
    client.destroy();
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("provider_failure");
  }
  return client;
}

export function toObjectPaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new StorageError("provider_failure");
  }
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !entry.startsWith("/")) {
      throw new StorageError("provider_failure");
    }
    out.push(entry);
  }
  return out;
}

function toByteBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  if (
    Array.isArray(value) &&
    value.every(
      (entry: unknown): boolean =>
        typeof entry === "number" && Number.isInteger(entry) && entry >= 0 && entry <= 255,
    )
  ) {
    return Buffer.from(value as number[]);
  }
  throw new StorageError("provider_failure");
}

/**
 * Decode a received variant encoded by this dependency as
 * [signatureTree, [value]]. Accepts the single complete inner value.
 */
export function decodeVariant(value: unknown): unknown {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new StorageError("provider_failure");
  }
  const inner: unknown = value[1];
  if (!Array.isArray(inner) || inner.length !== 1) {
    throw new StorageError("provider_failure");
  }
  return inner[0];
}

export interface DhSession {
  sessionPath: string;
  aesKey: Buffer;
}

function assertSessionPath(value: unknown): string {
  if (typeof value !== "string" || value === "" || !value.startsWith("/")) {
    throw new StorageError("provider_failure");
  }
  return value;
}

function dhSessionKey(dh: crypto.DiffieHellmanGroup, serverPublic: Buffer): Buffer {
  if (serverPublic.byteLength < 1 || serverPublic.byteLength > DH_PRIME_BYTES) {
    throw new StorageError("provider_failure");
  }
  if (serverPublic.every((byte: number): boolean => byte === 0)) {
    throw new StorageError("provider_failure");
  }
  const prime: Buffer = dh.getPrime();
  if (prime.byteLength !== DH_PRIME_BYTES) {
    throw new StorageError("provider_failure");
  }
  let shared: Buffer;
  try {
    shared = dh.computeSecret(serverPublic);
  } catch {
    throw new StorageError("provider_failure");
  }
  const padded: Buffer = Buffer.alloc(DH_PRIME_BYTES);
  if (shared.byteLength > DH_PRIME_BYTES) {
    throw new StorageError("provider_failure");
  }
  shared.copy(padded, DH_PRIME_BYTES - shared.byteLength);
  const key: Buffer = Buffer.from(crypto.hkdfSync("sha256", padded, Buffer.alloc(32), "", 16));
  padded.fill(0);
  shared.fill(0);
  return key;
}

export function dhEncrypt(
  aesKey: Uint8Array,
  plaintext: Uint8Array,
): { params: Buffer; value: Buffer } {
  const iv: Buffer = crypto.randomBytes(16);
  const cipher: crypto.Cipheriv = crypto.createCipheriv("aes-128-cbc", aesKey, iv);
  const value: Buffer = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { params: iv, value };
}

export function dhDecrypt(aesKey: Uint8Array, params: Uint8Array, value: Uint8Array): Buffer {
  if (params.byteLength !== 16) {
    throw new StorageError("provider_failure");
  }
  try {
    const decipher: crypto.Decipheriv = crypto.createDecipheriv("aes-128-cbc", aesKey, params);
    return Buffer.concat([decipher.update(value), decipher.final()]);
  } catch {
    throw new StorageError("provider_failure");
  }
}

async function serviceCall(
  client: DbusClient,
  member: string,
  signature: string,
  body: unknown[],
  deadlineMs: number,
): Promise<unknown[]> {
  try {
    return await client.call(
      {
        path: SECRET_SERVICE_PATH,
        destination: SECRET_SERVICE_NAME,
        interface: SECRET_SERVICE_IFACE,
        member,
        signature,
        body,
      },
      deadlineMs,
    );
  } catch (error) {
    if (error instanceof DbusCallError) {
      throw error;
    }
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("provider_failure");
  }
}

export async function ensureSecretsService(client: DbusClient, deadlineMs: number): Promise<void> {
  try {
    const reply: unknown[] = await client.call(
      {
        path: "/org/freedesktop/DBus",
        destination: "org.freedesktop.DBus",
        interface: "org.freedesktop.DBus",
        member: "GetNameOwner",
        signature: "s",
        body: [SECRET_SERVICE_NAME],
      },
      deadlineMs,
    );
    if (reply.length !== 1 || typeof reply[0] !== "string" || reply[0] === "") {
      throw new StorageError("provider_failure");
    }
  } catch (error) {
    if (
      error instanceof DbusCallError &&
      error.dbusName === "org.freedesktop.DBus.Error.NameHasNoOwner"
    ) {
      throw new StorageError("key_unavailable");
    }
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("provider_failure");
  }
}

export async function readLoginCollection(client: DbusClient, deadlineMs: number): Promise<string> {
  const reply: unknown[] = await serviceCall(client, "ReadAlias", "s", ["default"], deadlineMs);
  if (reply.length !== 1 || typeof reply[0] !== "string") {
    throw new StorageError("provider_failure");
  }
  if (reply[0] !== LOGIN_COLLECTION_PATH) {
    throw new StorageError("key_unavailable");
  }
  const lockedReply: unknown[] = await client.call(
    {
      path: LOGIN_COLLECTION_PATH,
      destination: SECRET_SERVICE_NAME,
      interface: PROPERTIES_IFACE,
      member: "Get",
      signature: "ss",
      body: ["org.freedesktop.Secret.Collection", "Locked"],
    },
    deadlineMs,
  );
  if (lockedReply.length !== 1) {
    throw new StorageError("provider_failure");
  }
  const locked: unknown = decodeVariant(lockedReply[0]);
  if (typeof locked !== "boolean") {
    throw new StorageError("provider_failure");
  }
  if (locked) {
    throw new StorageError("key_locked");
  }
  return LOGIN_COLLECTION_PATH;
}

export async function openDhSession(client: DbusClient, deadlineMs: number): Promise<DhSession> {
  const dh: crypto.DiffieHellmanGroup = crypto.getDiffieHellman("modp2");
  if (dh.getPrime().byteLength !== DH_PRIME_BYTES) {
    throw new StorageError("provider_failure");
  }
  dh.generateKeys();
  const clientPublic: Buffer = dh.getPublicKey();
  const reply: unknown[] = await serviceCall(
    client,
    "OpenSession",
    "sv",
    [DH_ALGORITHM, ["ay", clientPublic]],
    deadlineMs,
  );
  if (reply.length !== 2 || typeof reply[1] !== "string") {
    throw new StorageError("provider_failure");
  }
  const serverPublicRaw: unknown = decodeVariant(reply[0]);
  const serverPublic: Buffer = toByteBuffer(serverPublicRaw);
  const aesKey: Buffer = dhSessionKey(dh, serverPublic);
  return { sessionPath: assertSessionPath(reply[1]), aesKey };
}

export interface SecretSearchResult {
  unlocked: string[];
  locked: string[];
}

export async function searchMasterItems(
  client: DbusClient,
  attributes: Record<string, string>,
  deadlineMs: number,
): Promise<SecretSearchResult> {
  const pairs: string[][] = [];
  for (const key of Object.keys(attributes)) {
    const value: string | undefined = attributes[key];
    if (value === undefined) {
      throw new StorageError("provider_failure");
    }
    pairs.push([key, value]);
  }
  const reply: unknown[] = await serviceCall(client, "SearchItems", "a{ss}", [pairs], deadlineMs);
  if (reply.length !== 2) {
    throw new StorageError("provider_failure");
  }
  return {
    unlocked: toObjectPaths(reply[0]),
    locked: toObjectPaths(reply[1]),
  };
}

export interface SecretStruct {
  session: string;
  params: Buffer;
  value: Buffer;
  contentType: string;
}

export function encodeSecretStruct(
  sessionPath: string,
  params: Uint8Array,
  value: Uint8Array,
  contentType: string,
): unknown[] {
  return [sessionPath, Buffer.from(params), Buffer.from(value), contentType];
}

export function decodeSecretStruct(value: unknown): SecretStruct {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new StorageError("provider_failure");
  }
  const parts: unknown[] = value;
  if (typeof parts[0] !== "string" || typeof parts[3] !== "string") {
    throw new StorageError("provider_failure");
  }
  return {
    session: parts[0],
    params: toByteBuffer(parts[1]),
    value: toByteBuffer(parts[2]),
    contentType: parts[3],
  };
}

export async function getItemSecret(
  client: DbusClient,
  itemPath: string,
  sessionPath: string,
  deadlineMs: number,
): Promise<SecretStruct> {
  const reply: unknown[] = await client.call(
    {
      path: itemPath,
      destination: SECRET_SERVICE_NAME,
      interface: "org.freedesktop.Secret.Item",
      member: "GetSecret",
      signature: "o",
      body: [sessionPath],
    },
    deadlineMs,
  );
  if (reply.length !== 1) {
    throw new StorageError("provider_failure");
  }
  return decodeSecretStruct(reply[0]);
}

export async function createMasterItem(
  client: DbusClient,
  collectionPath: string,
  sessionPath: string,
  label: string,
  attributes: Record<string, string>,
  aesKey: Uint8Array,
  secretBytes: Uint8Array,
  contentType: string,
  deadlineMs: number,
): Promise<string> {
  const { params, value } = dhEncrypt(aesKey, secretBytes);
  const attrPairs: string[][] = [];
  for (const key of Object.keys(attributes)) {
    const attrValue: string | undefined = attributes[key];
    if (attrValue === undefined) {
      throw new StorageError("provider_failure");
    }
    attrPairs.push([key, attrValue]);
  }
  const properties: unknown[] = [
    ["org.freedesktop.Secret.Item.Label", ["s", label]],
    ["org.freedesktop.Secret.Item.Attributes", ["a{ss}", attrPairs]],
  ];
  const reply: unknown[] = await client.call(
    {
      path: collectionPath,
      destination: SECRET_SERVICE_NAME,
      interface: "org.freedesktop.Secret.Collection",
      member: "CreateItem",
      signature: "a{sv}(oayays)b",
      body: [properties, encodeSecretStruct(sessionPath, params, value, contentType), false],
    },
    deadlineMs,
  );
  params.fill(0);
  value.fill(0);
  if (reply.length !== 2 || typeof reply[0] !== "string" || typeof reply[1] !== "string") {
    throw new StorageError("provider_failure");
  }
  if (reply[1] !== "/") {
    throw new StorageError("provider_failure");
  }
  if (!reply[0].startsWith(`${collectionPath}/`)) {
    throw new StorageError("provider_failure");
  }
  return reply[0];
}

export async function closeDhSession(
  client: DbusClient,
  sessionPath: string,
  deadlineMs: number,
): Promise<void> {
  try {
    await client.call(
      {
        path: sessionPath,
        destination: SECRET_SERVICE_NAME,
        interface: "org.freedesktop.Secret.Session",
        member: "Close",
        signature: "",
        body: [],
      },
      deadlineMs,
    );
  } catch {
    // Best effort: disconnect is the real session cleanup.
  }
}

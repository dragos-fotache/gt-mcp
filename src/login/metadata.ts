/** Protected, credential-free T07 binding publication metadata. */
import { randomUUID } from "node:crypto";
import { constants, promises as fs } from "node:fs";
import type { BigIntStats } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import {
  assertFileSeparation,
  validateConfigRecord,
  validateDescriptorRecord,
} from "../runtime/config.js";
import type { ValidatedConfig } from "../runtime/config.js";
import { loadProtectedFile, parseStrictMetadataJson } from "../runtime/files.js";
import { isReadRuntimeError } from "../runtime/errors.js";
import type { StorageBinding } from "../storage/types.js";
import { LoginError } from "./errors.js";

export interface LoginReceipt {
  readonly version: 1;
  readonly kind: "provision" | "install";
  readonly transitionId: string;
  readonly from: StorageBinding | null;
  readonly to: StorageBinding;
}

export interface LoginMetadata {
  readonly config: ValidatedConfig;
  readDescriptor(): Promise<StorageBinding | null>;
  readReceipt(): Promise<LoginReceipt | null>;
  prepareReceipt(receipt: LoginReceipt): Promise<void>;
  publishDescriptor(expected: StorageBinding | null, target: StorageBinding): Promise<void>;
  removeReceipt(expected: LoginReceipt): Promise<void>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_METADATA_BYTES = 4096;

function failConfiguration(): never {
  throw new LoginError("configuration_required");
}

function failRecovery(): never {
  throw new LoginError("recovery_required");
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function exactRecord(value: unknown, keys: ReadonlyArray<string>): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failConfiguration();
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    failConfiguration();
  }
  const names: Array<PropertyKey> = Reflect.ownKeys(value);
  if (
    names.length !== keys.length ||
    names.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    failConfiguration();
  }
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (property === undefined || !("value" in property)) {
      failConfiguration();
    }
    result[key] = property.value;
  }
  return result;
}

function binding(value: unknown, origin: string): StorageBinding {
  const record = exactRecord(value, [
    "origin",
    "accountUuid",
    "sessionGeneration",
    "profileGenerationId",
  ]);
  return Object.freeze(validateDescriptorRecord({ version: 1, binding: record }, origin));
}

function receipt(value: unknown, origin: string): LoginReceipt {
  const record = exactRecord(value, ["version", "kind", "transitionId", "from", "to"]);
  if (
    record["version"] !== 1 ||
    (record["kind"] !== "provision" && record["kind"] !== "install") ||
    typeof record["transitionId"] !== "string" ||
    !UUID.test(record["transitionId"])
  ) {
    failConfiguration();
  }
  const from = record["from"] === null ? null : binding(record["from"], origin);
  const to = binding(record["to"], origin);
  if (record["kind"] === "provision") {
    if (from !== null || to.accountUuid !== null || to.sessionGeneration !== 0) {
      failConfiguration();
    }
  } else if (
    from === null ||
    to.profileGenerationId !== from.profileGenerationId ||
    to.sessionGeneration !== from.sessionGeneration + 1 ||
    (from.accountUuid === null && from.sessionGeneration !== 0) ||
    to.accountUuid === null ||
    (from.accountUuid !== null && from.accountUuid !== to.accountUuid)
  ) {
    failConfiguration();
  }
  return Object.freeze({
    version: 1,
    kind: record["kind"],
    transitionId: record["transitionId"],
    from,
    to,
  });
}

function sameBinding(left: StorageBinding | null, right: StorageBinding | null): boolean {
  return left === null || right === null
    ? left === right
    : left.origin === right.origin &&
        left.accountUuid === right.accountUuid &&
        left.profileGenerationId === right.profileGenerationId &&
        left.sessionGeneration === right.sessionGeneration;
}

function sameReceipt(left: LoginReceipt, right: LoginReceipt): boolean {
  return (
    left.kind === right.kind &&
    left.transitionId === right.transitionId &&
    sameBinding(left.from, right.from) &&
    sameBinding(left.to, right.to)
  );
}

interface DirectoryIdentity {
  readonly name: string;
  readonly stat: BigIntStats;
}

interface FileSnapshot {
  readonly stat: BigIntStats;
  readonly bytes: Buffer;
}

function sameDirectory(left: BigIntStats, right: BigIntStats): boolean {
  return (
    right.isDirectory() &&
    !right.isSymbolicLink() &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode
  );
}

function sameFile(left: BigIntStats, right: BigIntStats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function safeFile(entry: BigIntStats, uid: number): void {
  const mode = Number(entry.mode) & 0o777;
  if (
    !entry.isFile() ||
    entry.isSymbolicLink() ||
    entry.nlink !== 1n ||
    entry.uid !== BigInt(uid) ||
    (mode !== 0o400 && mode !== 0o600) ||
    entry.size > BigInt(MAX_METADATA_BYTES)
  ) {
    failConfiguration();
  }
}

async function ancestry(parent: string, uid: number): Promise<ReadonlyArray<DirectoryIdentity>> {
  const result: Array<DirectoryIdentity> = [];
  let directory = parent;
  for (;;) {
    const stat = await fs.lstat(directory, { bigint: true });
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      (stat.uid !== BigInt(uid) && stat.uid !== 0n)
    ) {
      failConfiguration();
    }
    const mode = Number(stat.mode);
    if (result.length === 0 && (stat.uid !== BigInt(uid) || (mode & 0o777) !== 0o700)) {
      failConfiguration();
    }
    if ((mode & 0o022) !== 0 && (stat.uid !== 0n || (mode & 0o1000) === 0)) {
      failConfiguration();
    }
    result.push({ name: directory, stat });
    if (directory === "/") {
      return result;
    }
    directory = path.posix.dirname(directory);
  }
}

async function revalidate(chain: ReadonlyArray<DirectoryIdentity>): Promise<void> {
  for (const entry of chain) {
    if (!sameDirectory(entry.stat, await fs.lstat(entry.name, { bigint: true }))) {
      failConfiguration();
    }
  }
}

async function readFile(
  parent: FileHandle,
  name: string,
  uid: number,
): Promise<FileSnapshot | null> {
  const selected = `/proc/self/fd/${parent.fd}/${name}`;
  let before: BigIntStats;
  try {
    before = await fs.lstat(selected, { bigint: true });
  } catch (error: unknown) {
    if (isMissing(error)) {
      return null;
    }
    throw error;
  }
  safeFile(before, uid);
  const handle = await fs.open(
    selected,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const opened = await handle.stat({ bigint: true });
    safeFile(opened, uid);
    if (!sameFile(before, opened)) {
      failRecovery();
    }
    // One overflow sentinel also rejects growth after the initial size check.
    const bytes = Buffer.alloc(MAX_METADATA_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(bytes, length, bytes.length - length, length);
      if (result.bytesRead === 0) {
        break;
      }
      length += result.bytesRead;
    }
    if (length > MAX_METADATA_BYTES) {
      failConfiguration();
    }
    const after = await handle.stat({ bigint: true });
    const live = await fs.lstat(selected, { bigint: true });
    safeFile(after, uid);
    safeFile(live, uid);
    if (!sameFile(opened, after) || !sameFile(after, live)) {
      failRecovery();
    }
    return { stat: after, bytes: bytes.subarray(0, length) };
  } finally {
    await handle.close();
  }
}

function sameSnapshot(left: FileSnapshot | null, right: FileSnapshot | null): boolean {
  return left === null || right === null
    ? left === right
    : sameFile(left.stat, right.stat) && left.bytes.equals(right.bytes);
}

/** No IO occurs until this explicit trusted factory is called. */
export async function openLoginMetadata(configPath: string): Promise<LoginMetadata> {
  if (
    typeof configPath !== "string" ||
    configPath.includes("\0") ||
    !path.posix.isAbsolute(configPath) ||
    path.posix.normalize(configPath) !== configPath
  ) {
    throw new LoginError("invalid_arguments");
  }
  try {
    return await openMetadata(configPath);
  } catch (error: unknown) {
    if (error instanceof LoginError) {
      throw error;
    }
    failConfiguration();
  }
}

async function openMetadata(configPath: string): Promise<LoginMetadata> {
  if (process.platform !== "linux" || typeof process.geteuid !== "function") {
    failConfiguration();
  }
  const uid = process.geteuid();
  const loaded = await loadProtectedFile(configPath, 65536);
  if (loaded.status === "missing") {
    failConfiguration();
  }
  const parsedConfig = validateConfigRecord(parseStrictMetadataJson(loaded.bytes));
  assertFileSeparation(parsedConfig, configPath);
  const pendingPath = `${parsedConfig.descriptorPath}.pending`;
  assertFileSeparation({ ...parsedConfig, descriptorPath: pendingPath }, configPath);
  if (pendingPath === configPath) {
    failConfiguration();
  }
  const config: ValidatedConfig = Object.freeze({
    ...parsedConfig,
    budgets:
      parsedConfig.budgets === undefined ? undefined : Object.freeze({ ...parsedConfig.budgets }),
  });
  const parentPath = path.posix.dirname(config.descriptorPath);
  const descriptorName = path.posix.basename(config.descriptorPath);
  const pendingName = `${descriptorName}.pending`;
  const chain = await ancestry(parentPath, uid);
  let descriptorSnapshot: FileSnapshot | null = null;
  let receiptSnapshot: FileSnapshot | null = null;
  let initialized = false;
  let broken = false;
  let queue: Promise<void> = Promise.resolve();

  async function withParent<T>(action: (parent: FileHandle) => Promise<T>): Promise<T> {
    if (broken) {
      failRecovery();
    }
    let parent: FileHandle | undefined;
    try {
      await revalidate(chain);
      parent = await fs.open(
        parentPath,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      );
      const first = chain[0];
      if (first === undefined || !sameDirectory(first.stat, await parent.stat({ bigint: true }))) {
        failConfiguration();
      }
      const descriptor = await readFile(parent, descriptorName, uid);
      const pending = await readFile(parent, pendingName, uid);
      if (
        initialized &&
        (!sameSnapshot(descriptorSnapshot, descriptor) || !sameSnapshot(receiptSnapshot, pending))
      ) {
        failRecovery();
      }
      descriptorSnapshot = descriptor;
      receiptSnapshot = pending;
      initialized = true;
      await revalidate(chain);
      const result = await action(parent);
      await revalidate(chain);
      return result;
    } catch (error: unknown) {
      broken = true;
      if (error instanceof LoginError) {
        throw error;
      }
      if (isReadRuntimeError(error)) {
        failConfiguration();
      }
      return failRecovery();
    } finally {
      if (parent !== undefined) {
        try {
          await parent.close();
        } catch {
          broken = true;
          failRecovery();
        }
      }
    }
  }

  function serialized<T>(action: (parent: FileHandle) => Promise<T>): Promise<T> {
    const result = queue.then(() => withParent(action));
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  function currentDescriptor(): StorageBinding | null {
    return descriptorSnapshot === null
      ? null
      : Object.freeze(
          validateDescriptorRecord(
            parseStrictMetadataJson(descriptorSnapshot.bytes),
            config.canonicalOrigin,
          ),
        );
  }

  function currentReceipt(): LoginReceipt | null {
    return receiptSnapshot === null
      ? null
      : receipt(parseStrictMetadataJson(receiptSnapshot.bytes), config.canonicalOrigin);
  }

  function callShape<T>(validate: () => T): T {
    try {
      return validate();
    } catch {
      throw new LoginError("invalid_arguments");
    }
  }

  async function createExclusive(
    parent: FileHandle,
    name: string,
    bytes: Buffer,
  ): Promise<FileSnapshot> {
    const selected = `/proc/self/fd/${parent.fd}/${name}`;
    const handle = await fs.open(
      selected,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    let written: BigIntStats;
    try {
      await handle.writeFile(bytes);
      await handle.sync();
      written = await handle.stat({ bigint: true });
      safeFile(written, uid);
    } finally {
      await handle.close();
    }
    const snapshot = await readFile(parent, name, uid);
    if (snapshot === null || !sameFile(written, snapshot.stat) || !snapshot.bytes.equals(bytes)) {
      failRecovery();
    }
    return snapshot;
  }

  await withParent(async () => {
    currentDescriptor();
    currentReceipt();
  });

  return Object.freeze({
    config,
    readDescriptor: () => serialized(async () => currentDescriptor()),
    readReceipt: () => serialized(async () => currentReceipt()),
    prepareReceipt: async (input: LoginReceipt) => {
      const next = callShape(() => receipt(input, config.canonicalOrigin));
      return serialized(async (parent) => {
        if (currentReceipt() !== null || !sameBinding(currentDescriptor(), next.from)) {
          failRecovery();
        }
        const bytes = Buffer.from(JSON.stringify(next), "utf8");
        if (bytes.length > MAX_METADATA_BYTES) {
          throw new LoginError("invalid_arguments");
        }
        receiptSnapshot = await createExclusive(parent, pendingName, bytes);
        await parent.sync();
      });
    },
    publishDescriptor: async (
      inputExpected: StorageBinding | null,
      inputTarget: StorageBinding,
    ) => {
      const expected = callShape(() =>
        inputExpected === null ? null : binding(inputExpected, config.canonicalOrigin),
      );
      const target = callShape(() => binding(inputTarget, config.canonicalOrigin));
      return serialized(async (parent) => {
        const pending = currentReceipt();
        if (
          pending === null ||
          !sameBinding(currentDescriptor(), expected) ||
          (!sameBinding(expected, pending.from) && !sameBinding(expected, pending.to)) ||
          (!sameBinding(target, pending.from) && !sameBinding(target, pending.to))
        ) {
          failRecovery();
        }
        if (sameBinding(expected, target)) {
          // Confirm durability even when recovery observes the already-published target.
          const handle = await fs.open(
            `/proc/self/fd/${parent.fd}/${descriptorName}`,
            constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
          );
          try {
            if (
              descriptorSnapshot === null ||
              !sameFile(descriptorSnapshot.stat, await handle.stat({ bigint: true }))
            ) {
              failRecovery();
            }
            await handle.sync();
          } finally {
            await handle.close();
          }
          await parent.sync();
          if (!sameSnapshot(descriptorSnapshot, await readFile(parent, descriptorName, uid))) {
            failRecovery();
          }
          return;
        }
        const temporaryName = `.${descriptorName}.${randomUUID()}.tmp`;
        const bytes = Buffer.from(JSON.stringify({ version: 1, binding: target }), "utf8");
        const temporary = await createExclusive(parent, temporaryName, bytes);
        await revalidate(chain);
        if (
          !sameSnapshot(descriptorSnapshot, await readFile(parent, descriptorName, uid)) ||
          !sameSnapshot(receiptSnapshot, await readFile(parent, pendingName, uid))
        ) {
          failRecovery();
        }
        await fs.rename(
          `/proc/self/fd/${parent.fd}/${temporaryName}`,
          `/proc/self/fd/${parent.fd}/${descriptorName}`,
        );
        await parent.sync();
        descriptorSnapshot = await readFile(parent, descriptorName, uid);
        if (
          descriptorSnapshot === null ||
          temporary.stat.dev !== descriptorSnapshot.stat.dev ||
          temporary.stat.ino !== descriptorSnapshot.stat.ino ||
          !temporary.bytes.equals(descriptorSnapshot.bytes)
        ) {
          failRecovery();
        }
      });
    },
    removeReceipt: async (input: LoginReceipt) => {
      const expected = callShape(() => receipt(input, config.canonicalOrigin));
      return serialized(async (parent) => {
        const pending = currentReceipt();
        if (pending === null || !sameReceipt(pending, expected)) {
          failRecovery();
        }
        const descriptor = currentDescriptor();
        if (!sameBinding(descriptor, pending.from) && !sameBinding(descriptor, pending.to)) {
          failRecovery();
        }
        if (!sameSnapshot(receiptSnapshot, await readFile(parent, pendingName, uid))) {
          failRecovery();
        }
        await fs.unlink(`/proc/self/fd/${parent.fd}/${pendingName}`);
        await parent.sync();
        receiptSnapshot = null;
      });
    },
  });
}

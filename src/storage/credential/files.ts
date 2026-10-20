import fs from "node:fs";
import path from "node:path";
import { StorageError } from "../errors.js";
import {
  assertSafeAncestors,
  assertSingleWriteFlockLease,
  fsyncDirectory,
  statIdentityOfPath,
  validateDirStat,
  validateRegularFileStat,
  tempFileName,
} from "../fsutil.js";

export interface Identity {
  readonly dev: string;
  readonly ino: string;
}
export interface Ownership {
  readonly root: Identity;
  readonly lock: Identity;
}
export type Probe = (
  point: "replace.before.rename" | "replace.after.rename" | "replace.reply" | "remove.key.deleted",
) => Promise<void>;
export const noProbe: Probe = async () => {};
export const isTemp = (name: string): boolean =>
  /^\.credentials\.enc\.[0-9]+\.[0-9]+\.[0-9a-f]{8}\.tmp(?![\s\S])/.test(name);

export function sameIdentity(a: Identity, b: Identity): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

export function safeRoot(root: string): void {
  assertSafeAncestors(root);
  try {
    validateDirStat(fs.lstatSync(root));
  } catch {
    throw new StorageError("io_failure");
  }
}

export function bootstrap(root: string, create: boolean): { fd: number; ownership: Ownership } {
  assertSafeAncestors(root);
  let fd = -1;
  try {
    if (create) {
      try {
        fs.mkdirSync(root, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST")
          throw new StorageError("already_provisioned");
        throw error;
      }
      fsyncDirectory(path.dirname(root));
    }
    safeRoot(root);
    fd = fs.openSync(
      path.join(root, "owner.lock"),
      fs.constants.O_RDWR |
        fs.constants.O_NOFOLLOW |
        (create ? fs.constants.O_CREAT | fs.constants.O_EXCL : 0),
      0o600,
    );
    validateRegularFileStat(fs.fstatSync(fd));
    if (create) {
      fs.fsyncSync(fd);
      fsyncDirectory(root);
    }
    const st = fs.fstatSync(fd, { bigint: true });
    return {
      fd,
      ownership: {
        root: statIdentityOfPath(root, false),
        lock: { dev: String(st.dev), ino: String(st.ino) },
      },
    };
  } catch (error) {
    if (fd >= 0) fs.closeSync(fd);
    if (error instanceof StorageError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new StorageError("not_provisioned");
    throw new StorageError("io_failure");
  }
}

/** Revalidate both the held inode and its pathname before every protected call. */
export function checkOwnership(root: string, ownership: Ownership): void {
  safeRoot(root);
  if (!sameIdentity(statIdentityOfPath(root, false), ownership.root))
    throw new StorageError("commit_ambiguous");
  const lock = path.join(root, "owner.lock");
  try {
    validateRegularFileStat(fs.lstatSync(lock));
  } catch {
    throw new StorageError("io_failure");
  }
  if (!sameIdentity(statIdentityOfPath(lock, false), ownership.lock))
    throw new StorageError("commit_ambiguous");
  assertSingleWriteFlockLease(ownership.lock.dev, ownership.lock.ino);
}

/** Reject unknown data before cleanup; never recursively erase a selected root. */
export function knownFiles(root: string): string[] {
  try {
    const names = fs.readdirSync(root);
    for (const name of names) {
      if (name !== "owner.lock" && name !== "credentials.enc" && !isTemp(name))
        throw new StorageError("io_failure");
      validateRegularFileStat(fs.lstatSync(path.join(root, name)));
    }
    return names;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError("io_failure");
  }
}

/** Only the rename-attempt boundary changes definite IO failure to uncertainty. */
export async function replace(root: string, bytes: Uint8Array, probe: Probe): Promise<void> {
  const temporary = path.join(root, tempFileName("credentials.enc"));
  let fd = -1;
  let attempted = false;
  try {
    fd = fs.openSync(
      temporary,
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW,
      0o600,
    );
    let offset = 0;
    while (offset < bytes.byteLength) {
      const written = fs.writeSync(fd, bytes, offset, bytes.byteLength - offset);
      if (written <= 0) throw new StorageError("io_failure");
      offset += written;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    await probe("replace.before.rename");
    attempted = true;
    fs.renameSync(temporary, path.join(root, "credentials.enc"));
    await probe("replace.after.rename");
    fsyncDirectory(root);
    await probe("replace.reply");
  } catch {
    throw new StorageError(attempted ? "commit_ambiguous" : "io_failure");
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {
        /* Primary failure retained. */
      }
    }
    try {
      fs.unlinkSync(temporary);
    } catch {
      /* Never a startup candidate. */
    }
  }
}

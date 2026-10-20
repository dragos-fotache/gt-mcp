import fs from "node:fs";
import process from "node:process";
import { StorageError } from "../errors.js";
import { ParentChannel, spawnLeaseHolder, FLOCK_CONFLICT_EXIT, type WorkerOp } from "../ipc.js";
import { assertBinding, assertByteView, assertUuid, copyBytes } from "../validate.js";
import { bootstrap } from "./files.js";
import { location, vaultUpdate } from "./validate.js";
import type { ProfileLocation, ProfileSession, StorageBinding, StoreUpdate } from "./types.js";

export class CredentialSession implements ProfileSession {
  private tail: Promise<unknown> = Promise.resolve();
  private fenced = false;
  private closed = false;
  private closing = false;
  private current: StorageBinding;
  constructor(
    binding: StorageBinding,
    private readonly channel: ParentChannel,
    private readonly timeout: number,
  ) {
    this.current = binding;
  }
  get binding(): StorageBinding {
    return this.current;
  }

  private enqueue<T>(run: (deadlineMs: number) => Promise<T>): Promise<T> {
    if (this.closing || this.closed) return Promise.reject(new StorageError("not_owner"));
    const deadlineMs = Date.now() + this.timeout;
    const result = this.tail.then(async () => {
      if (this.closed) throw new StorageError("not_owner");
      if (this.fenced) throw new StorageError("commit_ambiguous");
      try {
        if (Date.now() >= deadlineMs) throw new StorageError("commit_ambiguous");
        return await run(deadlineMs);
      } catch (error) {
        if (!(error instanceof StorageError) || error.code === "commit_ambiguous") {
          this.fenced = true;
          await this.channel.terminate();
          throw new StorageError("commit_ambiguous");
        }
        throw error;
      }
    });
    this.tail = result.catch(() => {});
    return result;
  }
  private send(
    op: WorkerOp,
    params: Record<string, unknown>,
    deadlineMs: number,
  ): Promise<unknown> {
    return this.channel.send(
      op,
      { ...params, generation: this.current.sessionGeneration, deadlineMs },
      deadlineMs,
    );
  }
  private expectVoid(value: unknown): void {
    if (value !== null) throw new StorageError("commit_ambiguous");
  }
  async readVaultBytes(): Promise<Uint8Array> {
    return this.enqueue(async (deadlineMs) => {
      const value = await this.send("readVault", {}, deadlineMs);
      try {
        return copyBytes(assertByteView(value, true));
      } catch {
        throw new StorageError("commit_ambiguous");
      }
    });
  }
  async commit(update: StoreUpdate): Promise<void> {
    const vault = vaultUpdate(update);
    try {
      await this.enqueue(async (deadlineMs) => {
        this.expectVoid(await this.send("commit", { vaultBytes: vault }, deadlineMs));
      });
    } finally {
      vault.fill(0);
    }
  }
  private async transition(
    op: "bind" | "advance",
    vault: Uint8Array,
    accountUuid?: string,
  ): Promise<StorageBinding> {
    try {
      return await this.enqueue(async (deadlineMs) => {
        const before = this.current;
        const expected = {
          ...before,
          accountUuid: accountUuid ?? before.accountUuid,
          sessionGeneration:
            op === "bind"
              ? before.accountUuid === null
                ? 1
                : before.sessionGeneration
              : before.sessionGeneration + 1,
        };
        const raw = await this.send(
          op,
          {
            vaultBytes: vault,
            ...(accountUuid === undefined ? {} : { accountUuid }),
          },
          deadlineMs,
        );
        let next: StorageBinding;
        try {
          next = assertBinding(raw);
        } catch {
          throw new StorageError("commit_ambiguous");
        }
        if (JSON.stringify(next) !== JSON.stringify(expected))
          throw new StorageError("commit_ambiguous");
        this.current = next;
        return next;
      });
    } finally {
      vault.fill(0);
    }
  }
  async bindAccount(
    accountUuid: string,
    replacementVaultBytes: Uint8Array,
  ): Promise<StorageBinding> {
    const account = assertUuid(accountUuid);
    return this.transition("bind", copyBytes(assertByteView(replacementVaultBytes, true)), account);
  }
  async advanceSessionGeneration(replacementVaultBytes: Uint8Array): Promise<StorageBinding> {
    return this.transition("advance", copyBytes(assertByteView(replacementVaultBytes, true)));
  }
  async removeProfile(): Promise<void> {
    await this.enqueue(async (deadlineMs) => {
      this.expectVoid(await this.send("removeProfile", {}, deadlineMs));
      this.fenced = true;
    });
  }
  async close(): Promise<void> {
    this.closing = true;
    await this.tail;
    this.closed = true;
    await this.channel.terminate();
  }
}

/** Internal worker launch seam; production index always supplies its fixed holder. */
export async function launch(
  request: ProfileLocation,
  action: "provision" | "open" | "removeProfile",
  worker: string,
  signal?: AbortSignal,
): Promise<ProfileSession | null> {
  const checked = location(request);
  // Only read-only acquisition may be interrupted. A delivered session and all
  // mutation operations keep their existing completion/ambiguity semantics.
  if (signal !== undefined && action !== "open") throw new StorageError("invalid_argument");
  if (signal?.aborted) throw new StorageError("not_owner");
  if (
    process.platform !== "linux" ||
    process.arch !== "x64" ||
    Number(process.versions.node.split(".")[0]) < 24
  )
    throw new StorageError("unsupported_platform");
  const { fd, ownership } = bootstrap(checked.profileRoot, action === "provision");
  let spawned;
  try {
    spawned = spawnLeaseHolder(worker, fd);
  } catch {
    throw new StorageError("io_failure");
  } finally {
    fs.closeSync(fd);
  }
  const child = spawned.child;
  const channel = new ParentChannel(child);
  const onAbort = (): void => {
    void channel.terminate();
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  // A failed executable spawn emits error without exit. Observe it alongside reply.
  const failed = new Promise<never>((_resolve, reject) => {
    child.once("error", () => reject(new StorageError("io_failure")));
  });
  try {
    const deadlineMs = Date.now() + checked.timeoutMs;
    const raw = await Promise.race([
      channel.send(action, { location: checked, ownership, deadlineMs }, deadlineMs),
      failed,
    ]);
    if (signal?.aborted) throw new StorageError("not_owner");
    if (action === "removeProfile") {
      if (raw !== null) throw new StorageError("commit_ambiguous");
      await channel.terminate();
      return null;
    }
    if (
      typeof raw !== "object" ||
      raw === null ||
      Object.keys(raw).length !== 1 ||
      !("binding" in raw)
    )
      throw new StorageError("commit_ambiguous");
    let binding: StorageBinding;
    try {
      binding = assertBinding(raw.binding);
    } catch {
      throw new StorageError("commit_ambiguous");
    }
    if (
      binding.origin !== checked.origin ||
      (action === "provision" && (binding.accountUuid !== null || binding.sessionGeneration !== 0))
    )
      throw new StorageError("commit_ambiguous");
    return new CredentialSession(binding, channel, checked.timeoutMs);
  } catch (error) {
    await channel.terminate();
    if (child.exitCode === FLOCK_CONFLICT_EXIT) throw new StorageError("locked_by_other_owner");
    if (child.exitCode !== null && child.exitCode !== 0)
      throw new StorageError(action === "open" ? "io_failure" : "commit_ambiguous");
    if (error instanceof StorageError) throw error;
    throw new StorageError("io_failure");
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * T04 protected storage — parent/holder IPC and lease-holder spawning.
 *
 * The parent spawns `flock --no-fork --exclusive --nonblock
 * --conflict-exit-code 73 /proc/self/fd/3 <node> <worker>` with direct
 * argv (no shell), passing the validated lock descriptor as child fd3 and
 * a V8 advanced-serialization IPC channel. Requests carry whole-call
 * deadlines; expiry SIGKILLs the lease-owning worker and awaits its exit
 * before reporting, so another owner is never granted while a worker may
 * be alive. Replies are strictly validated: unknown, malformed, or
 * unparseable worker records terminate the worker and fence with
 * commit_ambiguous. Child stderr is drained and discarded, never echoed.
 */

import { spawn, type ChildProcess } from "node:child_process";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { StorageError, isStorageErrorCode, workerCodeToError } from "./errors.js";

export const FLOCK_CONFLICT_EXIT: number = 73;
export const FLOCK_BINARY: string = "flock";

export type WorkerOp =
  | "provision"
  | "open"
  | "readVault"
  | "readOps"
  | "commit"
  | "bind"
  | "advance"
  | "digest"
  | "close";

export interface WorkerRequest {
  id: number;
  op: WorkerOp;
  params: Record<string, unknown>;
}

export function isWorkerOp(value: unknown): value is WorkerOp {
  return (
    value === "provision" ||
    value === "open" ||
    value === "readVault" ||
    value === "readOps" ||
    value === "commit" ||
    value === "bind" ||
    value === "advance" ||
    value === "digest" ||
    value === "close"
  );
}

export interface SpawnResult {
  child: ChildProcess;
}

function drainStderr(child: ChildProcess): void {
  const stderr: unknown = child.stderr;
  if (
    typeof stderr === "object" &&
    stderr !== null &&
    typeof (stderr as { on?: unknown }).on === "function"
  ) {
    (stderr as { on: (event: string, listener: () => void) => void }).on("data", () => {
      // Drained and discarded; never echoed or retained.
    });
  }
}

/**
 * Spawn the lease holder. The numeric stdio entry duplicates the parent's
 * open lock descriptor into the child (the holder never relies on the fd
 * number — it discovers the lease via fdinfo scan). Resolves once the
 * child is spawned; first-reply/exit races are handled by waitFirstReply.
 */
export function spawnLeaseHolder(workerJsPath: string, lockFd: number): SpawnResult {
  const child: ChildProcess = spawn(
    FLOCK_BINARY,
    [
      "--no-fork",
      "--exclusive",
      "--nonblock",
      "--conflict-exit-code",
      String(FLOCK_CONFLICT_EXIT),
      "/proc/self/fd/3",
      process.execPath,
      workerJsPath,
    ],
    {
      stdio: ["ignore", "ignore", "pipe", lockFd, "ipc"],
      serialization: "advanced",
      windowsHide: true,
    },
  );
  drainStderr(child);
  return { child };
}

export function spawnErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "";
}

export class ParentChannel {
  private readonly child: ChildProcess;
  private nextId: number;
  private dead: boolean;

  constructor(child: ChildProcess) {
    this.child = child;
    this.nextId = 1;
    this.dead = false;
    // Permanently track idle worker exit/disconnect: once observed, no
    // further call may be admitted on this channel.
    this.child.once("exit", () => {
      this.dead = true;
    });
    this.child.once("disconnect", () => {
      this.dead = true;
    });
  }

  get isDead(): boolean {
    return this.dead;
  }

  markDead(): void {
    this.dead = true;
  }

  /**
   * Terminate the lease-owning worker and prove release: SIGKILL then
   * await process close (which fires on exit and on spawn failure alike).
   * Release is never claimed by elapsed time; an unobservable worker is a
   * hang, not a success.
   */
  async terminate(): Promise<void> {
    this.dead = true;
    if (this.child.exitCode !== null || this.child.signalCode !== null) {
      return;
    }
    try {
      this.child.kill("SIGKILL");
    } catch {
      // Fall through to verified observation below.
    }
    if (this.child.exitCode !== null || this.child.signalCode !== null) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.child.once("close", () => {
        resolve();
      });
    });
  }

  send(op: WorkerOp, params: Record<string, unknown>, deadlineMs: number): Promise<unknown> {
    if (this.dead) {
      throw new StorageError("commit_ambiguous");
    }
    const waitMs: number = deadlineMs - Date.now();
    if (waitMs <= 0) {
      throw new StorageError("commit_ambiguous");
    }
    const id: number = this.nextId;
    this.nextId += 1;
    return new Promise<unknown>((resolve, reject) => {
      let settled: boolean = false;
      const cleanup: () => void = () => {
        clearTimeout(timer);
        this.child.removeListener("message", onMessage);
        this.child.removeListener("exit", onExit);
      };
      const timer: NodeJS.Timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        void this.terminate().then(() => {
          reject(new StorageError("commit_ambiguous"));
        });
      }, waitMs);
      const onMessage: (message: unknown) => void = (message: unknown) => {
        if (settled) {
          return;
        }
        if (
          typeof message !== "object" ||
          message === null ||
          (message as Record<string, unknown>)["id"] !== id
        ) {
          return;
        }
        const record: Record<string, unknown> = message as Record<string, unknown>;
        if (typeof record["ok"] !== "boolean") {
          settled = true;
          cleanup();
          void this.terminate().then(() => {
            reject(new StorageError("commit_ambiguous"));
          });
          return;
        }
        settled = true;
        cleanup();
        if (record["ok"] === true) {
          resolve(record["result"]);
          return;
        }
        // Unknown worker codes quarantine the channel: terminate the
        // worker and fence all outstanding/future calls. Known codes
        // pass through; engine-side fencing applies where specified.
        if (!isStorageErrorCode(record["code"])) {
          void this.terminate().then(() => {
            reject(new StorageError("commit_ambiguous"));
          });
          return;
        }
        reject(workerCodeToError(record["code"]));
      };
      const onExit: () => void = () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        this.dead = true;
        reject(new StorageError("commit_ambiguous"));
      };
      this.child.on("message", onMessage);
      this.child.once("exit", onExit);
      const request: WorkerRequest = { id, op, params };
      try {
        this.child.send(request);
      } catch {
        if (!settled) {
          settled = true;
          cleanup();
          void this.terminate().then(() => {
            reject(new StorageError("commit_ambiguous"));
          });
        }
      }
    });
  }
}

export type WorkerHandler = (params: Record<string, unknown>) => Promise<unknown>;

/**
 * Worker serve loop. Exits silently when-message channel is absent (direct
 * invocation without a lease fails closed before any protected IO).
 * Replies carry sanitized codes only, never native errors or payloads.
 */
export function serveWorker(handlers: Record<string, WorkerHandler | undefined>): void {
  if (typeof process.send !== "function") {
    process.exit(2);
  }
  const send: (message: unknown) => void = process.send.bind(process);
  // Calls serialize reads as well as writes: every handler chains behind
  // the previous one so no two protected operations overlap in the holder.
  // After the parent disconnects, queued not-yet-started work is never
  // admitted: the active transition settles or fences, then the holder
  // exits and the kernel releases the lease. Release happens only on exit.
  let tail: Promise<void> = Promise.resolve();
  let inFlight: number = 0;
  let disconnected: boolean = false;
  const noteSettled: () => void = () => {
    inFlight -= 1;
    if (disconnected && inFlight === 0) {
      process.exit(0);
    }
  };
  process.on("disconnect", () => {
    disconnected = true;
    if (inFlight === 0) {
      process.exit(0);
    }
  });
  process.on("message", (message: unknown) => {
    if (
      typeof message !== "object" ||
      message === null ||
      typeof (message as Record<string, unknown>)["id"] !== "number" ||
      !isWorkerOp((message as Record<string, unknown>)["op"])
    ) {
      return;
    }
    const record: Record<string, unknown> = message as Record<string, unknown>;
    const id: number = record["id"] as number;
    const op: WorkerOp = record["op"] as WorkerOp;
    const paramsRaw: unknown = record["params"];
    const params: Record<string, unknown> =
      typeof paramsRaw === "object" && paramsRaw !== null
        ? (paramsRaw as Record<string, unknown>)
        : {};
    const handler: WorkerHandler | undefined = handlers[op];
    inFlight += 1;
    tail = tail
      .then(async (): Promise<void> => {
        if (disconnected) {
          // Admission stopped: never start new protected work after the
          // parent is gone. The active transition (if any) ran ahead of
          // this point in the chain and settles or fences on its own.
          return;
        }
        const reply = (message: unknown): void => {
          try {
            send(message);
          } catch {
            // Channel gone; the parent observes exit and fences.
          }
        };
        if (handler === undefined) {
          reply({ id, ok: false, code: "invalid_argument" });
          return;
        }
        try {
          const result: unknown = await handler(params);
          reply({ id, ok: true, result });
        } catch (error) {
          if (error instanceof StorageError) {
            reply({ id, ok: false, code: error.code });
            return;
          }
          reply({ id, ok: false, code: "io_failure" });
        }
      })
      .then(noteSettled, noteSettled);
  });
}

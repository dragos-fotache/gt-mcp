/** Private runtime composition seam. Public storage factories remain fail-fast. */
import { performance } from "node:perf_hooks";
import { setTimeout, clearTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { StorageError } from "../errors.js";
import { captureShape, requiredField, optionalField } from "../validate.js";
import { launch } from "./client.js";
import { location } from "./validate.js";
import type { ProfileLocation, ProfileSession } from "./types.js";

type StopCode = "interrupted" | "timed_out";

export class ProfileAcquisitionError extends Error {
  declare readonly code: StopCode;
  constructor(code: StopCode) {
    if (code !== "interrupted" && code !== "timed_out") throw new StorageError("invalid_argument");
    super(`Profile acquisition ${code}.`);
    this.name = "ProfileAcquisitionError";
    Object.defineProperty(this, "code", { value: code, enumerable: true });
    this.stack = `ProfileAcquisitionError: ${this.message}`;
  }
}

interface AcquisitionOptions {
  readonly signal: AbortSignal;
  readonly waitMs?: number;
}

/** No worker/provider/path injection; waitMs is internal, never operator input. */
export async function acquireProfile(
  request: ProfileLocation,
  options: AcquisitionOptions,
): Promise<ProfileSession> {
  const checked = location(request);
  const fields = captureShape(options, ["signal", "waitMs"]);
  const signal = requiredField(fields, "signal") as AbortSignal;
  const aborted = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted")!.get!;
  try {
    aborted.call(signal);
  } catch {
    throw new StorageError("invalid_argument");
  }
  const selectedWait = optionalField(fields, "waitMs");
  const waitMs = selectedWait === undefined ? 60000 : selectedWait;
  if (typeof waitMs !== "number" || !Number.isSafeInteger(waitMs) || waitMs < 1 || waitMs > 600000)
    throw new StorageError("invalid_argument");

  const until = performance.now() + waitMs;
  const controller = new AbortController();
  let stopped: ProfileAcquisitionError | undefined;
  const stop = (code: StopCode): void => {
    stopped ??= new ProfileAcquisitionError(code);
    controller.abort();
  };
  const onAbort = (): void => stop("interrupted");
  const checkStopped = (): void => {
    if (aborted.call(signal)) stop("interrupted");
    if (performance.now() >= until) stop("timed_out");
    if (stopped !== undefined) throw stopped;
  };
  EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
  const timer = setTimeout(() => stop("timed_out"), waitMs);
  try {
    let backoffMs = 25;
    for (;;) {
      checkStopped();
      try {
        const session = (await launch(
          checked,
          "open",
          fileURLToPath(new URL("./worker.js", import.meta.url)),
          controller.signal,
        ))!;
        try {
          checkStopped();
        } catch (error) {
          // A reply and cancellation can arrive together. Never abandon a winner.
          await session.close();
          throw error;
        }
        return session;
      } catch (error) {
        checkStopped();
        if (!(error instanceof StorageError) || error.code !== "locked_by_other_owner") throw error;
      }
      // Every failed launch has already reaped its worker. Nothing can acquire
      // ownership independently while this cancellable backoff is pending.
      try {
        await delay(Math.min(backoffMs, Math.max(1, until - performance.now())), undefined, {
          signal: controller.signal,
        });
      } catch (error) {
        checkStopped();
        throw error;
      }
      backoffMs = Math.min(250, backoffMs * 2);
    }
  } finally {
    clearTimeout(timer);
    EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
  }
}

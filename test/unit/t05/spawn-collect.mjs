// Shared async child-process collection for T05 harnesses. Bounded output
// collection (RAW UTF-8 BYTES per stream, not string characters), kill on
// timeout, observed close (reap proof: an unreaped child fails loudly),
// sanitized spawn failures. Buffered chunks decode through a StringDecoder
// so split multibyte sequences keep their boundaries. Pure Node builtins;
// no target, suite or production imports.

import { StringDecoder } from "node:string_decoder";

/* global setTimeout, clearTimeout */

// The cap applies PER STREAM (stdout and stderr independently); the limit is
// enforced on raw bytes before decoding so multibyte output cannot overflow
// the bound while appearing short as a string.
export const MAX_CHILD_OUTPUT_BYTES = 65536;

export async function collectChild(child, { timeoutMs = 8000, reapMs = 3000 } = {}) {
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let truncated = false;
  let closed = false;
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");
  let stdout = "";
  let stderr = "";
  const accumulate = (kind, chunk) => {
    // Once over budget the child is already being killed; later chunks are
    // dropped instead of decoded so split boundaries cannot corrupt state.
    if (truncated) return;
    if (kind === "stdout") {
      if (stdoutBytes + chunk.length > MAX_CHILD_OUTPUT_BYTES) {
        truncated = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // Best effort: the timeout path below still reaps or fails loudly.
        }
        return;
      }
      stdoutBytes += chunk.length;
      stdout += stdoutDecoder.write(chunk);
    } else {
      if (stderrBytes + chunk.length > MAX_CHILD_OUTPUT_BYTES) {
        truncated = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // Best effort: the timeout path below still reaps or fails loudly.
        }
        return;
      }
      stderrBytes += chunk.length;
      stderr += stderrDecoder.write(chunk);
    }
  };
  const onStdout = (chunk) => accumulate("stdout", chunk);
  const onStderr = (chunk) => accumulate("stderr", chunk);
  child.stdout.on("data", onStdout);
  child.stderr.on("data", onStderr);
  const exit = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // Best effort: reap proof below decides the outcome.
      }
      resolve({ timedOut: true });
    }, timeoutMs);
    child.on("close", (code, signal) => {
      closed = true;
      clearTimeout(timer);
      resolve({ timedOut: false, code, signal });
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ timedOut: false, spawnFailed: true });
    });
  });
  stdout += stdoutDecoder.end();
  stderr += stderrDecoder.end();
  child.stdout.removeListener("data", onStdout);
  child.stderr.removeListener("data", onStderr);
  if ((exit.timedOut === true || truncated) && !closed) {
    const reaped = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), reapMs);
      child.on("close", () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    if (!reaped) throw new Error("synthetic-qa: child could not be reaped");
  }
  return { ...exit, stdout, stderr, truncated };
}

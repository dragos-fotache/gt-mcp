/** Own credential leases until SDK result writes settle, including cancellation. */
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RuntimeInvocation } from "../runtime/delivery.js";

interface PendingDelivery {
  readonly invocation: RuntimeInvocation;
  readonly onAbort: () => void;
  readonly requestSignal: AbortSignal;
  cancelled: boolean;
  sending: boolean;
  released?: Promise<void>;
}

const closedError = (): Error => new Error("MCP result delivery closed.");
const suppress = (invocation: RuntimeInvocation): boolean =>
  invocation.cancelled?.() === true || invocation.deliverable?.() === false;

export class RuntimeResponseTransport {
  readonly transport: Transport;
  private readonly results = new WeakMap<object, PendingDelivery>();
  private readonly pending = new Set<PendingDelivery>();
  private stopped = false;
  private physicalClose: Promise<void> | undefined;

  constructor(
    private readonly underlying: Transport,
    private readonly failed: () => void,
  ) {
    const facade: Transport = {
      start: async () => {
        underlying.onclose = () => facade.onclose?.();
        underlying.onerror = (error) => facade.onerror?.(error);
        underlying.onmessage = (message, extra) => facade.onmessage?.(message, extra);
        await underlying.start();
      },
      send: async (message, options) => {
        const value = "result" in message ? message.result : undefined;
        const slot =
          typeof value === "object" && value !== null ? this.results.get(value) : undefined;
        if (slot !== undefined && suppress(slot.invocation)) this.cancel(slot);
        if (this.stopped || slot?.cancelled) {
          if (slot !== undefined) await this.release(slot);
          throw closedError();
        }
        if (slot !== undefined) slot.sending = true;
        try {
          await underlying.send(message, options);
        } finally {
          if (slot !== undefined) {
            slot.sending = false;
            await this.release(slot);
          }
        }
      },
      close: () => {
        this.stop();
        return this.closePhysical();
      },
      setProtocolVersion: (version) => underlying.setProtocolVersion?.(version),
    };
    if (underlying.onclose !== undefined) facade.onclose = underlying.onclose;
    if (underlying.onerror !== undefined) facade.onerror = underlying.onerror;
    if (underlying.onmessage !== undefined) facade.onmessage = underlying.onmessage;
    Object.defineProperty(facade, "sessionId", { get: () => underlying.sessionId });
    this.transport = facade;
  }

  async retain(
    result: CallToolResult,
    invocation: RuntimeInvocation,
    requestSignal: AbortSignal,
  ): Promise<CallToolResult> {
    if (invocation.signal === undefined) {
      await invocation.release();
      return result;
    }
    const slot: PendingDelivery = {
      invocation,
      requestSignal,
      cancelled: false,
      sending: false,
      onAbort: () => {
        if (suppress(invocation)) this.cancel(slot);
      },
    };
    this.results.set(result, slot);
    this.pending.add(slot);
    invocation.signal.addEventListener("abort", slot.onAbort, { once: true });
    requestSignal.addEventListener("abort", slot.onAbort, { once: true });
    if (this.stopped || suppress(invocation)) {
      this.cancel(slot);
      await this.release(slot);
    }
    return result;
  }

  /** Ordinary close preserves persistence; only a pending output write needs cutting now. */
  stop(): void {
    this.stopped = true;
    for (const slot of this.pending) this.cancel(slot);
  }

  private cancel(slot: PendingDelivery): void {
    slot.cancelled = true;
    if (slot.sending) {
      // Closing settles/discards queued output before send's finally releases.
      this.stopped = true;
      void this.closePhysical();
    } else {
      void this.release(slot).catch(() => {});
    }
  }

  private release(slot: PendingDelivery): Promise<void> {
    slot.released ??= slot.invocation.release().then(
      () => this.forget(slot),
      () => {
        this.forget(slot);
        this.failed();
        throw closedError();
      },
    );
    return slot.released;
  }

  private forget(slot: PendingDelivery): void {
    slot.invocation.signal?.removeEventListener("abort", slot.onAbort);
    slot.requestSignal.removeEventListener("abort", slot.onAbort);
    this.pending.delete(slot);
    // Weak result identity keeps cancelled late sends fenced without ID tombstones.
  }

  private closePhysical(): Promise<void> {
    if (this.physicalClose !== undefined) return this.physicalClose;
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    this.physicalClose = new Promise<void>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    // Own the outcome before synchronous onclose callbacks can reenter.
    void (async () => {
      try {
        await this.underlying.close();
        resolve();
      } catch {
        this.failed();
        reject(closedError());
      }
    })();
    void this.physicalClose.catch(() => {});
    return this.physicalClose;
  }
}

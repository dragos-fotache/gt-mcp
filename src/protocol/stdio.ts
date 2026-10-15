/** Owned process transport: official SDK parsing/serialization, strict bytes and safe close. */
import { PassThrough } from "node:stream";
import type { Readable, Writable } from "node:stream";
import { TextDecoder } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export type StopReason = "eof" | "protocol" | "transport";
const MAX_INPUT_BYTES = 10485760;

function closedError(): Error {
  return new Error("MCP transport closed.");
}

export class ProcessStdioTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: NonNullable<Transport["onmessage"]>;

  private readonly ingress = new PassThrough();
  private readonly decoder = new TextDecoder("utf-8", { fatal: true });
  private readonly sdk: StdioServerTransport;
  private readonly pending = new Set<(error?: Error) => void>();
  private tailBytes = 0;
  private started = false;
  private ready = false;
  private startupBytes = 0;
  private startupChunks: Buffer[] = [];
  private stopped = false;
  private closeOutcome: Promise<void> | undefined;
  private reason: StopReason = "eof";

  constructor(
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly stoppedCallback: (reason: StopReason) => void,
    private readonly ownsOutput = false,
  ) {
    // Observe EOF/errors before startup acquisition; retain bounded original bytes until connect.
    this.input.on("end", this.onEnd);
    this.input.on("error", this.onStreamError);
    this.input.on("close", this.onInputClose);
    this.output.on("error", this.onStreamError);
    this.output.on("close", this.onOutputClose);
    this.sdk = new StdioServerTransport(this.ingress, this.output, {
      maxBufferSize: MAX_INPUT_BYTES,
    });
    this.sdk.onmessage = (message): void => {
      if (!this.stopped) this.onmessage?.(message);
    };
    // Parse failures never forward native SDK error payloads or guess a response ID.
    this.sdk.onerror = (): void => this.stop("protocol");
    this.input.on("data", this.onData);
  }

  private readonly onData = (chunk: Buffer): void => {
    if (this.stopped) return;
    try {
      // Match SDK accumulated-buffer semantics, including a coalesced incoming chunk.
      if ((this.ready ? this.tailBytes : this.startupBytes) + chunk.length > MAX_INPUT_BYTES) {
        this.stop("protocol");
        return;
      }
      this.decoder.decode(chunk, { stream: true });
      const boundary = chunk.lastIndexOf(0x0a);
      this.tailBytes = boundary < 0 ? this.tailBytes + chunk.length : chunk.length - boundary - 1;
      if (this.ready) this.ingress.write(chunk);
      else {
        this.startupBytes += chunk.length;
        this.startupChunks.push(chunk);
      }
    } catch {
      this.stop("protocol");
    }
  };

  private readonly onEnd = (): void => {
    if (this.stopped) return;
    try {
      this.decoder.decode();
      this.stop(this.tailBytes === 0 ? "eof" : "protocol");
    } catch {
      this.stop("protocol");
    }
  };

  private readonly onStreamError = (): void => {
    if (!this.stopped) this.stop("transport");
  };
  private readonly onInputClose = (): void => {
    if (!this.stopped) this.stop(this.input.readableEnded ? "eof" : "transport");
  };
  private readonly onOutputClose = (): void => {
    if (!this.stopped) this.stop("transport");
  };

  private stop(reason: StopReason): void {
    if (this.stopped) return;
    this.reason = reason;
    // Fence synchronously: SDK can still be draining messages from the same chunk.
    void this.close();
  }

  async start(): Promise<void> {
    if (this.started || this.stopped) throw closedError();
    this.started = true;
    await this.sdk.start();
    if (this.stopped) throw closedError();
    if (this.input.readableEnded) {
      this.onEnd();
      return;
    }
    if (this.input.destroyed || this.output.destroyed || this.output.writableEnded) {
      this.stop("transport");
      return;
    }
    this.ready = true;
    const chunks = this.startupChunks;
    this.startupChunks = [];
    this.startupBytes = 0;
    for (const chunk of chunks) {
      if (this.stopped) break;
      this.ingress.write(chunk);
    }
  }

  send(message: JSONRPCMessage): Promise<void> {
    if (this.stopped) return Promise.reject(closedError());
    return new Promise<void>((resolve, reject) => {
      const finish = (error?: Error): void => {
        if (!this.pending.delete(finish)) return;
        if (error === undefined) resolve();
        else reject(closedError());
      };
      this.pending.add(finish);
      try {
        // Resolve only when Node accepts the complete write, including healthy backpressure.
        this.output.write(serializeMessage(message), (error?: Error | null): void => {
          if (error != null) {
            finish(closedError());
            this.onStreamError();
          } else finish();
        });
      } catch {
        finish(closedError());
        this.onStreamError();
      }
    });
  }

  close(): Promise<void> {
    if (this.closeOutcome !== undefined) return this.closeOutcome;
    this.stopped = true;
    this.input.off("data", this.onData);
    this.input.pause();
    this.startupChunks = [];
    this.startupBytes = 0;
    const unfinished = this.pending.size > 0;
    for (const finish of this.pending) finish(closedError());
    // A stopped reader must not keep queued process-pipe writes alive after shutdown.
    if (unfinished || this.ownsOutput) this.output.destroy();
    this.closeOutcome = this.sdk.close();
    this.ingress.destroy();
    this.onclose?.();
    this.stoppedCallback(this.reason);
    return this.closeOutcome;
  }

  /** Called only after owned runtime cleanup, while faults still have an observer. */
  dispose(): void {
    this.input.off("end", this.onEnd);
    this.input.off("error", this.onStreamError);
    this.input.off("close", this.onInputClose);
    this.output.off("error", this.onStreamError);
    this.output.off("close", this.onOutputClose);
  }
}

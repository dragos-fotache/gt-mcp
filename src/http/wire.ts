/**
 * T05 production wire adapter: node:http/https with a dedicated non-pooled
 * agent per attempt, explicit TLS options, bounded head/body accounting, and
 * typed failures. Never follows redirects, never reads proxy configuration,
 * never opens a cookie jar, never throws transport conditions (unexpected
 * internal faults reject as network failures without detail inspection).
 *
 * Head accounting is cumulative over informational heads, the final head,
 * and trailers; enforcement happens at head receipt, before body
 * accumulation. Trailers count toward the budgets but never supply or
 * override classification fields. Native error codes (never messages)
 * separate parser/truncation faults (malformed) from genuine
 * network/no-response and timeout faults (network).
 */

import * as http from "node:http";
import * as https from "node:https";
import { checkByteView, measureHeadBytes, measureTrailerBytes } from "./validate.js";
import type { AttemptBudget, CapturedWireRequest, HttpWire, RawWireResponse } from "./index.js";

export interface WireEndpoint {
  readonly isHttps: boolean;
  readonly socketHost: string;
  readonly port: number;
  readonly testCaPem: Uint8Array | null;
}

/** Strict descriptor-checked validation of injected-double responses. */
export function checkRawWireResponse(value: unknown): RawWireResponse {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { ok: false, kind: "malformed", status: null };
    }
    const okDescriptor = Object.getOwnPropertyDescriptor(value, "ok");
    if (
      okDescriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(okDescriptor, "value")
    ) {
      return { ok: false, kind: "malformed", status: null };
    }
    const ok = (okDescriptor as { value: unknown }).value;
    if (ok === true) {
      const status = readDataField(value, "status");
      const rawHeaders = readDataField(value, "rawHeaders");
      const body = readDataField(value, "body");
      if (
        typeof status !== "number" ||
        !Number.isInteger(status) ||
        status < 100 ||
        status > 599 ||
        !Array.isArray(rawHeaders)
      ) {
        return { ok: false, kind: "malformed", status: null };
      }
      const checked = checkByteView(body);
      if (checked === null) {
        return { ok: false, kind: "malformed", status: null };
      }
      const pairs: Array<readonly [string, string]> = [];
      const lengthDescriptor = Object.getOwnPropertyDescriptor(rawHeaders, "length");
      if (
        lengthDescriptor === undefined ||
        !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") ||
        typeof lengthDescriptor.value !== "number"
      ) {
        return { ok: false, kind: "malformed", status: null };
      }
      const count = lengthDescriptor.value as number;
      if (!Number.isSafeInteger(count) || count < 0) {
        return { ok: false, kind: "malformed", status: null };
      }
      for (let index = 0; index < count; index += 1) {
        const entry = readIndex(rawHeaders as Array<unknown>, index);
        if (!Array.isArray(entry)) {
          return { ok: false, kind: "malformed", status: null };
        }
        const entryLength = Object.getOwnPropertyDescriptor(entry, "length");
        const first = readIndex(entry, 0);
        const second = readIndex(entry, 1);
        if (
          entryLength === undefined ||
          !Object.prototype.hasOwnProperty.call(entryLength, "value") ||
          entryLength.value !== 2 ||
          typeof first !== "string" ||
          typeof second !== "string"
        ) {
          return { ok: false, kind: "malformed", status: null };
        }
        pairs.push([first, second]);
      }
      return { ok: true, status, rawHeaders: pairs, body: checked };
    }
    if (ok === false) {
      const kind = readDataField(value, "kind");
      const status = readDataField(value, "status");
      if (
        (kind === "network" || kind === "malformed" || kind === "response_too_large") &&
        (status === null ||
          (typeof status === "number" &&
            Number.isInteger(status) &&
            status >= 100 &&
            status <= 599))
      ) {
        return { ok: false, kind, status };
      }
    }
    return { ok: false, kind: "malformed", status: null };
  } catch {
    return { ok: false, kind: "malformed", status: null };
  }
}

/** Indexed data-element read without invoking accessors; throws otherwise. */
function readIndex(list: Array<unknown>, index: number): unknown {
  return readDataField(list as unknown as object, String(index));
}

/** Own data-property read without invoking accessors; throws when absent. */
function readDataField(record: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (
    descriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
    typeof (descriptor as { get?: unknown }).get !== "undefined" ||
    typeof (descriptor as { set?: unknown }).set !== "undefined"
  ) {
    throw new Error("absent wire field");
  }
  return (descriptor as { value: unknown }).value;
}

export function createProductionWire(endpoint: WireEndpoint): HttpWire {
  const frozenEndpoint: WireEndpoint = {
    isHttps: endpoint.isHttps,
    socketHost: endpoint.socketHost,
    port: endpoint.port,
    testCaPem:
      endpoint.testCaPem === null
        ? null
        : (() => {
            const copy = new Uint8Array(endpoint.testCaPem.byteLength);
            copy.set(endpoint.testCaPem);
            return copy;
          })(),
  };
  return {
    sendRaw(
      request: CapturedWireRequest,
      budget: AttemptBudget,
      signal: AbortSignal,
    ): Promise<RawWireResponse> {
      return runAttempt(frozenEndpoint, request, budget, signal);
    },
  };
}

/** Native error code read for classification (message/packet never copied). */
function nativeCode(error: unknown): string | null {
  try {
    if (typeof error !== "object" || error === null) {
      return null;
    }
    const descriptor = Object.getOwnPropertyDescriptor(error, "code");
    if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      return null;
    }
    const code = (descriptor as { value: unknown }).value;
    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
}

function isParserFault(error: unknown): boolean {
  const code = nativeCode(error);
  return code !== null && (code.startsWith("HPE_") || code.startsWith("ERR_HTTP"));
}

function flattenRawHeaders(flat: ReadonlyArray<string>): Array<readonly [string, string]> | null {
  if (!Array.isArray(flat) || flat.length % 2 !== 0) {
    return null;
  }
  const out: Array<readonly [string, string]> = [];
  for (let index = 0; index < flat.length; index += 2) {
    const name = flat[index];
    const value = flat[index + 1];
    if (typeof name !== "string" || typeof value !== "string") {
      return null;
    }
    out.push([name, value]);
  }
  return out;
}

function runAttempt(
  endpoint: WireEndpoint,
  request: CapturedWireRequest,
  budget: AttemptBudget,
  signal: AbortSignal,
): Promise<RawWireResponse> {
  return new Promise<RawWireResponse>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let agent: http.Agent | null = null;
    let activeRequest: http.ClientRequest | null = null;
    // Cumulative head accounting across informational, final, trailer data.
    let headCount = 0;
    let headBytes = 0;
    const finish = (response: RawWireResponse): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      signal.removeEventListener("abort", onAbort);
      if (activeRequest !== null) {
        const doomed = activeRequest;
        activeRequest = null;
        try {
          doomed.destroy();
        } catch {
          // Destruction is best effort; the typed result stands.
        }
      }
      if (agent !== null) {
        const doomedAgent = agent;
        agent = null;
        try {
          doomedAgent.destroy();
        } catch {
          // Destruction is best effort; the typed result stands.
        }
      }
      resolve(response);
    };
    const onAbort = (): void => {
      finish({ ok: false, kind: "network", status: null });
    };
    const onTimeout = (): void => {
      finish({ ok: false, kind: "network", status: null });
    };
    /**
     * Enforce cumulative head budgets; false means already finished.
     * Real heads carry their status line; trailer fields count with
     * actual trailer bytes only (fields plus terminator, never another
     * status line; absent trailers add zero).
     */
    const accountHead = (
      status: number,
      pairs: ReadonlyArray<readonly [string, string]>,
      trailer: boolean,
    ): boolean => {
      headCount += pairs.length;
      headBytes += trailer ? measureTrailerBytes(pairs) : measureHeadBytes(status, pairs);
      if (headCount > budget.maxHeaderCount || headBytes > budget.maxHeadBytes) {
        finish({ ok: false, kind: "malformed", status });
        return false;
      }
      return true;
    };
    try {
      if (signal.aborted) {
        finish({ ok: false, kind: "network", status: null });
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
      timer = setTimeout(onTimeout, budget.timeoutMs);
      const headers: Record<string, string> = {};
      for (const pair of request.headers) {
        headers[pair[0]] = pair[1];
      }
      const requestModule = endpoint.isHttps ? https : http;
      const ownedAgent: http.Agent = endpoint.isHttps
        ? new https.Agent({ keepAlive: false })
        : new http.Agent({ keepAlive: false });
      agent = ownedAgent;
      const options: http.RequestOptions = {
        hostname: endpoint.socketHost,
        port: endpoint.port,
        path: request.target,
        method: request.method,
        headers,
        agent: ownedAgent,
        maxHeaderSize: budget.maxHeadBytes,
      };
      if (endpoint.isHttps) {
        const tlsOptions = options as http.RequestOptions & {
          rejectUnauthorized?: boolean;
          minVersion?: string;
          ca?: Buffer;
        };
        tlsOptions.rejectUnauthorized = true;
        tlsOptions.minVersion = "TLSv1.2";
        if (endpoint.testCaPem !== null) {
          tlsOptions.ca = Buffer.from(endpoint.testCaPem);
        }
      }
      const bodyCopy = Buffer.from(request.body);
      // Once the response callback runs, a response was observed: later
      // generic request-close/request-error events describe truncation of
      // that observed response (malformed), never a no-response network
      // failure. Timeout/caller-abort precedence is preserved because those
      // paths finish first through the owned timer/abort listener.
      let responseSeen = false;
      let seenStatus: number | null = null;
      const clientRequest = requestModule.request(options, (response) => {
        const status = response.statusCode;
        if (
          status === undefined ||
          !Number.isInteger(status) ||
          status < 100 ||
          status > 599 ||
          status === 101 ||
          status < 200
        ) {
          finish({ ok: false, kind: "malformed", status: null });
          return;
        }
        const rawPairs = flattenRawHeaders(response.rawHeaders);
        if (rawPairs === null) {
          finish({ ok: false, kind: "malformed", status });
          return;
        }
        // Enforce head budgets immediately, before body accumulation.
        // Trailers are counted toward the same cumulative budgets below
        // but never merged into classification headers.
        if (!accountHead(status, rawPairs, false)) {
          return;
        }
        responseSeen = true;
        seenStatus = status;
        const chunks: Array<Uint8Array> = [];
        let total = 0;
        let sawEnd = false;
        response.on("data", (chunk: Uint8Array) => {
          if (settled || sawEnd) {
            return;
          }
          const length = chunk instanceof Uint8Array ? chunk.byteLength : 0;
          total += length;
          if (total > budget.maxResponseBytes) {
            finish({ ok: false, kind: "response_too_large", status });
            return;
          }
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(0));
        });
        response.on("end", () => {
          if (settled || sawEnd) {
            return;
          }
          sawEnd = true;
          const trailerPairs = flattenRawHeaders(response.rawTrailers ?? []);
          if (trailerPairs === null) {
            finish({ ok: false, kind: "malformed", status });
            return;
          }
          if (!accountHead(status, trailerPairs, true)) {
            return;
          }
          finish({
            ok: true,
            status,
            rawHeaders: rawPairs,
            body: concat(chunks, total),
          });
        });
        response.on("error", () => {
          // Mid-response faults mean truncation, never clean network loss.
          finish({ ok: false, kind: "malformed", status });
        });
        response.on("close", () => {
          if (!settled && !sawEnd) {
            finish({ ok: false, kind: "malformed", status });
          }
        });
      });
      activeRequest = clientRequest;
      try {
        // Disable silent header-count truncation on the live request;
        // explicit cumulative counting above remains the enforcement point.
        const live = clientRequest as unknown as { maxHeadersCount?: unknown };
        live.maxHeadersCount = 0;
      } catch {
        // Property assignment is best effort; counting still enforced.
      }
      clientRequest.on("information", (info) => {
        // Interim 1xx heads share the cumulative budget; a repeated-head
        // flood cannot reset or evade it.
        try {
          const pairs = flattenRawHeaders(info.rawHeaders ?? []);
          if (pairs === null || typeof info.statusCode !== "number") {
            finish({ ok: false, kind: "malformed", status: null });
            return;
          }
          accountHead(info.statusCode, pairs, false);
        } catch {
          finish({ ok: false, kind: "malformed", status: null });
        }
      });
      clientRequest.on("upgrade", (_response, socket) => {
        // Protocol upgrades are rejected; the detached upgraded socket is
        // explicitly destroyed with its errors handled.
        try {
          const owned = socket as unknown as {
            on(event: string, listener: () => void): void;
            destroy(): void;
          };
          owned.on("error", () => undefined);
          owned.destroy();
        } catch {
          // Destruction is best effort; the typed result stands.
        }
        finish({ ok: false, kind: "malformed", status: 101 });
      });
      clientRequest.on("error", (error: unknown) => {
        if (responseSeen) {
          // Error after response receipt truncates an observed response.
          finish({ ok: false, kind: "malformed", status: seenStatus });
          return;
        }
        if (isParserFault(error)) {
          finish({ ok: false, kind: "malformed", status: null });
          return;
        }
        finish({ ok: false, kind: "network", status: null });
      });
      clientRequest.on("close", () => {
        if (!settled) {
          if (responseSeen) {
            // Observed response cut short before its end/error callbacks.
            finish({ ok: false, kind: "malformed", status: seenStatus });
            return;
          }
          finish({ ok: false, kind: "network", status: null });
        }
      });
      if (bodyCopy.byteLength > 0) {
        clientRequest.write(bodyCopy);
      }
      clientRequest.end();
    } catch {
      finish({ ok: false, kind: "network", status: null });
    }
  });
}

function concat(chunks: ReadonlyArray<Uint8Array>, total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

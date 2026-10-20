/** Temporary, trusted loopback-only foreground GIS callback boundary. */
import { randomBytes, timingSafeEqual } from "node:crypto";
import http from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import type { Duplex } from "node:stream";
import { assertSignal, expiryToMs } from "../auth/validate.js";
import { parseStrictMetadataJson } from "../runtime/files.js";
import type { StorageBinding } from "../storage/index.js";
import { LoginError, isLoginError } from "./errors.js";
import { renderLoginPage, renderAccountStatusPage } from "./page.js";
import { exactRecord, isOpaqueGoogleToken, validateSettings } from "./records.js";
import type { LoginSettings } from "./records.js";
import type { LoginChallenge, LoginTransaction } from "./transaction.js";
import type {
  AccountStatusOutcome,
  AccountStatusTransaction,
} from "../lifecycle/account-status.js";

export interface BrowserLoginOptions {
  readonly transaction: LoginTransaction;
  readonly settings: LoginSettings;
  readonly maxRequestBytes: number;
  readonly signal: AbortSignal;
}

export interface BrowserLoginHelper {
  readonly url: string;
  readonly completion: Promise<StorageBinding>;
  cancel(): Promise<void>;
  close(): Promise<void>;
}

export interface AccountStatusBrowserOptions {
  readonly transaction: AccountStatusTransaction;
  readonly settings: LoginSettings;
  readonly maxRequestBytes: number;
  readonly signal: AbortSignal;
}
export interface AccountStatusBrowserHelper {
  readonly url: string;
  readonly completion: Promise<AccountStatusOutcome>;
  cancel(): Promise<void>;
  close(): Promise<void>;
}

const READ_MS = 5000;
const HEADER_BYTES = 8192;
const HEADER_COUNT = 32;
const CONNECTIONS = 16;

function safe(error: unknown): LoginError {
  return isLoginError(error) ? error : new LoginError("internal_error");
}

function policy(nonce: string): string {
  return `default-src 'none'; script-src 'nonce-${nonce}' https://accounts.google.com/gsi/client; style-src 'nonce-${nonce}' https://accounts.google.com/gsi/style; connect-src 'self' https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; img-src https://accounts.google.com/gsi/; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
}

function securityHeaders(response: ServerResponse, nonce: string): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  response.setHeader("Content-Security-Policy", policy(nonce));
  response.setHeader("Connection", "close");
}

/** Validation precedes IO. Once validated, this helper owns transaction cleanup. */
export async function startBrowserLoginHelper(
  options: BrowserLoginOptions,
): Promise<BrowserLoginHelper> {
  return startHelper<StorageBinding>(options, false);
}

export async function startAccountStatusBrowserHelper(
  options: AccountStatusBrowserOptions,
): Promise<AccountStatusBrowserHelper> {
  return startHelper<AccountStatusOutcome>(options, true);
}

/** One shared secured callback boundary, with two purpose-specific typed facades. */
async function startHelper<Result extends object>(
  options: unknown,
  accountStatus: boolean,
): Promise<{
  readonly url: string;
  readonly completion: Promise<Result>;
  cancel(): Promise<void>;
  close(): Promise<void>;
}> {
  let fields: Record<string, unknown>;
  let signal: AbortSignal;
  let settings: LoginSettings;
  try {
    fields = exactRecord(options, ["transaction", "settings", "maxRequestBytes", "signal"]);
    signal = assertSignal(fields["signal"]);
    settings = validateSettings(fields["settings"]);
  } catch (error) {
    if (isLoginError(error)) throw error;
    throw new LoginError("invalid_arguments");
  }
  const maxRequestBytes = fields["maxRequestBytes"];
  if (
    typeof maxRequestBytes !== "number" ||
    !Number.isInteger(maxRequestBytes) ||
    maxRequestBytes < 64 ||
    maxRequestBytes > 16777216
  )
    throw new LoginError("invalid_arguments");
  const transaction = fields["transaction"] as {
    start(signal: AbortSignal): Promise<LoginChallenge>;
    submit(attemptId: string, idToken: string, signal: AbortSignal): Promise<Result>;
    cancel(): Promise<void>;
    close(): Promise<void>;
  };
  if (
    typeof transaction !== "object" ||
    transaction === null ||
    ["start", "submit", "cancel", "close"].some(
      (key) => typeof (transaction as unknown as Record<string, unknown>)[key] !== "function",
    )
  )
    throw new LoginError("invalid_arguments");
  // Explicit trusted capability methods, with original receivers retained.
  const start = transaction.start.bind(transaction);
  const submit = transaction.submit.bind(transaction);
  const cancelTransaction = transaction.cancel.bind(transaction);
  const closeTransaction = transaction.close.bind(transaction);
  const port = Number(new URL(settings.browserOrigin).port);
  const host = `localhost:${port}`;
  const bodyLimit = Math.min(65536, maxRequestBytes);
  const csrf = randomBytes(32).toString("base64url");
  const scriptNonce = randomBytes(32).toString("base64url");
  const controller = new AbortController();
  const servers: Server[] = [];
  const sockets = new Set<Socket>();
  const headerTimers = new Map<Socket, ReturnType<typeof setTimeout>>();
  const readDeadlines = new Map<Socket, number>();
  let state: "reserving" | "starting" | "ready" | "submitting" | "stopping" | "settled" =
    "reserving";
  let challenge: LoginChallenge | null = null;
  let deadline = 0;
  let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  let active: Promise<unknown> | null = null;
  let cleanup: Promise<void> | null = null;
  let abortRequested = signal.aborted;
  let resolveCompletion!: (binding: Result) => void;
  let rejectCompletion!: (error: LoginError) => void;
  const completion = new Promise<Result>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });
  void completion.catch(() => undefined);

  const reply = (res: ServerResponse, status: number, text: string): void => {
    if (res.destroyed || res.writableEnded) return;
    securityHeaders(res, scriptNonce);
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(text);
  };
  const rawReply = (socket: Duplex, status: string): void => {
    if (!socket.writable || socket.destroyed || socket.writableEnded) {
      socket.destroy();
      return;
    }
    const text = "Invalid request.\n";
    socket.end(
      `HTTP/1.1 ${status}\r\nConnection: close\r\nCache-Control: no-store\r\nPragma: no-cache\r\nX-Content-Type-Options: nosniff\r\nX-Frame-Options: DENY\r\nCross-Origin-Opener-Policy: same-origin-allow-popups\r\nReferrer-Policy: no-referrer-when-downgrade\r\nContent-Security-Policy: ${policy(scriptNonce)}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}`,
    );
  };
  const closeListeners = (): Promise<void>[] =>
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          if (!server.listening) {
            resolve();
            return;
          }
          server.close(() => resolve());
        }),
    );
  const finish = (
    outcome: Result | LoginError,
    cancelAuth: boolean,
    terminal?: { res: ServerResponse; status: number; text: string },
  ): Promise<void> => {
    if (cleanup !== null) return cleanup;
    state = "stopping";
    if (cancelAuth) controller.abort();
    if (deadlineTimer !== null) clearTimeout(deadlineTimer);
    signal.removeEventListener("abort", onAbort);
    const listenersClosed = closeListeners();
    for (const timer of headerTimers.values()) clearTimeout(timer);
    headerTimers.clear();
    const terminalSocket = terminal?.res.socket;
    for (const socket of sockets) if (socket !== terminalSocket) socket.destroy();
    cleanup = (async () => {
      let result = outcome;
      const flush =
        terminal === undefined
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, 100);
              const done = (): void => {
                clearTimeout(timer);
                resolve();
              };
              terminal.res.once("finish", done);
              terminal.res.once("close", done);
              reply(terminal.res, terminal.status, terminal.text);
            });
      try {
        if (cancelAuth) await cancelTransaction();
      } catch (error) {
        result = safe(error);
      }
      // Close S1 before waiting on unexpected failure: close fences its own
      // work while preserving uncertain exchange, whereas cancel discards it.
      const closeWork = cancelAuth
        ? null
        : Promise.resolve()
            .then(closeTransaction)
            .catch((error) => {
              result = safe(error);
            });
      try {
        await active;
      } catch {
        /* The original request/completion owns its safe outcome. */
      }
      await flush;
      for (const socket of sockets) socket.destroy();
      await Promise.all(listenersClosed);
      try {
        if (closeWork !== null) await closeWork;
        else await closeTransaction();
      } catch (error) {
        result = safe(error);
      }
      challenge = null;
      state = "settled";
      if (isLoginError(result)) rejectCompletion(result);
      else resolveCompletion(Object.freeze({ ...result }));
    })();
    return cleanup;
  };
  function onAbort(): void {
    abortRequested = true;
    controller.abort();
    if (state !== "reserving") void finish(new LoginError("operation_interrupted"), true);
  }
  signal.addEventListener("abort", onAbort, { once: true });

  const isLive = (): boolean =>
    (state === "ready" || state === "submitting") && Date.now() < deadline;
  const armDeadline = (): void => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      void finish(new LoginError("attempt_expired"), true);
      return;
    }
    // A malformed far-future trusted response must not overflow the timer.
    deadlineTimer = setTimeout(armDeadline, Math.min(remaining, 2147483647));
  };

  const readBody = async (
    req: IncomingMessage,
    res: ServerResponse,
    readDeadline: number,
  ): Promise<Uint8Array | null> => {
    const length = req.headers["content-length"];
    if (typeof length !== "string" || !/^(0|[1-9][0-9]*)$/.test(length)) {
      reply(res, 400, "Invalid request.\n");
      return null;
    }
    if (BigInt(length) > BigInt(bodyLimit)) {
      reply(res, 413, "Request too large.\n");
      return null;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    let timedOut = false;
    const timer = setTimeout(
      () => {
        timedOut = true;
        reply(res, 408, "Request timed out.\n");
        req.destroy();
      },
      Math.max(1, readDeadline - Date.now()),
    );
    try {
      for await (const chunk of req) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
        total += bytes.length;
        if (total > bodyLimit) {
          reply(res, 413, "Request too large.\n");
          req.destroy();
          return null;
        }
        chunks.push(bytes);
      }
      if (timedOut || total !== Number(length)) return null;
      return Buffer.concat(chunks, total);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const readDeadline = readDeadlines.get(req.socket) ?? Date.now();
    const timer = headerTimers.get(req.socket);
    if (timer !== undefined) {
      clearTimeout(timer);
      headerTimers.delete(req.socket);
    }
    if (Date.now() >= readDeadline) {
      reply(res, 408, "Request timed out.\n");
      return;
    }
    const seen = new Set<string>();
    if (req.rawHeaders.length / 2 > HEADER_COUNT) {
      reply(res, 431, "Too many headers.\n");
      return;
    }
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = (req.rawHeaders[i] ?? "").toLowerCase();
      if (seen.has(name)) {
        reply(res, 400, "Invalid request.\n");
        return;
      }
      seen.add(name);
    }
    if (
      req.headers.host !== host ||
      (req.headers.origin !== undefined && req.headers.origin !== settings.browserOrigin)
    ) {
      reply(res, 403, "Request refused.\n");
      return;
    }
    if (!isLive()) {
      reply(
        res,
        503,
        accountStatus ? "Account-status verification is unavailable.\n" : "Login is unavailable.\n",
      );
      return;
    }
    if (req.url !== "/" && req.url !== "/credential" && req.url !== "/cancel") {
      reply(res, 404, "Not found.\n");
      return;
    }
    if (req.url === "/") {
      if (req.method !== "GET") {
        reply(res, 405, "Method refused.\n");
        return;
      }
      if (
        req.headers["transfer-encoding"] !== undefined ||
        (req.headers["content-length"] !== undefined && req.headers["content-length"] !== "0")
      ) {
        reply(res, 400, "Invalid request.\n");
        return;
      }
      if (state !== "ready" || challenge === null) {
        reply(
          res,
          409,
          accountStatus ? "Proof already submitted.\n" : "Login already submitted.\n",
        );
        return;
      }
      securityHeaders(res, scriptNonce);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        (accountStatus ? renderAccountStatusPage : renderLoginPage)({
          settings,
          challenge,
          csrf,
          scriptNonce,
        }),
      );
      return;
    }
    if (req.method !== "POST") {
      reply(res, 405, "Method refused.\n");
      return;
    }
    if (req.headers.origin !== settings.browserOrigin) {
      reply(res, 403, "Request refused.\n");
      return;
    }
    if (req.headers["content-type"] !== "application/json") {
      reply(res, 415, "JSON required.\n");
      return;
    }
    if (req.headers["transfer-encoding"] !== undefined) {
      reply(res, 400, "Invalid request.\n");
      return;
    }
    const bytes = await readBody(req, res, readDeadline);
    if (bytes === null) return;
    let body: Record<string, unknown>;
    try {
      body = exactRecord(
        parseStrictMetadataJson(bytes),
        req.url === "/cancel" ? ["csrf"] : ["csrf", "idToken"],
      );
    } catch {
      reply(res, 400, "Invalid request.\n");
      return;
    }
    bytes.fill(0);
    const supplied = body["csrf"];
    if (
      typeof supplied !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(supplied) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(csrf))
    ) {
      reply(res, 403, "Request refused.\n");
      return;
    }
    if (!isLive()) {
      reply(
        res,
        409,
        accountStatus ? "Proof is no longer active.\n" : "Login is no longer active.\n",
      );
      return;
    }
    if (req.url === "/cancel") {
      await finish(new LoginError("operation_interrupted"), true, {
        res,
        status: 200,
        text: accountStatus ? "Account-status verification cancelled.\n" : "Login cancelled.\n",
      });
      return;
    }
    if (state !== "ready" || challenge === null) {
      reply(res, 409, accountStatus ? "Proof already submitted.\n" : "Login already submitted.\n");
      return;
    }
    if (!isOpaqueGoogleToken(body["idToken"])) {
      reply(res, 400, "Invalid request.\n");
      return;
    }
    // Admit synchronously, before any persistence/network await. Never decode claims.
    state = "submitting";
    const attemptId = challenge.attemptId;
    try {
      active = submit(attemptId, body["idToken"], controller.signal);
    } catch (error) {
      active = Promise.reject(error);
    }
    body["idToken"] = null;
    try {
      const binding = (await active) as Result;
      if (state === "submitting")
        await finish(binding, false, {
          res,
          status: 200,
          text: accountStatus
            ? "Account-status verification complete. Return to the trusted local application.\n"
            : "Login complete.\n",
        });
    } catch (error) {
      if (state === "submitting")
        await finish(safe(error), false, {
          res,
          status: 400,
          text: accountStatus
            ? "Account-status verification failed. Start a fresh trusted attempt.\n"
            : "Login failed. Use the trusted local command.\n",
        });
    }
  };

  try {
    if (abortRequested) throw new LoginError("operation_interrupted");
    for (const hostname of ["127.0.0.1", "::1"]) {
      const server = http.createServer(
        {
          maxHeaderSize: HEADER_BYTES,
          requireHostHeader: false,
          headersTimeout: READ_MS,
          requestTimeout: READ_MS,
          connectionsCheckingInterval: 100,
        },
        (req, res) => {
          void handle(req, res).catch(() => {
            reply(res, 400, "Invalid request.\n");
          });
        },
      );
      server.maxHeadersCount = HEADER_COUNT + 1;
      server.maxRequestsPerSocket = 4;
      server.keepAliveTimeout = 1000;
      server.setTimeout(READ_MS, (socket) => socket.destroy());
      server.on("connection", (socket) => {
        if (sockets.size >= CONNECTIONS || state === "stopping" || state === "settled") {
          socket.destroy();
          return;
        }
        sockets.add(socket);
        readDeadlines.set(socket, Date.now() + READ_MS);
        const headerTimer = setTimeout(() => socket.destroy(), READ_MS);
        headerTimers.set(socket, headerTimer);
        socket.once("close", () => {
          sockets.delete(socket);
          const timer = headerTimers.get(socket);
          if (timer !== undefined) clearTimeout(timer);
          headerTimers.delete(socket);
          readDeadlines.delete(socket);
        });
      });
      server.on("clientError", (error, socket) => {
        const overflow = (error as Error & { code?: string }).code === "HPE_HEADER_OVERFLOW";
        const status = overflow ? "431 Request Header Fields Too Large" : "400 Bad Request";
        rawReply(socket, status);
      });
      server.on("dropRequest", (_req, socket) => rawReply(socket, "503 Service Unavailable"));
      server.on("checkContinue", (_req, res) => reply(res, 400, "Invalid request.\n"));
      server.on("checkExpectation", (_req, res) => reply(res, 400, "Invalid request.\n"));
      server.on("upgrade", (_req, socket) => socket.destroy());
      server.on("connect", (_req, socket) => socket.destroy());
      server.on("error", () => {
        if (state !== "reserving") void finish(new LoginError("configuration_required"), false);
      });
      servers.push(server);
      await new Promise<void>((resolve, reject) => {
        const failed = (): void => {
          server.removeListener("listening", listening);
          reject(new LoginError("configuration_required"));
        };
        const listening = (): void => {
          server.removeListener("error", failed);
          resolve();
        };
        server.once("error", failed);
        server.once("listening", listening);
        server.listen({ host: hostname, port, ipv6Only: hostname === "::1", exclusive: true });
      });
      if (abortRequested) throw new LoginError("operation_interrupted");
    }
    state = "starting";
    active = Promise.resolve().then(() => start(controller.signal));
    challenge = (await active) as LoginChallenge;
    if (abortRequested || cleanup !== null) throw new LoginError("operation_interrupted");
    // Trusted transaction still validates its own source; reject an invalid deadline.
    const expiry = expiryToMs(challenge.expiresAt);
    if (expiry === null || expiry <= Date.now()) throw new LoginError("attempt_expired");
    deadline = expiry;
    state = "ready";
    active = null;
    armDeadline();
    const cancel = (): Promise<void> => finish(new LoginError("operation_interrupted"), true);
    return Object.freeze({ url: `${settings.browserOrigin}/`, completion, cancel, close: cancel });
  } catch (error) {
    const failure = safe(error);
    await finish(failure, abortRequested || failure.code === "attempt_expired");
    try {
      await completion;
    } catch (settled) {
      throw safe(settled);
    }
    throw failure;
  }
}

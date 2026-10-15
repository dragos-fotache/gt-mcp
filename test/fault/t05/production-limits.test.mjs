// T05 fault: production header/stream/framing limits and exact budget
// boundaries over real sockets. Streaming caps, header count/size,
// duplicate-length, truncation, invalid UTF-8, encodings, informational
// heads, trailers, upgrades, 204 framing, projected/response equality/+1.

/* global AbortController, TextEncoder, clearInterval, setInterval */

import { describe, it, expect } from "vitest";
import zlib from "node:zlib";
import { createBackendTransport, isTransportError } from "../../../dist/http/index.js";
import {
  startLoopbackHttp,
  startRawServer,
  closeServer,
  jsonResponse,
  waitForDeadline,
} from "./helpers.mjs";
import { ROUTINE_R, BEARER, testBinding, catchTransportError } from "../../unit/t05/helpers.mjs";

function limitTransport(origin, budgets = undefined) {
  return createBackendTransport(
    budgets === undefined
      ? { origin, allowInsecureLoopback: true }
      : { origin, allowInsecureLoopback: true, budgets },
    {
      session: {
        checkBinding: async () => {},
        selectCredential: async (binding) => ({ bearerToken: BEARER, forBinding: binding }),
        beforeDispatch: async () => {},
        isCurrent: () => true,
      },
    },
  );
}

function pendingCall(promise) {
  promise.catch(() => {});
  return promise;
}

const ROUTINE_JSON = `{"id":"${ROUTINE_R}","name":"","isDraft":false,"revision":1,"exercises":[]}`;

describe("streaming and header limits on live sockets", () => {
  it("aborts accumulating bodies beyond maxResponseBytes mid-stream", async () => {
    const big = `{"id":"${ROUTINE_R}","name":"${"n".repeat(65536)}","isDraft":false,"revision":1,"exercises":[]}`;
    const written = { bytes: 0, chunks: 0 };
    const { server, origin } = await startLoopbackHttp((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      const bytes = Buffer.from(big, "utf8");
      let offset = 0;
      const timer = setInterval(() => {
        if (offset >= bytes.length) {
          clearInterval(timer);
          try {
            res.end();
          } catch {
            // Final end races transport-side destruction after the cap trips;
            // the socket is already gone, so there is nothing left to flush.
          }
          return;
        }
        try {
          res.write(bytes.subarray(offset, offset + 4096));
          written.bytes += Math.min(4096, bytes.length - offset);
          written.chunks += 1;
        } catch {
          // Transport destroyed the socket mid-stream: the cap path worked;
          // stop the interval instead of writing to a dead response.
          clearInterval(timer);
        }
        offset += 4096;
      }, 5);
      res.on("close", () => clearInterval(timer));
    });
    try {
      const handle = limitTransport(origin, { maxResponseBytes: 1024 });
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("result_too_large");
      expect(error.retryable).toBe(false);
      expect("data" in error).toBe(false);
      // Stimulus is proven: chunks were emitted before the transport closed.
      expect(written.chunks).toBeGreaterThan(0);
      expect(written.bytes).toBeGreaterThan(1024);
      // The same handle against its fixed origin stays usable: cleanup holds.
      const followError = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(followError.code).toBe("result_too_large");
    } finally {
      await closeServer(server);
    }
  });

  it("rejects header-count overflow and stays usable afterwards", async () => {
    // Otherwise-valid body: an implementation that ignored the header cap
    // would decode successfully, so only an exact budget error can pass.
    const { server, origin } = await startLoopbackHttp((req, res) => {
      const headers = { "content-type": "application/json" };
      for (let index = 0; index < 150; index += 1) headers[`x-synthetic-qa-${index}`] = "v";
      res.writeHead(200, headers);
      res.end(ROUTINE_JSON);
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      // Head/parser limits are generic internal_error per the approved
      // table: result_too_large is body/projected overflow only.
      expect(error.code).toBe("internal_error");
      expect(isTransportError(error)).toBe(true);
      const healthy = await startLoopbackHttp((req, res) => {
        jsonResponse(res, 200, {
          id: ROUTINE_R,
          name: "",
          isDraft: false,
          revision: 1,
          exercises: [],
        });
      });
      try {
        const retry = limitTransport(healthy.origin);
        const result = await pendingCall(
          retry.getRoutine(
            { ...testBinding(), origin: healthy.origin },
            ROUTINE_R,
            new AbortController().signal,
          ),
        );
        expect(result.status).toBe(200);
      } finally {
        await closeServer(healthy.server);
      }
    } finally {
      await closeServer(server);
    }
  });

  it("rejects single headers beyond maxHeadBytes", async () => {
    const { server, origin } = await startLoopbackHttp((req, res) => {
      res.writeHead(200, {
        "content-type": "application/json",
        "x-synthetic-qa-pad": "p".repeat(40000),
      });
      res.end(ROUTINE_JSON);
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      // A single header beyond maxHeadBytes breaches a head/parser limit:
      // generic internal_error, never a body-size code.
      expect(error.code).toBe("internal_error");
    } finally {
      await closeServer(server);
    }
  });

  it("duplicate Content-Length is malformed internal_error", async () => {
    const body = Buffer.from("{}", "utf8");
    const { server, origin } = await startRawServer((socket) => {
      socket.write(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 2\r\nContent-Length: 2\r\nConnection: close\r\n\r\n",
      );
      socket.write(body);
      socket.end();
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("internal_error");
    } finally {
      await closeServer(server);
    }
  });

  it("duplicate Content-Type values are malformed internal_error", async () => {
    const body = Buffer.from(ROUTINE_JSON, "utf8");
    const { server, origin } = await startRawServer((socket) => {
      socket.write(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Type: text/plain\r\n" +
          `Content-Length: ${body.length}\r\nConnection: close\r\n\r\n`,
      );
      socket.write(body);
      socket.end();
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("internal_error");
    } finally {
      await closeServer(server);
    }
  });

  it("truncated bodies never become success and never auto-retry", async () => {
    // Fixture builds actual bytes from string data, then transmits fewer
    // than declared with a graceful FIN (not a destroy): the client observes
    // a genuine declared-vs-received mismatch. No write-callback claim about
    // remote receipt is made; the transport verdict is the oracle.
    const full = Buffer.from(ROUTINE_JSON, "utf8");
    const partial = full.subarray(0, 10);
    let connections = 0;
    const { server, origin, received } = await startRawServer((socket) => {
      connections += 1;
      socket.write(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\n\r\n",
      );
      socket.write(partial);
      socket.end();
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("internal_error");
      expect(error.outcomeUnknown).toBe(false);
      expect(connections).toBe(1);
      expect(received.length).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("invalid UTF-8 bodies are malformed internal_error", async () => {
    const { server, origin } = await startLoopbackHttp((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(Buffer.from([0xff, 0xfe, 0x7b]));
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("internal_error");
    } finally {
      await closeServer(server);
    }
  });

  it("non-identity content encoding is rejected without decompression", async () => {
    const { server, origin } = await startLoopbackHttp((req, res) => {
      const gzipped = zlib.gzipSync(Buffer.from(ROUTINE_JSON, "utf8"));
      res.writeHead(200, { "content-type": "application/json", "content-encoding": "gzip" });
      res.end(gzipped);
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("internal_error");
    } finally {
      await closeServer(server);
    }
  });

  it("malformed error bodies at their expected status stay internal_error", async () => {
    const { server, origin } = await startLoopbackHttp((req, res) => {
      res.writeHead(404, { "content-type": "application/json" });
      res.end('{"errorCode":');
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("internal_error");
      expect(error.outcomeUnknown).toBe(false);
    } finally {
      await closeServer(server);
    }
  });
});

describe("informational heads, trailers, upgrades and 204 framing", () => {
  it("skips informational heads and succeeds on the final response", async () => {
    const body = Buffer.from(ROUTINE_JSON, "utf8");
    const { server, origin } = await startRawServer((socket) => {
      for (let index = 0; index < 3; index += 1) {
        socket.write("HTTP/1.1 103 Early Hints\r\nLink: </synthetic-qa>\r\n\r\n");
      }
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`,
      );
      socket.write(body);
      socket.end();
    });
    try {
      const handle = limitTransport(origin);
      const result = await pendingCall(
        handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
      );
      expect(result.status).toBe(200);
      expect(result.data.id).toBe(ROUTINE_R);
    } finally {
      await closeServer(server);
    }
  });

  it("exhausting head budget with informational heads fails closed", async () => {
    const { server, origin } = await startRawServer((socket) => {
      for (let index = 0; index < 150; index += 1) {
        socket.write("HTTP/1.1 103 Early Hints\r\nLink: </synthetic-qa>\r\n\r\n");
      }
      socket.end();
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      // Informational heads consume the same bounded head budget; they can
      // neither reset the deadline nor extend allowed head data. Head-limit
      // breaches are generic internal_error, not body-size failures.
      expect(error.code).toBe("internal_error");
    } finally {
      await closeServer(server);
    }
  });

  it("forbidden Content-Length trailer fails closed without retry", async () => {
    // Adjudicated: native Node rejects a Content-Length trailer with
    // HPE_INVALID_CONTENT_LENGTH, so the transport mapping to internal_error
    // is correct fail-closed behavior. "Trailers never override" does not
    // require accepting forbidden framing.
    const body = Buffer.from(ROUTINE_JSON, "utf8");
    const hex = body.length.toString(16);
    let connections = 0;
    const { server, origin } = await startRawServer((socket) => {
      connections += 1;
      socket.write(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n" +
          "Transfer-Encoding: chunked\r\nTrailer: content-length\r\nConnection: close\r\n\r\n" +
          `${hex}\r\n`,
      );
      socket.write(body);
      // A trailer pretending to rewrite the length is forbidden framing.
      socket.write("\r\n0\r\ncontent-length: 9999\r\n\r\n");
      socket.end();
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("internal_error");
      expect(error.outcomeUnknown).toBe(false);
      expect(connections).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("native-valid Retry-After trailer cannot set retry metadata", async () => {
    // Adjudicated: native Node accepts Retry-After in trailers, but the
    // transport must not let trailers supply or replace header-derived
    // classification/retry metadata. maxAttempts 1 keeps this free of any
    // wait/retry framework.
    const body = Buffer.from(JSON.stringify({ errorCode: "rate_limited" }), "utf8");
    const hex = body.length.toString(16);
    const { server, origin } = await startRawServer((socket) => {
      socket.write(
        "HTTP/1.1 429 Too Many Requests\r\nContent-Type: application/json\r\n" +
          "Transfer-Encoding: chunked\r\nTrailer: retry-after\r\nConnection: close\r\n\r\n" +
          `${hex}\r\n`,
      );
      socket.write(body);
      socket.write("\r\n0\r\nretry-after: 30\r\n\r\n");
      socket.end();
    });
    try {
      const handle = limitTransport(origin, { maxAttempts: 1 });
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("rate_limited");
      expect(error.retryable).toBe(true);
      expect(error.retryAfterSeconds).toBe(null);
      expect(error.attempts).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("trailer count exhausts the same header budget", async () => {
    const body = Buffer.from(ROUTINE_JSON, "utf8");
    const hex = body.length.toString(16);
    let trailerBlock = "";
    for (let index = 0; index < 150; index += 1) {
      trailerBlock += `x-synthetic-qa-trailer-${index}: v\r\n`;
    }
    const { server, origin } = await startRawServer((socket) => {
      socket.write(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n" +
          "Transfer-Encoding: chunked\r\nConnection: close\r\n\r\n" +
          `${hex}\r\n`,
      );
      socket.write(body);
      socket.write(`\r\n0\r\n${trailerBlock}\r\n`);
      socket.end();
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      // Trailer fields share the head budget; count exhaustion breaches a
      // head limit: generic internal_error, never a body-size code.
      expect(error.code).toBe("internal_error");
    } finally {
      await closeServer(server);
    }
  });

  it("ignores benign trailers for classification (http server shape)", async () => {
    const { server, origin } = await startLoopbackHttp((req, res) => {
      res.writeHead(200, { "content-type": "application/json", trailer: "x-synthetic-qa" });
      res.write(ROUTINE_JSON);
      res.addTrailers({ "x-synthetic-qa": "1" });
      res.end();
    });
    try {
      const handle = limitTransport(origin);
      const result = await pendingCall(
        handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
      );
      expect(result.status).toBe(200);
      expect(result.data.revision).toBe("1");
    } finally {
      await closeServer(server);
    }
  });

  it("rejects protocol upgrades safely and the client socket closes", async () => {
    // Adjudicated: an unread paused server stream withholds close
    // notification, which proves nothing about the client. The fixture
    // therefore drains the incoming request bytes (small request barrier)
    // before answering, so the observed peer close is the client's doing.
    const { server, origin, received } = await startRawServer((socket) => {
      let head = Buffer.alloc(0);
      const onRequest = (chunk) => {
        head = Buffer.concat([head, chunk]);
        if (head.indexOf("\r\n\r\n") === -1) return;
        socket.removeListener("data", onRequest);
        socket.write(
          "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n",
        );
      };
      socket.on("data", onRequest);
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("internal_error");
      expect(error.outcomeUnknown).toBe(false);
      // The client cleans up its own socket within a bound; leftovers are
      // reaped in finally rather than hidden by a server-side timer.
      await waitForDeadline(() => received.every((record) => record.destroyed));
    } finally {
      await closeServer(server);
    }
  });

  it("rejects 204 responses whose framing purports a logout body", async () => {
    const { server, origin } = await startRawServer((socket) => {
      socket.write("HTTP/1.1 204 No Content\r\nContent-Length: 5\r\nConnection: close\r\n\r\n");
      socket.end();
    });
    try {
      const handle = limitTransport(origin);
      const error = await catchTransportError(
        pendingCall(
          handle.authLogout(
            { ...testBinding(), origin },
            new TextEncoder().encode('{"refreshToken":"synthetic-qa-refresh"}'),
            new AbortController().signal,
          ),
        ),
      );
      expect(error.code).toBe("internal_error");
    } finally {
      await closeServer(server);
    }
  });
});

describe("exact response and projected budget boundaries on the wire", () => {
  it("accepts exact wire size and rejects one byte over", async () => {
    const body = Buffer.from(ROUTINE_JSON, "utf8");
    const { server, origin } = await startLoopbackHttp((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(body);
    });
    try {
      const exact = limitTransport(origin, { maxResponseBytes: body.length });
      const ok = await pendingCall(
        exact.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
      );
      expect(ok.status).toBe(200);
      const tight = limitTransport(origin, { maxResponseBytes: body.length - 1 });
      const error = await catchTransportError(
        pendingCall(
          tight.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
        ),
      );
      expect(error.code).toBe("result_too_large");
    } finally {
      await closeServer(server);
    }
  });

  it("budgets Int64 projection growth: raw fits while projected overflows", async () => {
    // Wire revision `1` (1 byte) projects to `"1"` (3 bytes): projected JSON
    // is exactly raw length + 2 with no other field changes.
    const raw = Buffer.from(ROUTINE_JSON, "utf8");
    const { server, origin } = await startLoopbackHttp((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(raw);
    });
    try {
      const fitting = limitTransport(origin, { maxProjectedResultBytes: raw.length + 2 });
      const ok = await pendingCall(
        fitting.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
      );
      expect(ok.status).toBe(200);
      expect(ok.data.revision).toBe("1");
      const overflowing = limitTransport(origin, { maxProjectedResultBytes: raw.length + 1 });
      const error = await catchTransportError(
        pendingCall(
          overflowing.getRoutine(
            { ...testBinding(), origin },
            ROUTINE_R,
            new AbortController().signal,
          ),
        ),
      );
      expect(error.code).toBe("result_too_large");
      expect("data" in error).toBe(false);
    } finally {
      await closeServer(server);
    }
  });
});

describe("trailer head accounting on the wire", () => {
  // Budgets stay legal (>= 4096) and far below the Node parser ceiling, so a
  // parser failure can never mask trailer logic. One server serves both the
  // equality control (wire-request precondition: exactly one hit, success)
  // and the one-over case (no further egress, exact budget error).
  const CHUNK_BODY = ROUTINE_JSON;

  function paddedServe(padLength, trailerPairs) {
    return (socket) => {
      let head = "HTTP/1.1 200 OK\r\n";
      const headPairs = [
        ["content-type", "application/json"],
        ["transfer-encoding", "chunked"],
        ["connection", "close"],
        ["x-qa-pad", "p".repeat(padLength)],
      ];
      for (const [name, value] of headPairs) head += `${name}: ${value}\r\n`;
      head += "\r\n";
      socket.write(head);
      const body = Buffer.from(CHUNK_BODY, "utf8");
      socket.write(`${body.length.toString(16)}\r\n`);
      socket.write(body);
      let tail = "\r\n0\r\n";
      for (const [name, value] of trailerPairs) tail += `${name}: ${value}\r\n`;
      tail += "\r\n";
      socket.write(tail);
      socket.end();
    };
  }

  function normalizedHeadBytes(headPairs) {
    let total = Buffer.byteLength("HTTP/1.1 200 \r\n", "ascii");
    for (const [name, value] of headPairs) {
      total += Buffer.byteLength(`${name}: ${value}\r\n`, "ascii");
    }
    return total + Buffer.byteLength("\r\n", "ascii");
  }

  function normalizedTrailerBytes(trailerPairs) {
    // Approved bound: actual field lines plus the terminator when present
    // (NO status line); ZERO bytes when absent. Chunk framing is body
    // framing, not head accounting, per the same text.
    if (trailerPairs.length === 0) return 0;
    let total = 0;
    for (const [name, value] of trailerPairs) {
      total += Buffer.byteLength(`${name}: ${value}\r\n`, "ascii");
    }
    return total + Buffer.byteLength("\r\n", "ascii");
  }

  it("counts field lines plus terminator only when present", async () => {
    const trailerPairs = [["x-qa-t", "1"]];
    const fixed = [
      ["content-type", "application/json"],
      ["transfer-encoding", "chunked"],
      ["connection", "close"],
    ];
    const fixedHead = normalizedHeadBytes(fixed);
    const trailer = normalizedTrailerBytes(trailerPairs);
    const target = 4200;
    const padLength = target - fixedHead - trailer - Buffer.byteLength("x-qa-pad: \r\n", "ascii");
    expect(padLength).toBeGreaterThan(0);
    const { server, origin, received } = await startRawServer(paddedServe(padLength, trailerPairs));
    try {
      const exact =
        fixedHead + Buffer.byteLength(`x-qa-pad: ${"p".repeat(padLength)}\r\n`, "ascii") + trailer;
      expect(exact).toBe(target);
      expect(exact).toBeGreaterThanOrEqual(4096);
      const fitting = limitTransport(origin, { maxHeadBytes: exact });
      const fittingCall = fitting.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      fittingCall.catch(() => {});
      const ok = await fittingCall;
      expect(ok.status).toBe(200);
      expect(received.length).toBe(1);
      const tight = limitTransport(origin, { maxHeadBytes: exact - 1 });
      const tightCall = tight.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      tightCall.catch(() => {});
      const error = await catchTransportError(tightCall);
      // A response-head cap cannot be evaluated without sending the request:
      // the tight call performs a second request and fails there, once,
      // without automatic retry.
      expect(error.code).toBe("internal_error");
      expect(error.dispatched).toBe(true);
      expect(error.attempts).toBe(1);
      expect(error.outcomeUnknown).toBe(false);
      expect(error.retryable).toBe(true);
      expect(received.length).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it("absent trailers cost zero head bytes at the exact boundary", async () => {
    const fixed = [
      ["content-type", "application/json"],
      ["transfer-encoding", "chunked"],
      ["connection", "close"],
    ];
    const fixedHead = normalizedHeadBytes(fixed);
    expect(normalizedTrailerBytes([])).toBe(0);
    const target = 4096;
    const padLength = target - fixedHead - Buffer.byteLength("x-qa-pad: \r\n", "ascii");
    expect(padLength).toBeGreaterThan(0);
    const { server, origin, received } = await startRawServer(paddedServe(padLength, []));
    try {
      const exact =
        fixedHead + Buffer.byteLength(`x-qa-pad: ${"p".repeat(padLength)}\r\n`, "ascii");
      expect(exact).toBe(target);
      const fitting = limitTransport(origin, { maxHeadBytes: exact });
      const fittingCall = fitting.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      fittingCall.catch(() => {});
      const ok = await fittingCall;
      // Exact fit with no trailers present succeeds only if absent trailers
      // cost zero: any phantom charge would overflow this boundary.
      expect(ok.status).toBe(200);
      expect(received.length).toBe(1);
    } finally {
      await closeServer(server);
    }
  });
});

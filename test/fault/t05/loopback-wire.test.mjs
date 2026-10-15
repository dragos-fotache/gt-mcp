// T05 fault: actual production adapter over isolated literal-loopback HTTP.
// Exact wire bytes/headers, redirect matrix, cookie/proxy discipline, hostile
// query/origin/control payloads, request-head budget accounting. No doubles,
// no external hosts.

/* global AbortController, TextEncoder */

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  startLoopbackHttp,
  closeServer,
  jsonResponse,
  waitForDeadline,
  LOOPBACK_V4,
} from "./helpers.mjs";
import {
  ROUTINE_R,
  ROUTINE_R2,
  EXERCISE_E,
  RESOURCE_KEY,
  BEARER,
  testBinding,
  catchTransportError,
} from "../../unit/t05/helpers.mjs";

function faultSession(overrides = {}) {
  return {
    checkBinding: async () => {},
    selectCredential: async (binding) => ({ bearerToken: BEARER, forBinding: binding }),
    beforeDispatch: async () => {},
    isCurrent: () => true,
    ...overrides,
  };
}

function faultTransport(origin, session, budgets = undefined) {
  return createBackendTransport(
    budgets === undefined
      ? { origin, allowInsecureLoopback: true }
      : { origin, allowInsecureLoopback: true, budgets },
    { session: session ?? faultSession() },
  );
}

const ROUTINE_BODY = (id) => ({
  id,
  name: "",
  isDraft: true,
  revision: 1,
  exercises: [],
});

// Independent request-head accounting per the approved formula: ASCII
// byteLength of `METHOD SP target SP HTTP/1.1\r\n`, every sent
// `name: value\r\n` line, plus the terminating CRLF.
function headBytes(method, target, headers) {
  let total = Buffer.byteLength(`${method} ${target} HTTP/1.1\r\n`, "ascii");
  for (const [name, value] of headers) {
    total += Buffer.byteLength(`${name}: ${value}\r\n`, "ascii");
  }
  return total + Buffer.byteLength("\r\n", "ascii");
}

describe("exact wire bytes and header discipline", () => {
  it("sends lowercase ordered headers with exact lengths and bearer material", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 201, ROUTINE_BODY(ROUTINE_R));
    });
    try {
      const handle = faultTransport(origin);
      const binding = { ...testBinding(), origin };
      const body = new TextEncoder().encode(`{"id":"${ROUTINE_R}"}`);
      const result = await handle.createDraft(
        binding,
        ROUTINE_R,
        body,
        RESOURCE_KEY,
        new AbortController().signal,
      );
      expect(result.status).toBe(201);
      expect(requests.length).toBe(1);
      const [request] = requests;
      expect(request.method).toBe("POST");
      expect(request.url).toBe("/v1/routines");
      expect(Buffer.from(request.body).toString("utf8")).toBe(`{"id":"${ROUTINE_R}"}`);
      const names = [];
      for (let index = 0; index < request.rawHeaders.length; index += 2) {
        names.push(request.rawHeaders[index].toLowerCase());
      }
      expect(names).toEqual([
        "host",
        "connection",
        "accept",
        "accept-encoding",
        "content-length",
        "content-type",
        "idempotency-key",
        "authorization",
      ]);
      const headers = request.headers;
      expect(headers.host).toBe(new URL(origin).host);
      expect(headers["content-length"]).toBe(String(body.length));
      expect(headers["idempotency-key"]).toBe(RESOURCE_KEY);
      expect(headers.authorization).toBe(`Bearer ${BEARER}`);
      expect(headers.cookie).toBe(undefined);
      expect(headers.expect).toBe(undefined);
      expect(headers["transfer-encoding"]).toBe(undefined);
      expect(headers["proxy-authorization"]).toBe(undefined);
    } finally {
      await closeServer(server);
    }
  });

  it("GET carries zero body bytes and no content-type over the wire", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, ROUTINE_BODY(ROUTINE_R));
    });
    try {
      const handle = faultTransport(origin);
      await handle.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      expect(requests.length).toBe(1);
      expect(requests[0].body.length).toBe(0);
      expect(requests[0].headers["content-type"]).toBe(undefined);
      expect(requests[0].headers["content-length"]).toBe("0");
    } finally {
      await closeServer(server);
    }
  });

  it("freezes number spelling and key order exactly as supplied", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 201, ROUTINE_BODY(ROUTINE_R));
    });
    try {
      const handle = faultTransport(origin);
      // Key order and spacing below are intentional: the wire must not repair them.
      const exact = `{"id" : "${ROUTINE_R}"}`;
      const pending = handle.createDraft(
        { ...testBinding(), origin },
        ROUTINE_R,
        new TextEncoder().encode(exact),
        RESOURCE_KEY,
        new AbortController().signal,
      );
      pending.catch(() => {});
      await pending;
      expect(Buffer.from(requests[0].body).toString("utf8")).toBe(exact);
    } finally {
      await closeServer(server);
    }
  });

  it("enforces independent request-head accounting with exact/+1 oracles", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, ROUTINE_BODY(ROUTINE_R));
    });
    try {
      const target = `/v1/routines/${ROUTINE_R}`;
      const headers = [
        ["host", new URL(origin).host],
        ["connection", "close"],
        ["accept", "application/json"],
        ["accept-encoding", "identity"],
        ["content-length", "0"],
        ["authorization", `Bearer ${BEARER}`],
      ];
      const exact = headBytes("GET", target, headers);
      const fitting = faultTransport(origin, undefined, { maxRequestTargetBytes: exact });
      const ok = await fitting.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      expect(ok.status).toBe(200);
      const tight = faultTransport(origin, undefined, { maxRequestTargetBytes: exact - 1 });
      const pending = tight.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      pending.catch(() => {});
      const error = await catchTransportError(pending);
      expect(error.code).toBe("request_too_large");
      expect(requests.length).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("large q tokens count toward the request budget without bypass", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, {
        catalogueVersion: "gymtracka-catalogue-v1",
        items: [],
        hasMore: false,
        nextPageToken: null,
      });
    });
    try {
      const big = `q${"u".repeat(3000)}`;
      const tight = faultTransport(origin, undefined, { maxRequestTargetBytes: 256 });
      const pending = tight.searchExercises(
        { ...testBinding(), origin },
        { search: big, limit: 1 },
        new AbortController().signal,
      );
      pending.catch(() => {});
      const error = await catchTransportError(pending);
      expect(error.code).toBe("request_too_large");
      expect(requests.length).toBe(0);
      const loose = faultTransport(origin);
      await loose.searchExercises(
        { ...testBinding(), origin },
        { search: big, limit: 1 },
        new AbortController().signal,
      );
      expect(requests.length).toBe(1);
    } finally {
      await closeServer(server);
    }
  });
});

describe("redirect matrix on real sockets", () => {
  it("never follows same-origin redirects either", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      res.writeHead(302, { location: `/v1/routines/${ROUTINE_R2}` });
      res.end();
    });
    try {
      const handle = faultTransport(origin);
      const pending = handle.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      pending.catch(() => {});
      const error = await catchTransportError(pending);
      expect(error.code).toBe("internal_error");
      expect(error.retryable).toBe(true);
      expect(requests.length).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("never follows cross-origin redirects and never contacts Location", async () => {
    let secondHits = 0;
    const second = await startLoopbackHttp((req, res) => {
      secondHits += 1;
      jsonResponse(res, 200, {});
    });
    const first = await startLoopbackHttp((req, res) => {
      res.writeHead(302, { location: second.origin });
      res.end();
    });
    try {
      const handle = faultTransport(first.origin);
      const pending = handle.getRoutine(
        { ...testBinding(), origin: first.origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      pending.catch(() => {});
      const error = await catchTransportError(pending);
      expect(error.code).toBe("internal_error");
      expect(error.retryable).toBe(true);
      expect(first.requests.length).toBe(1);
      expect(secondHits).toBe(0);
    } finally {
      await closeServer(first.server);
      await closeServer(second.server);
    }
  });

  for (const status of [307, 308]) {
    it(`${status} never replays mutation bodies or credentials elsewhere`, async () => {
      let secondHits = 0;
      const second = await startLoopbackHttp((req, res) => {
        secondHits += 1;
        jsonResponse(res, 201, ROUTINE_BODY(ROUTINE_R));
      });
      const first = await startLoopbackHttp((req, res) => {
        res.writeHead(status, { location: `${second.origin}/v1/routines` });
        res.end();
      });
      try {
        const handle = faultTransport(first.origin, undefined, { maxAttempts: 3 });
        const pending = handle.createDraft(
          { ...testBinding(), origin: first.origin },
          ROUTINE_R,
          new TextEncoder().encode(`{"id":"${ROUTINE_R}"}`),
          RESOURCE_KEY,
          new AbortController().signal,
        );
        pending.catch(() => {});
        const error = await catchTransportError(pending);
        expect(error.code).toBe("internal_error");
        expect(error.outcomeUnknown).toBe(true);
        expect(first.requests.length).toBe(1);
        expect(secondHits).toBe(0);
      } finally {
        await closeServer(first.server);
        await closeServer(second.server);
      }
    });
  }
});

describe("cookie and proxy discipline on real sockets", () => {
  it("never stores or replays cookies across retry attempts", async () => {
    let calls = 0;
    const { server, origin, requests } = await startLoopbackHttp((req, res, capture) => {
      calls += 1;
      if (calls === 1) {
        // setHeader (not writeHead args) populates the cached header map, so
        // the sent Set-Cookie precondition is independently observable.
        res.setHeader("set-cookie", "synthetic-qa-session=probe; Path=/");
        jsonResponse(res, 503, { errorCode: "temporarily_unavailable" }, [], capture);
        return;
      }
      jsonResponse(res, 201, ROUTINE_BODY(ROUTINE_R));
    });
    try {
      // Precondition: the first response actually carried Set-Cookie.
      const handle = faultTransport(origin);
      const pending = handle.createDraft(
        { ...testBinding(), origin },
        ROUTINE_R,
        new TextEncoder().encode(`{"id":"${ROUTINE_R}"}`),
        RESOURCE_KEY,
        new AbortController().signal,
      );
      pending.catch(() => {});
      const result = await pending;
      expect(result.status).toBe(201);
      expect(requests.length).toBe(2);
      expect(requests[0].sentHeaders?.["set-cookie"]).not.toBe(undefined);
      expect(requests[0].headers.cookie).toBe(undefined);
      expect(requests[1].headers.cookie).toBe(undefined);
    } finally {
      await closeServer(server);
    }
  });

  // Proxy isolation with real startup configuration lives in
  // proxy-isolation.test.mjs (isolated child env/flags + owned traps).
  // In-process proxy-variable mutation is intentionally not tested here:
  // Node reads proxy configuration at startup, so same-process changes
  // cannot exercise the global-agent path and fixed foreign endpoints
  // must never be used.
});

describe("hostile inputs rejected before any egress", () => {
  it("uppercase UUIDs and control purpose smuggling never reach the socket", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, {});
    });
    try {
      const handle = faultTransport(origin);
      const binding = { ...testBinding(), origin };
      const upper = await catchTransportError(
        handle.getRoutine(binding, ROUTINE_R.toUpperCase(), new AbortController().signal),
      );
      expect(upper.code).toBe("invalid_arguments");
      const smuggled = await catchTransportError(
        handle.authChallenge(
          { ...testBinding(), origin, accountUuid: null },
          new TextEncoder().encode('{"purpose":"deleteAccount"}'),
          new AbortController().signal,
        ),
      );
      expect(smuggled.code).toBe("invalid_arguments");
      expect(requests.length).toBe(0);
    } finally {
      await closeServer(server);
    }
  });

  it("hostile search text travels as one encoded parameter", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, {
        catalogueVersion: "gymtracka-catalogue-v1",
        items: [],
        hasMore: false,
        nextPageToken: null,
      });
    });
    try {
      const handle = faultTransport(origin);
      const pending = handle.searchExercises(
        { ...testBinding(), origin },
        { search: "a&b=c?d#e", limit: 1 },
        new AbortController().signal,
      );
      pending.catch(() => {});
      await pending;
      const url = new URL(requests[0].url, origin);
      expect(url.pathname).toBe("/v1/catalogue/exercises");
      expect(url.searchParams.get("q")).toBe("a&b=c?d#e");
      expect([...url.searchParams.keys()]).toEqual(["q", "limit"]);
    } finally {
      await closeServer(server);
    }
  });

  it("literal loopback origin serves the decoded exercise contract", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, {
        id: EXERCISE_E,
        name: "Synthetic QA Press",
        type: "strength",
        isUserCreated: false,
        muscleGroups: [],
        equipment: [],
      });
    }, LOOPBACK_V4);
    try {
      expect(origin.startsWith("http://127.0.0.1:")).toBe(true);
      const handle = faultTransport(origin);
      const pending = handle.getExercise(
        { ...testBinding(), origin },
        EXERCISE_E,
        new AbortController().signal,
      );
      pending.catch(() => {});
      const result = await pending;
      expect(result.data.id).toBe(EXERCISE_E);
      expect(requests.length).toBe(1);
      await waitForDeadline(() => requests.length === 1, 1000);
    } finally {
      await closeServer(server);
    }
  });
});

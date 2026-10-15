// T05 unit: full status/code decision table, safe-code privacy, redirect and
// malformed handling, sticky uncertainty incl. 409-key-reused never settling.
// Approved spec section 8. Every error fixture uses its documented status;
// wrong-pair cases expect internal_error. Tuples assert the full observable.

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  ROUTINE_R,
  RESOURCE_KEY,
  BEARER,
  baseConfig,
  baseDeps,
  makeSession,
  makeWire,
  okJson,
  okRaw,
  networkFail,
  utf8,
  routineWire,
  testBinding,
  catchTransportError,
  freshSignal,
} from "./helpers.mjs";

function errorTransport(script, budgets = undefined) {
  const { session } = makeSession();
  const { wire, captured } = makeWire(script);
  const handle = createBackendTransport(
    budgets === undefined ? baseConfig() : baseConfig({ budgets }),
    { ...baseDeps(), session, wire },
  );
  return { handle, captured };
}

const errorBody = (status, code, extra = {}) => ({
  ok: true,
  status,
  rawHeaders: [["content-type", "application/json"]],
  body: utf8(JSON.stringify({ errorCode: code, ...extra })),
});

const draftCall = (handle) =>
  handle.createDraft(
    testBinding(),
    ROUTINE_R,
    utf8(`{"id":"${ROUTINE_R}"}`),
    RESOURCE_KEY,
    freshSignal(),
  );

const readCall = (handle) => handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());

function errorTuple(error) {
  return {
    code: error.code,
    retryable: error.retryable,
    status: error.status,
    backendErrorCode: error.backendErrorCode,
    retryAfterSeconds: error.retryAfterSeconds,
    dispatched: error.dispatched,
    outcomeUnknown: error.outcomeUnknown,
    attempts: error.attempts,
  };
}

describe("known permanent code/status mapping", () => {
  const rows = [
    [400, "invalid_request", "validation_error", false],
    [400, "invalid_page_token", "invalid_page_token", false],
    [401, "authentication_required", "authentication_required", false],
    [401, "reauthentication_required", "reauthentication_required", false],
    [401, "invalid_google_credential", "authentication_required", false],
    [403, "read_only", "read_only", false],
    [404, "not_found", "not_found", false],
    [409, "idempotency_key_reused", "idempotency_key_reused", false],
    [409, "id_collision", "id_collision", false],
    [409, "invalid_state", "invalid_state", false],
    [410, "page_expired", "page_expired", false],
    [422, "validation_error", "validation_error", false],
    [422, "invalid_reference", "invalid_reference", false],
  ];
  for (const [status, backend, code, retryable] of rows) {
    it(`${status} ${backend} -> ${code}`, async () => {
      const { handle } = errorTransport([errorBody(status, backend)]);
      const error = await catchTransportError(draftCall(handle));
      expect(errorTuple(error)).toEqual({
        code,
        retryable,
        status,
        backendErrorCode: backend,
        retryAfterSeconds: null,
        dispatched: true,
        outcomeUnknown: false,
        attempts: 1,
      });
    });
  }

  it("unknown safe 4xx incl. unknown 400 maps backend_error, never invented validation", async () => {
    for (const status of [400, 404, 422]) {
      const { handle } = errorTransport([errorBody(status, "synthetic_qa_future_code")]);
      const error = await catchTransportError(draftCall(handle));
      expect(errorTuple(error)).toEqual({
        code: "backend_error",
        retryable: false,
        status,
        backendErrorCode: "synthetic_qa_future_code",
        retryAfterSeconds: null,
        dispatched: true,
        outcomeUnknown: false,
        attempts: 1,
      });
    }
  });

  it("recognized code on the wrong status is malformed internal_error", async () => {
    const { handle } = errorTransport([errorBody(404, "rate_limited")]);
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("internal_error");
    expect(error.backendErrorCode).toBe(null);
    expect(error.outcomeUnknown).toBe(true);
  });

  it("sync-only fields never pass through to model-facing errors", async () => {
    const { handle } = errorTransport([
      errorBody(410, "cursor_expired", { fullResyncRequired: true }),
    ]);
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("backend_error");
    expect(error.backendErrorCode).toBe("cursor_expired");
    expect("fullResyncRequired" in error).toBe(false);
  });

  it("optional null messages are accepted and ignored per backend OpenAPI", async () => {
    const known = errorTransport([errorBody(404, "not_found", { message: null })]);
    const knownError = await catchTransportError(draftCall(known.handle));
    expect(knownError.code).toBe("not_found");
    expect(knownError.backendErrorCode).toBe("not_found");

    const unknown = errorTransport([errorBody(400, "synthetic_qa_future", { message: null })]);
    const unknownError = await catchTransportError(draftCall(unknown.handle));
    expect(unknownError.code).toBe("backend_error");
    expect(unknownError.backendErrorCode).toBe("synthetic_qa_future");
  });
});

describe("413, redirects, 500-family and malformed responses", () => {
  it("413 is explicit even with empty body; unmatched code keeps null backend code", async () => {
    const empty = errorTransport([
      { ok: true, status: 413, rawHeaders: [], body: new Uint8Array(0) },
    ]);
    const emptyError = await catchTransportError(draftCall(empty.handle));
    expect(errorTuple(emptyError)).toEqual({
      code: "request_too_large",
      retryable: false,
      status: 413,
      backendErrorCode: null,
      retryAfterSeconds: null,
      dispatched: true,
      outcomeUnknown: false,
      attempts: 1,
    });
  });

  it("any 3xx is internal_error with no follow and no automatic retry", async () => {
    for (const status of [301, 302, 307, 308]) {
      const { handle, captured } = errorTransport(
        [
          {
            ok: true,
            status,
            rawHeaders: [["location", "https://other.example.invalid/"]],
            body: new Uint8Array(0),
          },
          okJson(201, routineWire()),
        ],
        { maxAttempts: 5 },
      );
      const error = await catchTransportError(draftCall(handle));
      expect(errorTuple(error)).toEqual({
        code: "internal_error",
        retryable: true,
        status,
        backendErrorCode: null,
        retryAfterSeconds: null,
        dispatched: true,
        outcomeUnknown: true,
        attempts: 1,
      });
      expect(captured.length).toBe(1);
    }
  });

  it("500/502/504 retry bounded on empty bodies and valid error objects only", async () => {
    for (const response of [
      errorBody(500, "internal_error"),
      { ok: true, status: 502, rawHeaders: [], body: new Uint8Array(0) },
      { ok: true, status: 504, rawHeaders: [], body: new Uint8Array(0) },
      { ok: true, status: 500, rawHeaders: [], body: new Uint8Array(0) },
    ]) {
      const { handle, captured } = errorTransport([response, okJson(201, routineWire())], {
        maxAttempts: 3,
      });
      const result = await draftCall(handle);
      expect(result.status).toBe(201);
      expect(result.attempts).toBe(2);
      expect(captured.length).toBe(2);
    }
  });

  it("malformed nonempty 500/502 bodies and other 5xx never auto-retry", async () => {
    for (const response of [
      okRaw(500, "not json{{{"),
      okRaw(502, "not json{{{"),
      errorBody(501, "synthetic_qa_501"),
      errorBody(507, "synthetic_qa_507"),
    ]) {
      const { handle, captured } = errorTransport([response, okJson(201, routineWire())], {
        maxAttempts: 3,
      });
      const error = await catchTransportError(draftCall(handle));
      expect(error.code).toBe("internal_error");
      expect(error.outcomeUnknown).toBe(true);
      expect(captured.length).toBe(1);
    }
  });

  it("malformed bodies at the EXPECTED read status are uncertain internal_error", async () => {
    const cases = [
      okRaw(200, '{"id":}'),
      okRaw(200, '{"a":1,"a":2}'),
      okRaw(200, "﻿{}"),
      okJson(200, { errorCode: "HAS SPACE!" }),
      okJson(200, { unexpected: "shape" }),
      { ok: true, status: 200, rawHeaders: [["content-type", "text/plain"]], body: utf8("{}") },
    ];
    for (const [index, response] of cases.entries()) {
      const { handle, captured } = errorTransport([response, okJson(201, routineWire())], {
        maxAttempts: 3,
      });
      const error = await catchTransportError(readCall(handle));
      expect({ index, code: error.code }).toEqual({ index, code: "internal_error" });
      expect(error.outcomeUnknown).toBe(false);
      expect(captured.length).toBe(1);
    }
  });

  it("wrong success statuses never become confirmations", async () => {
    const draft200 = errorTransport([okJson(200, routineWire())]);
    const draftError = await catchTransportError(draftCall(draft200.handle));
    expect(draftError.code).toBe("internal_error");
    expect(draftError.outcomeUnknown).toBe(true);

    const read201 = errorTransport([
      okJson(201, routineWire({ isDraft: false, name: "Synthetic QA Saved", revision: 2 })),
    ]);
    const readError = await catchTransportError(readCall(read201.handle));
    expect(readError.code).toBe("internal_error");
    expect(readError.outcomeUnknown).toBe(false);
  });

  it("sender exceptions become network_error without message inspection", async () => {
    const { session } = makeSession();
    const { wire } = makeWire([
      async () => {
        throw new Error(`synthetic-qa native boom ${BEARER}`);
      },
    ]);
    const handle = createBackendTransport(baseConfig(), { ...baseDeps(), session, wire });
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("network_error");
    expect(error.message).toBe("Transport failure: network_error.");
  });
});

describe("safe-code privacy: poisoned messages, lexical exclusions, no fabrication", () => {
  it("message poisoning never drops a safe code or leaks the message", async () => {
    const poison = `Bearer ${BEARER} synthetic-secret-probe <script>synthetic-qa-xss</script>`;
    const { handle } = errorTransport([errorBody(404, "not_found", { message: poison })]);
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("not_found");
    expect(error.backendErrorCode).toBe("not_found");
    const serialized = JSON.stringify(error);
    expect(serialized.includes("synthetic-secret-probe")).toBe(false);
    expect(serialized.includes(BEARER)).toBe(false);
  });

  it("known whitelist codes stay safe when a short bearer is part of one", async () => {
    // The bearer `not` is a literal substring of the known machine code
    // `not_found`: the fixed whitelist exemption must still map it.
    const { session } = makeSession({
      selectCredential: async (binding) => ({ bearerToken: "not", forBinding: binding }),
    });
    const { wire } = makeWire([errorBody(404, "not_found")]);
    const handle = createBackendTransport(baseConfig(), { ...baseDeps(), session, wire });
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("not_found");
    expect(error.backendErrorCode).toBe("not_found");
  });

  it("32-hex runs make unknown codes unsafe even when grammar-clean", async () => {
    const hexRun = `qa_${"ab".repeat(16)}_tail`;
    const { handle } = errorTransport([errorBody(400, hexRun)]);
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("internal_error");
    expect(error.backendErrorCode).toBe(null);
  });

  it("exact captured bearer substrings make unknown codes unsafe", async () => {
    const token = "abc123xyz789qrs45678";
    const bearer = `syntheticqabearer${token}`;
    const code = `qa_${bearer}_event`;
    const unsafeSession = makeSession({
      selectCredential: async (binding) => ({ bearerToken: bearer, forBinding: binding }),
    });
    const unsafeWire = makeWire([errorBody(400, code)]);
    const unsafeHandle = createBackendTransport(baseConfig(), {
      ...baseDeps(),
      session: unsafeSession.session,
      wire: unsafeWire.wire,
    });
    const unsafeError = await catchTransportError(draftCall(unsafeHandle));
    expect(unsafeError.code).toBe("internal_error");
    expect(unsafeError.backendErrorCode).toBe(null);

    // Same grammar-clean code with an unrelated bearer stays safe/retained.
    const safeHandle = errorTransport([errorBody(400, code)]).handle;
    const safeError = await catchTransportError(draftCall(safeHandle));
    expect(safeError.code).toBe("backend_error");
    expect(safeError.backendErrorCode).toBe(code);
  });

  it("safe unknown codes longer than 64 chars survive (bytes bound only)", async () => {
    const longCode = `qa_${"z".repeat(70)}`;
    const { handle } = errorTransport([errorBody(400, longCode)]);
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("backend_error");
    expect(error.backendErrorCode).toBe(longCode);
  });

  it("never fabricates backendErrorCode unknown", async () => {
    const { handle } = errorTransport([okRaw(500, "not json{{{")]);
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("internal_error");
    expect(error.backendErrorCode === "unknown").toBe(false);
  });
});

describe("sticky uncertainty: no error clears prior dispatch risk", () => {
  it("standalone 503 is uncertain on writes and definite on reads", async () => {
    const write = errorTransport([okJson(503, { errorCode: "temporarily_unavailable" })], {
      maxAttempts: 1,
    });
    const writeError = await catchTransportError(draftCall(write.handle));
    expect(errorTuple(writeError)).toEqual({
      code: "temporarily_unavailable",
      retryable: true,
      status: 503,
      backendErrorCode: "temporarily_unavailable",
      retryAfterSeconds: null,
      dispatched: true,
      outcomeUnknown: true,
      attempts: 1,
    });

    const read = errorTransport([okJson(503, { errorCode: "temporarily_unavailable" })], {
      maxAttempts: 1,
    });
    const readError = await catchTransportError(readCall(read.handle));
    expect(readError.code).toBe("temporarily_unavailable");
    expect(readError.outcomeUnknown).toBe(false);
  });

  it("uncertain-then-definitive keeps outcomeUnknown with the later code", async () => {
    const finals = [
      [errorBody(422, "validation_error"), "validation_error"],
      [errorBody(409, "invalid_state"), "invalid_state"],
      [errorBody(401, "authentication_required"), "authentication_required"],
      [{ ok: true, status: 413, rawHeaders: [], body: new Uint8Array(0) }, "request_too_large"],
      [okJson(429, { errorCode: "rate_limited" }), "rate_limited"],
    ];
    for (const [index, [second, code]] of finals.entries()) {
      const { handle, captured } = errorTransport([networkFail(), second], { maxAttempts: 2 });
      const error = await catchTransportError(draftCall(handle));
      expect({ index, tuple: errorTuple(error) }).toEqual({
        index,
        tuple: {
          code,
          retryable: code === "rate_limited",
          status: second.status,
          backendErrorCode: code === "request_too_large" ? null : code,
          retryAfterSeconds: null,
          dispatched: true,
          outcomeUnknown: true,
          attempts: 2,
        },
      });
      expect(captured.length).toBe(2);
    }
  });

  it("idempotency_key_reused NEVER settles an uncertain request", async () => {
    const conflict = errorBody(409, "idempotency_key_reused");
    const { handle, captured } = errorTransport([networkFail(), conflict], { maxAttempts: 3 });
    const error = await catchTransportError(draftCall(handle));
    expect(errorTuple(error)).toEqual({
      code: "idempotency_key_reused",
      retryable: false,
      status: 409,
      backendErrorCode: "idempotency_key_reused",
      retryAfterSeconds: null,
      dispatched: true,
      outcomeUnknown: true,
      attempts: 2,
    });
    expect(captured.length).toBe(2);
  });

  it("later local hook failures preserve sticky state", async () => {
    const seen = { count: 0 };
    const { session } = makeSession({
      beforeDispatch: async () => {
        seen.count += 1;
        if (seen.count === 2) throw new Error("synthetic-qa late owner veto");
      },
    });
    const { wire, captured } = makeWire([networkFail(), networkFail()]);
    const handle = createBackendTransport(baseConfig({ budgets: { maxAttempts: 3 } }), {
      ...baseDeps(),
      session,
      wire,
    });
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("operation_interrupted");
    expect(error.outcomeUnknown).toBe(true);
    expect(error.dispatched).toBe(true);
    expect(captured.length).toBe(1);
  });

  it("later local credential failures preserve sticky state", async () => {
    const seen = { count: 0 };
    const { session } = makeSession({
      selectCredential: async (binding) => {
        seen.count += 1;
        if (seen.count === 1) return { bearerToken: BEARER, forBinding: binding };
        return null;
      },
    });
    const { wire } = makeWire([networkFail(), networkFail()]);
    const handle = createBackendTransport(baseConfig({ budgets: { maxAttempts: 3 } }), {
      ...baseDeps(),
      session,
      wire,
    });
    const error = await catchTransportError(draftCall(handle));
    expect(error.code).toBe("authentication_required");
    expect(error.outcomeUnknown).toBe(true);
    expect(error.dispatched).toBe(true);
  });

  it("429 and 503 stay distinct in code while sharing retryability", async () => {
    const limited = errorTransport(
      [okJson(429, { errorCode: "rate_limited" }, [["retry-after", "2"]])],
      {
        maxAttempts: 1,
      },
    );
    const limitedError = await catchTransportError(draftCall(limited.handle));
    expect({ code: limitedError.code, retryable: limitedError.retryable }).toEqual({
      code: "rate_limited",
      retryable: true,
    });
    const unavailable = errorTransport(
      [okJson(503, { errorCode: "temporarily_unavailable" }, [["retry-after", "2"]])],
      {
        maxAttempts: 1,
      },
    );
    const unavailableError = await catchTransportError(draftCall(unavailable.handle));
    expect({ code: unavailableError.code, retryable: unavailableError.retryable }).toEqual({
      code: "temporarily_unavailable",
      retryable: true,
    });
  });

  it("only a full validated unfenced success settles uncertainty", async () => {
    const { handle } = errorTransport([networkFail(), okJson(201, routineWire())], {
      maxAttempts: 3,
    });
    const result = await draftCall(handle);
    expect(result.status).toBe(201);
    expect(result.attempts).toBe(2);
    expect(result.dispatched).toBe(true);
    expect(result.data.id).toBe(ROUTINE_R);
  });

  it("reads never carry uncertainty even after transport failures", async () => {
    const { handle } = errorTransport(
      [
        networkFail(),
        okJson(200, routineWire({ isDraft: false, name: "Synthetic QA Saved", revision: 2 })),
      ],
      { maxAttempts: 3 },
    );
    const result = await readCall(handle);
    expect(result.status).toBe(200);
    expect("outcomeUnknown" in result).toBe(false);
  });
});

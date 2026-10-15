// T05 unit: per-field budgets incl. request-target and projected-result
// expansion, monotonic deadlines, Retry-After exactness, bounded backoff.
// Approved spec sections 6 and 7. Body sizes are measured independently at
// runtime; the 64-byte factory minimum is honored by every oracle.

/* global AbortController, queueMicrotask, setTimeout */

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  ROUTINE_R,
  RESOURCE_KEY,
  baseConfig,
  baseDeps,
  makeSession,
  makeClock,
  makeSleeper,
  makeWire,
  okJson,
  utf8,
  routineWire,
  testBinding,
  catchTransportError,
  freshSignal,
} from "./helpers.mjs";

function budgetTransport({ script, budgets, sessionOverrides = {}, clockStart = 1000 }) {
  const { session, calls } = makeSession(sessionOverrides);
  const clockHandle = makeClock(clockStart);
  const { sleeper, sleeps } = makeSleeper(clockHandle);
  const { wire, captured } = makeWire(script);
  const config = budgets === undefined ? baseConfig() : baseConfig({ budgets });
  const handle = createBackendTransport(config, {
    ...baseDeps(),
    session,
    clock: clockHandle.clock,
    sleeper,
    wire,
  });
  return { handle, calls, captured, sleeps, clockHandle };
}

// Minimal-shape populate body with whitespace preserved. Names chosen so the
// encoded body is always >= 64 bytes (the factory minimum); exact lengths are
// measured at runtime, never hand-counted.
function populateBody(name) {
  return utf8(`{"id" : "${ROUTINE_R}", "name" : "${name}", "isDraft" : true, "exercises" : []}`);
}

function populateSuccess(name) {
  return okJson(200, { id: ROUTINE_R, name, isDraft: true, revision: 1, exercises: [] });
}

const draftBody = () => utf8(`{"id":"${ROUTINE_R}"}`);
const draftSuccess = () =>
  okJson(201, { id: ROUTINE_R, name: "", isDraft: true, revision: 1, exercises: [] });

describe("request and request-target budgets", () => {
  it("rejects oversize populate bodies before beforeDispatch without retry", async () => {
    const body = populateBody("n".repeat(60));
    expect(body.length).toBeGreaterThanOrEqual(64);
    const { handle, calls, captured } = budgetTransport({
      script: [populateSuccess("n".repeat(60))],
      budgets: { maxRequestBytes: 64, maxAttempts: 3 },
    });
    const error = await catchTransportError(
      handle.populateDraft(testBinding(), ROUTINE_R, body, RESOURCE_KEY, freshSignal()),
    );
    expect({
      code: error.code,
      retryable: error.retryable,
      outcomeUnknown: error.outcomeUnknown,
      dispatched: error.dispatched,
      attempts: error.attempts,
    }).toEqual({
      code: "request_too_large",
      retryable: false,
      outcomeUnknown: false,
      dispatched: false,
      attempts: 0,
    });
    expect(captured.length).toBe(0);
    expect(calls.beforeDispatch.length).toBe(0);
  });

  it("accepts exact-equality body size and rejects one byte over", async () => {
    const name = "n".repeat(60);
    const body = populateBody(name);
    expect(body.length).toBeGreaterThanOrEqual(64);
    const exact = budgetTransport({
      script: [populateSuccess(name)],
      budgets: { maxRequestBytes: body.length },
    });
    const result = await exact.handle.populateDraft(
      testBinding(),
      ROUTINE_R,
      body,
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.status).toBe(200);

    const over = budgetTransport({
      script: [populateSuccess(name)],
      budgets: { maxRequestBytes: body.length - 1 },
    });
    const error = await catchTransportError(
      over.handle.populateDraft(testBinding(), ROUTINE_R, body, RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("request_too_large");
    expect(over.captured.length).toBe(0);
  });

  it("counts bearer target/header bytes: huge token exceeds target budget", async () => {
    const huge = `synthetic-qa-huge-bearer.${"a".repeat(5000)}`;
    const { handle, captured } = budgetTransport({
      script: [draftSuccess()],
      budgets: { maxRequestTargetBytes: 256 },
      sessionOverrides: {
        selectCredential: async (binding) => ({ bearerToken: huge, forBinding: binding }),
      },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("request_too_large");
    expect(captured.length).toBe(0);
  });
});

describe("response and projected-result budgets", () => {
  it("oversize wire bodies fail result_too_large before classification", async () => {
    const bigName = "n".repeat(2000);
    const { handle, captured } = budgetTransport({
      script: [
        okJson(200, {
          id: ROUTINE_R,
          name: bigName,
          isDraft: false,
          revision: 1,
          exercises: [],
        }),
      ],
      budgets: { maxResponseBytes: 128 },
    });
    const error = await catchTransportError(
      handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect({
      code: error.code,
      retryable: error.retryable,
      outcomeUnknown: error.outcomeUnknown,
    }).toEqual({ code: "result_too_large", retryable: false, outcomeUnknown: false });
    expect(captured.length).toBe(1);
  });

  it("projected expansion beyond wire size is budgeted separately and stays uncertain on writes", async () => {
    const { handle } = budgetTransport({
      script: [draftSuccess()],
      budgets: { maxProjectedResultBytes: 64 },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect({
      code: error.code,
      outcomeUnknown: error.outcomeUnknown,
      dispatched: error.dispatched,
    }).toEqual({ code: "result_too_large", outcomeUnknown: true, dispatched: true });
    expect("data" in error).toBe(false);
    expect("rawBodyBytes" in error).toBe(false);
  });

  it("projected overflow on reads is definite, never uncertain", async () => {
    const read = budgetTransport({
      script: [
        okJson(200, { id: ROUTINE_R, name: "", isDraft: false, revision: 1, exercises: [] }),
      ],
      budgets: { maxProjectedResultBytes: 64 },
    });
    const error = await catchTransportError(
      read.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(error.code).toBe("result_too_large");
    expect(error.outcomeUnknown).toBe(false);
  });
});

describe("Retry-After exactness and backoff bounds", () => {
  const rateLimited = (retryAfter) =>
    okJson(
      429,
      { errorCode: "rate_limited" },
      retryAfter === null ? [] : [["retry-after", retryAfter]],
    );

  it("honors a positive Retry-After exactly, never capped to backoff", async () => {
    const { handle, sleeps, captured } = budgetTransport({
      script: [rateLimited("2"), draftSuccess()],
      budgets: { baseRetryDelayMs: 500, maxRetryDelayMs: 5000 },
    });
    const result = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.status).toBe(201);
    expect(sleeps).toEqual([2000]);
    expect(captured.length).toBe(2);
  });

  it("applies default exponential backoff with cap across attempts", async () => {
    const capped = budgetTransport({
      script: [
        { ok: false, kind: "network", status: null },
        { ok: false, kind: "network", status: null },
        draftSuccess(),
      ],
      budgets: { baseRetryDelayMs: 4000, maxRetryDelayMs: 5000 },
    });
    const result = await capped.handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.status).toBe(201);
    expect(capped.sleeps).toEqual([4000, 5000]);
    expect(capped.captured.length).toBe(3);
  });

  it("stops at maxAttempts with the terminal error", async () => {
    const { handle, captured, sleeps } = budgetTransport({
      script: [{ ok: false, kind: "network", status: null }],
      budgets: { maxAttempts: 2, baseRetryDelayMs: 100, maxRetryDelayMs: 100 },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect({ code: error.code, attempts: error.attempts }).toEqual({
      code: "network_error",
      attempts: 2,
    });
    expect(captured.length).toBe(2);
    expect(sleeps).toEqual([100]);
  });

  it("unfittable Retry-After returns the original error without early retry", async () => {
    const { handle, sleeps, captured } = budgetTransport({
      script: [rateLimited("5"), draftSuccess()],
      budgets: { totalDeadlineMs: 1500 },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect({
      code: error.code,
      retryAfterSeconds: error.retryAfterSeconds,
      attempts: error.attempts,
    }).toEqual({ code: "rate_limited", retryAfterSeconds: 5, attempts: 1 });
    expect(sleeps).toEqual([]);
    expect(captured.length).toBe(1);
  });

  it("delay equal to remaining budget does not fit: original error, no sleep", async () => {
    const { handle, sleeps, captured } = budgetTransport({
      script: [rateLimited("2"), draftSuccess()],
      budgets: { totalDeadlineMs: 2000 },
      clockStart: 1000,
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect({ code: error.code, retryAfterSeconds: error.retryAfterSeconds }).toEqual({
      code: "rate_limited",
      retryAfterSeconds: 2,
    });
    expect(sleeps).toEqual([]);
    expect(captured.length).toBe(1);
  });

  it("honors Retry-After on 503 and on valid 500 error objects", async () => {
    for (const response of [
      okJson(503, { errorCode: "temporarily_unavailable" }, [["retry-after", "1"]]),
      okJson(500, { errorCode: "internal_error" }, [["retry-after", "1"]]),
    ]) {
      const { handle, sleeps, captured } = budgetTransport({
        script: [response, draftSuccess()],
        budgets: { baseRetryDelayMs: 500, maxRetryDelayMs: 5000 },
      });
      const result = await handle.createDraft(
        testBinding(),
        ROUTINE_R,
        draftBody(),
        RESOURCE_KEY,
        freshSignal(),
      );
      expect(result.status).toBe(201);
      expect(sleeps).toEqual([1000]);
      expect(captured.length).toBe(2);
    }
  });

  it("trims OWS around Retry-After before exact application", async () => {
    const { handle, sleeps } = budgetTransport({
      script: [rateLimited("  3  "), draftSuccess()],
      budgets: { baseRetryDelayMs: 500, maxRetryDelayMs: 5000 },
    });
    const result = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.status).toBe(201);
    expect(sleeps).toEqual([3000]);
  });

  it("enormous lexical values prohibit retry with null exposed delay", async () => {
    const { handle, sleeps, captured } = budgetTransport({
      script: [rateLimited("99999999999999999999999"), draftSuccess()],
      budgets: { maxAttempts: 5 },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect({ code: error.code, retryAfterSeconds: error.retryAfterSeconds }).toEqual({
      code: "rate_limited",
      retryAfterSeconds: null,
    });
    expect(sleeps).toEqual([]);
    expect(captured.length).toBe(1);
  });

  it("invalid or absent values fall back to bounded exponential backoff", async () => {
    for (const header of [null, "soon", "0", "-3", "2.5", ""]) {
      const { handle, sleeps } = budgetTransport({
        script: [rateLimited(header), draftSuccess()],
        budgets: { baseRetryDelayMs: 500, maxRetryDelayMs: 5000 },
      });
      const result = await handle.createDraft(
        testBinding(),
        ROUTINE_R,
        draftBody(),
        RESOURCE_KEY,
        freshSignal(),
      );
      expect({ header, status: result.status, sleeps }).toEqual({
        header,
        status: 201,
        sleeps: [500],
      });
    }
  });

  it("success ignores Retry-After headers entirely", async () => {
    const success = okJson(201, routineWire(), [["retry-after", "30"]]);
    const { handle, sleeps } = budgetTransport({ script: [success] });
    const result = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.status).toBe(201);
    expect(sleeps).toEqual([]);
  });
});

describe("monotonic deadlines, hook timeouts and sleep abort", () => {
  it("non-finite clocks fail internal_error with no dispatch afterwards", async () => {
    const { session } = makeSession();
    const { wire, captured } = makeWire([draftSuccess()]);
    const handle = createBackendTransport(baseConfig(), {
      ...baseDeps(),
      session,
      clock: { nowMs: () => NaN },
      wire,
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("internal_error");
    expect(captured.length).toBe(0);
  });

  it("receding clocks fail internal_error", async () => {
    let calls = 0;
    const { session } = makeSession();
    const { wire } = makeWire([draftSuccess()]);
    const handle = createBackendTransport(baseConfig(), {
      ...baseDeps(),
      session,
      clock: {
        nowMs: () => {
          calls += 1;
          return calls === 1 ? 5000 : 1000;
        },
      },
      wire,
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("internal_error");
  });

  it("deadline expiry without a terminal error maps network_error", async () => {
    const clockHandle = makeClock(0);
    const { session } = makeSession();
    const { wire, captured } = makeWire([
      async () => {
        clockHandle.advance(500);
        return { ok: false, kind: "network", status: null };
      },
    ]);
    const expiring = createBackendTransport(baseConfig({ budgets: { totalDeadlineMs: 100 } }), {
      ...baseDeps(),
      session,
      clock: clockHandle.clock,
      wire,
    });
    const error = await catchTransportError(
      expiring.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect({ code: error.code, retryable: error.retryable }).toEqual({
      code: "network_error",
      retryable: true,
    });
    expect(captured.length).toBe(1);
  });

  it("hook overrunning the deadline maps network_error with no send", async () => {
    const clockHandle = makeClock(1000);
    const { session } = makeSession({
      beforeDispatch: async () => {
        clockHandle.advance(999999);
      },
    });
    const { wire, captured } = makeWire([draftSuccess()]);
    const handle = createBackendTransport(baseConfig({ budgets: { totalDeadlineMs: 5000 } }), {
      ...baseDeps(),
      session,
      clock: clockHandle.clock,
      wire,
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("network_error");
    expect(captured.length).toBe(0);
  });

  it("abort during retry sleep interrupts without further dispatch", async () => {
    const controller = new AbortController();
    const { session } = makeSession();
    const { wire, captured } = makeWire([
      { ok: false, kind: "network", status: null },
      draftSuccess(),
    ]);
    const handle = createBackendTransport(baseConfig({ budgets: { maxAttempts: 3 } }), {
      ...baseDeps(),
      session,
      sleeper: {
        sleep: (ms, signal) =>
          new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => reject(new Error("synthetic-qa sleep aborted")));
            queueMicrotask(() => controller.abort());
            void ms;
          }),
      },
      wire,
    });
    const pending = handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      controller.signal,
    );
    pending.catch(() => {});
    const error = await catchTransportError(pending);
    expect(error.code).toBe("operation_interrupted");
    expect(captured.length).toBe(1);
    // The first dispatched attempt already made a write uncertain.
    expect(error.dispatched).toBe(true);
    expect(error.outcomeUnknown).toBe(true);
  });

  it("a never-settling hook loses the real deadline race with network_error", async () => {
    const { session } = makeSession({
      beforeDispatch: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      },
    });
    const { wire, captured } = makeWire([draftSuccess()]);
    const handle = createBackendTransport(baseConfig({ budgets: { totalDeadlineMs: 200 } }), {
      ...baseDeps(),
      session,
      wire,
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("network_error");
    expect(captured.length).toBe(0);
  });

  it("success arriving after the deadline is never delivered", async () => {
    const clockHandle = makeClock(1000);
    const { session } = makeSession();
    const { wire, captured } = makeWire([
      async () => {
        clockHandle.advance(99999);
        return draftSuccess();
      },
    ]);
    const handle = createBackendTransport(baseConfig({ budgets: { totalDeadlineMs: 5000 } }), {
      ...baseDeps(),
      session,
      clock: clockHandle.clock,
      wire,
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("network_error");
    expect(error.attempts).toBe(1);
    expect(captured.length).toBe(1);
    expect("data" in error).toBe(false);
  });

  it("terminal backend error whose retry cannot fit returns the original error", async () => {
    const { handle, captured } = budgetTransport({
      script: [
        okJson(503, { errorCode: "temporarily_unavailable" }, [["retry-after", "30"]]),
        draftSuccess(),
      ],
      budgets: { totalDeadlineMs: 1000 },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect({
      code: error.code,
      retryAfterSeconds: error.retryAfterSeconds,
      attempts: error.attempts,
    }).toEqual({ code: "temporarily_unavailable", retryAfterSeconds: 30, attempts: 1 });
    expect(captured.length).toBe(1);
  });
});

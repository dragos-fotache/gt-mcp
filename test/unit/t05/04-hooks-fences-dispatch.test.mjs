// T05 unit: hook order, captured-binding identity, fences, dispatch certainty,
// per-attempt signals, credential matching, no-refresh/no-retry rules.
// Approved spec sections 2, 5 and 8.

/* global AbortController, AbortSignal, setImmediate */

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  PROFILE_P,
  ROUTINE_R,
  RESOURCE_KEY,
  AUTH_KEY,
  BEARER,
  CHALLENGE_C,
  baseConfig,
  baseDeps,
  makeSession,
  makeClock,
  makeSleeper,
  makeWire,
  okJson,
  utf8,
  testBinding,
  nullAccountBinding,
  catchTransportError,
  freshSignal,
} from "./helpers.mjs";

function hookTransport({ script, sessionOverrides = {}, budgets = undefined }) {
  const { session, calls } = makeSession(sessionOverrides);
  const { wire, captured } = makeWire(script);
  const config = budgets === undefined ? baseConfig() : baseConfig({ budgets });
  const handle = createBackendTransport(config, { ...baseDeps(), session, wire });
  return { handle, session, calls, captured };
}

const draftBody = () => utf8(`{"id":"${ROUTINE_R}"}`);
const draftSuccess = () =>
  okJson(201, { id: ROUTINE_R, name: "", isDraft: true, revision: 1, exercises: [] });

describe("per-attempt hook order and captured binding identity", () => {
  it("runs pre-send, selectCredential, beforeDispatch, final guard, pre-delivery", async () => {
    const { handle, calls, captured } = hookTransport({ script: [draftSuccess()] });
    const result = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.dispatched).toBe(true);
    expect(result.attempts).toBe(1);
    expect(calls.checkBinding.map((call) => call.point)).toEqual(["pre-send", "pre-delivery"]);
    expect(calls.selectCredential.length).toBe(1);
    expect(calls.selectCredential[0].route).toBe("create_draft");
    expect(calls.beforeDispatch.length).toBe(1);
    expect(calls.beforeDispatch[0].summary.attempt).toBe(1);
    expect(calls.beforeDispatch[0].summary.routeLabel).toBe("create_draft");
    expect(calls.beforeDispatch[0].summary.keyKind).toBe("resource");
    expect(captured.length).toBe(1);
    // Every hook receives the SAME captured binding object, never a reglobal.
    const seen = [
      ...calls.checkBinding.map((call) => call.binding),
      ...calls.selectCredential.map((call) => call.binding),
      ...calls.beforeDispatch.map((call) => call.binding),
      ...calls.isCurrent.map((call) => call.binding),
    ];
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]).toEqual(testBinding());
  });

  it("passes internal per-attempt signals distinct from the caller signal", async () => {
    const { handle, calls, captured } = hookTransport({ script: [draftSuccess()] });
    const callerSignal = freshSignal();
    await handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, callerSignal);
    for (const call of [
      ...calls.checkBinding,
      ...calls.selectCredential,
      ...calls.beforeDispatch,
    ]) {
      expect(call.signal).toBeInstanceOf(AbortSignal);
      expect(call.signal).not.toBe(callerSignal);
    }
    expect(captured[0].signal).toBeInstanceOf(AbortSignal);
    expect(captured[0].signal).not.toBe(callerSignal);
  });

  it("beforeDispatch failure prevents sending that attempt", async () => {
    const { handle, captured } = hookTransport({
      script: [draftSuccess()],
      sessionOverrides: {
        beforeDispatch: async () => {
          throw new Error("synthetic-qa owner veto");
        },
      },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("operation_interrupted");
    expect(error.dispatched).toBe(false);
    expect(error.attempts).toBe(0);
    expect(captured.length).toBe(0);
  });

  it("final synchronous guard rejects false, throws and thenables", async () => {
    for (const answer of [false, new Error("synthetic-qa fence"), Promise.resolve(true)]) {
      const { handle, captured } = hookTransport({
        script: [draftSuccess()],
        sessionOverrides: { isCurrentAnswers: [answer] },
      });
      const error = await catchTransportError(
        handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
      );
      expect({ answer: String(answer), code: error.code }).toEqual({
        answer: String(answer),
        code: "operation_interrupted",
      });
      expect(captured.length).toBe(0);
    }
  });

  it("pre-delivery fence suppresses an already-received mutation as uncertain", async () => {
    const { handle, captured } = hookTransport({
      script: [draftSuccess()],
      sessionOverrides: { isCurrentAnswers: [true, false] },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("operation_interrupted");
    expect(captured.length).toBe(1);
    // Dispatched write suppressed at delivery stays conservatively uncertain.
    expect(error.dispatched).toBe(true);
    expect(error.outcomeUnknown).toBe(true);
  });
});

describe("credential selection: full four-field binding match", () => {
  it("rejects material mismatching any single captured field", async () => {
    const variants = [
      { origin: "https://other.example.invalid" },
      { accountUuid: ACCOUNT_B },
      { sessionGeneration: 1 },
      { profileGenerationId: PROFILE_P.replace(/^c/, "d") },
    ];
    for (const patch of variants) {
      const { handle, captured } = hookTransport({
        script: [draftSuccess()],
        sessionOverrides: {
          selectCredential: async (binding) => ({
            bearerToken: BEARER,
            forBinding: { ...binding, ...patch },
          }),
        },
      });
      const error = await catchTransportError(
        handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
      );
      expect({ patch, code: error.code }).toEqual({ patch, code: "authentication_required" });
      expect(captured.length).toBe(0);
    }
  });

  it("rejects null, malformed and header-unsafe credential material", async () => {
    const badMaterials = [
      null,
      { bearerToken: BEARER },
      { bearerToken: "", forBinding: testBinding() },
      { bearerToken: "has whitespace", forBinding: testBinding() },
      { bearerToken: "non-ascii-ü", forBinding: testBinding() },
    ];
    for (const material of badMaterials) {
      const { handle, captured } = hookTransport({
        script: [draftSuccess()],
        sessionOverrides: { selectCredential: async () => material },
      });
      const error = await catchTransportError(
        handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
      );
      expect(error.code).toBe("authentication_required");
      expect(captured.length).toBe(0);
    }
  });

  it("credential callback throw is operation_interrupted, not auth leakage", async () => {
    const { handle, captured } = hookTransport({
      script: [draftSuccess()],
      sessionOverrides: {
        selectCredential: async () => {
          throw new Error("synthetic-qa credential store failure");
        },
      },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("operation_interrupted");
    expect(captured.length).toBe(0);
  });

  it("control routes never call selectCredential", async () => {
    const { handle, calls } = hookTransport({ script: [okJson(200, {})] });
    await handle.authChallenge(nullAccountBinding(), utf8("{}"), freshSignal());
    expect(calls.selectCredential.length).toBe(0);
  });
});

describe("401 never refreshes; controls get exactly one attempt", () => {
  it("401 on a read maps without retry and keeps resource identity", async () => {
    const { handle, captured } = hookTransport({
      script: [
        {
          ok: true,
          status: 401,
          rawHeaders: [["content-type", "application/json"]],
          body: utf8('{"errorCode":"authentication_required"}'),
        },
      ],
    });
    const error = await catchTransportError(
      handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(error.code).toBe("authentication_required");
    expect(error.retryable).toBe(false);
    expect(error.outcomeUnknown).toBe(false);
    expect(captured.length).toBe(1);
  });

  it("second 401 after a first 401 still stops: no refresh-and-retry here", async () => {
    const unauthorized = {
      ok: true,
      status: 401,
      rawHeaders: [["content-type", "application/json"]],
      body: utf8('{"errorCode":"authentication_required"}'),
    };
    const { handle, captured, calls } = hookTransport({
      script: [unauthorized, unauthorized],
      budgets: { maxAttempts: 5 },
    });
    const error = await catchTransportError(
      handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(error.code).toBe("authentication_required");
    expect(captured.length).toBe(1);
    expect(calls.selectCredential.length).toBe(1);
  });

  it("all five controls stop after one attempt on retryable failures", async () => {
    const retryable503 = {
      ok: true,
      status: 503,
      rawHeaders: [["content-type", "application/json"]],
      body: utf8('{"errorCode":"temporarily_unavailable"}'),
    };
    const bodies = {
      authChallenge: utf8("{}"),
      authExchange: utf8(`{"challengeId":"${PROFILE_P}","idToken":"t"}`),
      authRefresh: utf8('{"refreshToken":"t"}'),
      authLogout: utf8('{"refreshToken":"t"}'),
      accountStatus: utf8(
        `{"accountId":"${ACCOUNT_A}","challengeId":"${PROFILE_P}","idToken":"t"}`,
      ),
    };
    const keys = { authExchange: AUTH_KEY, authRefresh: AUTH_KEY };
    expect(keys.authExchange).toBe(AUTH_KEY);
    const methods = [
      ["authChallenge", [nullAccountBinding(), bodies.authChallenge]],
      [
        "authExchange",
        [nullAccountBinding(), bodies.authExchange, "44444444-4444-4444-4444-444444444444"],
      ],
      [
        "authRefresh",
        [nullAccountBinding(), bodies.authRefresh, "44444444-4444-4444-4444-444444444444"],
      ],
      ["authLogout", [testBinding(), bodies.authLogout]],
      ["accountStatus", [testBinding(), bodies.accountStatus]],
    ];
    for (const [method, args] of methods) {
      const { handle, captured } = hookTransport({
        script: [retryable503, retryable503],
        budgets: { maxAttempts: 5 },
      });
      const error = await catchTransportError(handle[method](...args, freshSignal()));
      expect({ method, code: error.code, attempts: captured.length }).toEqual({
        method,
        code: "temporarily_unavailable",
        attempts: 1,
      });
    }
  });
});

describe("shared ordered trace across two attempts", () => {
  it("records the full cross-hook order with frozen summaries and attempt numbers", async () => {
    const trace = [];
    const clockHandle = makeClock(1000);
    const { sleeper } = makeSleeper(clockHandle);
    const { session } = makeSession({
      checkBinding: async (point) => {
        trace.push(`check:${point}`);
      },
      selectCredential: async (binding, route) => {
        trace.push(`select:${route}`);
        return { bearerToken: BEARER, forBinding: binding };
      },
      beforeDispatch: async (binding, summary) => {
        trace.push(`before:${summary.routeLabel}#${summary.attempt}`);
        expect(Object.isFrozen(summary)).toBe(true);
      },
      isCurrent: () => {
        trace.push("current");
        return true;
      },
    });
    const { wire, captured } = makeWire([
      () => {
        trace.push("wire#1");
        return { ok: false, kind: "network", status: null };
      },
      () => {
        trace.push("wire#2");
        return draftSuccess();
      },
    ]);
    const tracingSleeper = {
      sleep: async (ms, signal) => {
        trace.push(`sleep:${ms}`);
        await sleeper.sleep(ms, signal);
      },
    };
    const handle = createBackendTransport(baseConfig(), {
      ...baseDeps(),
      session,
      clock: clockHandle.clock,
      sleeper: tracingSleeper,
      wire,
    });
    const result = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.status).toBe(201);
    // Required temporal ordering (adjudicated): the public interface demands
    // captured-binding checks before each handoff and before delivery, with
    // abort/deadline rechecks. It does NOT cap incidental same-binding
    // synchronous guard calls, so the trace asserts order/attempts/counts
    // with a minimum sync-guard floor instead of an exact call count.
    const withoutSyncGuards = trace.filter((entry) => entry !== "current");
    expect(withoutSyncGuards).toEqual([
      "check:pre-send",
      "select:create_draft",
      "before:create_draft#1",
      "wire#1",
      "sleep:500",
      "check:pre-send",
      "select:create_draft",
      "before:create_draft#2",
      "wire#2",
      "check:pre-delivery",
    ]);
    const syncGuards = trace.filter((entry) => entry === "current").length;
    expect(syncGuards).toBeGreaterThanOrEqual(3);
    // Positional floor: each handoff and the delivery gate must show at
    // least one synchronous guard in its window; extras are permitted.
    const windowHasGuard = (from, to) => {
      const start = trace.indexOf(from);
      const end = trace.indexOf(to, start + 1);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      expect(trace.slice(start + 1, end)).toContain("current");
    };
    windowHasGuard("before:create_draft#1", "wire#1");
    windowHasGuard("before:create_draft#2", "wire#2");
    const deliveryAt = trace.lastIndexOf("check:pre-delivery");
    expect(deliveryAt).toBeGreaterThanOrEqual(0);
    expect(trace.slice(deliveryAt + 1)).toContain("current");
    expect(trace[0]).toBe("check:pre-send");
    expect(trace[trace.length - 1]).toBe("current");
    expect(captured.length).toBe(2);
  });

  it("hooks keep the SAME frozen capture after caller mutates its binding", async () => {
    const seen = [];
    const { session } = makeSession({
      checkBinding: async (point, binding) => {
        seen.push(binding);
      },
      selectCredential: async (binding) => {
        seen.push(binding);
        return { bearerToken: BEARER, forBinding: binding };
      },
      beforeDispatch: async (binding) => {
        seen.push(binding);
      },
    });
    const { wire, captured } = makeWire([draftSuccess()]);
    const handle = createBackendTransport(baseConfig(), { ...baseDeps(), session, wire });
    const callerBinding = testBinding();
    const pending = handle.createDraft(
      callerBinding,
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      freshSignal(),
    );
    pending.catch(() => {});
    callerBinding.accountUuid = ACCOUNT_B;
    callerBinding.sessionGeneration = 99;
    const result = await pending;
    expect(result.status).toBe(201);
    expect(new Set(seen).size).toBe(1);
    expect(seen[0].accountUuid).toBe(ACCOUNT_A);
    expect(seen[0].sessionGeneration).toBe(0);
    expect(Object.isFrozen(seen[0])).toBe(true);
    const authorization = captured[0].request.headers.find(([name]) => name === "authorization");
    expect(authorization[1]).toBe(`Bearer ${BEARER}`);
  });
});

describe("deferred and late hook races", () => {
  it("generation change during select on retry stops as uncertain auth failure", async () => {
    const seen = { count: 0 };
    const { handle, captured } = hookTransport({
      script: [{ ok: false, kind: "network", status: null }, draftSuccess()],
      sessionOverrides: {
        selectCredential: async (binding) => {
          seen.count += 1;
          if (seen.count === 1) return { bearerToken: BEARER, forBinding: binding };
          return { bearerToken: BEARER, forBinding: { ...binding, sessionGeneration: 7 } };
        },
      },
      budgets: { maxAttempts: 3 },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("authentication_required");
    expect(error.outcomeUnknown).toBe(true);
    expect(error.dispatched).toBe(true);
    expect(captured.length).toBe(1);
  });

  it("late hook resolution after caller abort never dispatches", async () => {
    let openGate;
    let entered = false;
    const gate = new Promise((resolve) => {
      openGate = resolve;
    });
    const { handle, captured } = hookTransport({
      script: [draftSuccess()],
      sessionOverrides: {
        checkBinding: async () => {
          entered = true;
          await gate;
        },
      },
    });
    const controller = new AbortController();
    const pending = handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      controller.signal,
    );
    pending.catch(() => {});
    // Await the entered barrier so the abort lands while the hook is held,
    // proving the test reaches its claimed boundary before settling.
    while (!entered) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    controller.abort();
    openGate();
    const error = await catchTransportError(pending);
    expect(error.code).toBe("operation_interrupted");
    expect(entered).toBe(true);
    expect(captured.length).toBe(0);
    expect(error.dispatched).toBe(false);
  });

  it("late hook rejection after abort stays a quiet interruption", async () => {
    let openGate;
    let entered = false;
    const gate = new Promise((resolve, reject) => {
      openGate = () => reject(new Error("synthetic-qa late hook failure"));
    });
    const { handle, captured } = hookTransport({
      script: [draftSuccess()],
      sessionOverrides: {
        beforeDispatch: async () => {
          entered = true;
          await gate;
        },
      },
    });
    const controller = new AbortController();
    const pending = handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      controller.signal,
    );
    pending.catch(() => {});
    while (!entered) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    controller.abort();
    openGate();
    const error = await catchTransportError(pending);
    expect(error.code).toBe("operation_interrupted");
    expect(entered).toBe(true);
    expect(captured.length).toBe(0);
  });

  it("generation change during an awaited hook is stopped by the final veto", async () => {
    // The owner rotates generations while selectCredential is held open; the
    // final synchronous isCurrent veto then refuses the stale invocation.
    let releaseSelect;
    let selectEntered = false;
    const selectGate = new Promise((resolve) => {
      releaseSelect = resolve;
    });
    let liveGeneration = 0;
    const { handle, captured } = hookTransport({
      script: [draftSuccess()],
      sessionOverrides: {
        selectCredential: async (binding) => {
          selectEntered = true;
          await selectGate;
          return { bearerToken: BEARER, forBinding: binding };
        },
        isCurrent: () => liveGeneration === 0,
      },
    });
    const pending = handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      freshSignal(),
    );
    pending.catch(() => {});
    while (!selectEntered) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    liveGeneration = 7;
    releaseSelect();
    const error = await catchTransportError(pending);
    expect(error.code).toBe("operation_interrupted");
    expect(selectEntered).toBe(true);
    expect(captured.length).toBe(0);
  });

  it("pre-delivery fence suppresses a backend error as uncertain", async () => {
    // A fenced/suppressed result after dispatch is conservatively uncertain
    // (approved section 8), even when the received error was well-formed.
    const { handle, captured } = hookTransport({
      script: [okJson(429, { errorCode: "rate_limited" }), draftSuccess()],
      sessionOverrides: { isCurrentAnswers: [true, false] },
      budgets: { maxAttempts: 3 },
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, freshSignal()),
    );
    expect(error.code).toBe("operation_interrupted");
    expect(error.outcomeUnknown).toBe(true);
    expect(error.dispatched).toBe(true);
    expect(captured.length).toBe(1);
  });

  it("late sender results after abort are suppressed without delivery", async () => {
    let release;
    let senderEntered = false;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const { handle, captured } = hookTransport({
      script: [
        async () => {
          senderEntered = true;
          await gate;
          return draftSuccess();
        },
      ],
      budgets: { maxAttempts: 1 },
    });
    const controller = new AbortController();
    const pending = handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      controller.signal,
    );
    pending.catch(() => {});
    while (!senderEntered) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    controller.abort();
    release();
    const error = await catchTransportError(pending);
    expect(error.code).toBe("operation_interrupted");
    expect(error.outcomeUnknown).toBe(true);
    expect(error.dispatched).toBe(true);
    expect(senderEntered).toBe(true);
    expect(captured.length).toBe(1);
  });

  it("late sender rejection after abort never advances the call", async () => {
    let release;
    let senderEntered = false;
    const gate = new Promise((resolve, reject) => {
      release = () => reject(new Error("synthetic-qa late sender failure"));
    });
    const { handle, captured } = hookTransport({
      script: [
        async () => {
          senderEntered = true;
          await gate;
          return draftSuccess();
        },
      ],
      budgets: { maxAttempts: 1 },
    });
    const controller = new AbortController();
    const pending = handle.createDraft(
      testBinding(),
      ROUTINE_R,
      draftBody(),
      RESOURCE_KEY,
      controller.signal,
    );
    pending.catch(() => {});
    while (!senderEntered) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    controller.abort();
    release();
    const error = await catchTransportError(pending);
    expect(error.code).toBe("operation_interrupted");
    expect(error.outcomeUnknown).toBe(true);
    expect(senderEntered).toBe(true);
    expect(captured.length).toBe(1);
  });
});

describe("control credential privacy in failures", () => {
  it("exchange failures never echo challenge, token or auth key material", async () => {
    const idToken = "synthetic-qa-id-token-abcdef.01";
    const { handle, captured } = hookTransport({
      script: [
        {
          ok: true,
          status: 401,
          rawHeaders: [["content-type", "application/json"]],
          body: utf8('{"errorCode":"invalid_google_credential"}'),
        },
      ],
    });
    const error = await catchTransportError(
      handle.authExchange(
        nullAccountBinding(),
        utf8(`{"challengeId":"${CHALLENGE_C}","idToken":"${idToken}"}`),
        AUTH_KEY,
        freshSignal(),
      ),
    );
    // The privacy scenario ran for real: the wire was invoked and answered.
    expect(captured.length).toBe(1);
    expect(error.status).toBe(401);
    expect(error.code).toBe("authentication_required");
    const serialized = JSON.stringify(error);
    expect(serialized.includes(idToken)).toBe(false);
    expect(serialized.includes(CHALLENGE_C)).toBe(false);
    expect(serialized.includes(AUTH_KEY)).toBe(false);
  });
});

describe("post-guard abort/deadline recheck (sync guards consume time)", () => {
  it("rechecks the deadline after a true final guard that consumed time", async () => {
    // The synchronous fence itself advances the manual clock past the total
    // budget, then permits sending. Handoff preparation must recheck and
    // refuse to dispatch: only the network_error oracle can pass.
    const clockHandle = makeClock(1000);
    const { session } = makeSession({
      isCurrent: () => {
        clockHandle.advance(99999);
        return true;
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

  it("rechecks abort after a true final guard racing abort", async () => {
    // The synchronous fence aborts the caller signal, then permits sending.
    // The post-guard recheck must observe the abort and refuse to dispatch.
    const controller = new AbortController();
    const { session } = makeSession({
      isCurrent: () => {
        controller.abort();
        return true;
      },
    });
    const { wire, captured } = makeWire([draftSuccess()]);
    const handle = createBackendTransport(baseConfig(), {
      ...baseDeps(),
      session,
      wire,
    });
    const error = await catchTransportError(
      handle.createDraft(testBinding(), ROUTINE_R, draftBody(), RESOURCE_KEY, controller.signal),
    );
    expect(error.code).toBe("operation_interrupted");
    expect(captured.length).toBe(0);
    expect(error.dispatched).toBe(false);
  });
});

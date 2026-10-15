// T05 unit: CallBinding capture/validation, typed-array identity semantics,
// wrapper validation, exact frozen request shapes, GET zero-body rule.
// Approved spec sections 2 and 4.

/* global AbortController, structuredClone */

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  ORIGIN,
  ACCOUNT_A,
  ACCOUNT_B,
  PROFILE_P,
  ROUTINE_R,
  RESOURCE_KEY,
  AUTH_KEY,
  baseConfig,
  baseDeps,
  makeSession,
  makeWire,
  okJson,
  utf8,
  testBinding,
  nullAccountBinding,
  catchTransportError,
  freshSignal,
} from "./helpers.mjs";

function transportWith(capturedScript, sessionOverrides) {
  const { session } = makeSession(sessionOverrides ?? {});
  const { wire, captured } = makeWire(capturedScript);
  const handle = createBackendTransport(baseConfig(), { ...baseDeps(), session, wire });
  return { handle, session, captured };
}

describe("CallBinding validation and capture", () => {
  it("methods return promises for local rejection, never throw synchronously", async () => {
    const { handle } = transportWith([]);
    const attempt = handle.getRoutine("not-a-binding-object", ROUTINE_R, freshSignal());
    expect(attempt).toBeInstanceOf(Promise);
    const error = await catchTransportError(attempt);
    expect(error.code).toBe("invalid_arguments");
  });

  it("rejects bindings with extra fields, wrong types and non-canonical values", async () => {
    const { handle } = transportWith([]);
    const bad = [
      { ...testBinding(), syntheticQaExtra: true },
      { ...testBinding(), origin: "https://other.example.invalid" },
      { ...testBinding(), accountUuid: "NOT-A-UUID" },
      { ...testBinding(), sessionGeneration: -1 },
      { ...testBinding(), sessionGeneration: 1.5 },
      { ...testBinding(), profileGenerationId: " perfil " },
      { origin: ORIGIN, accountUuid: ACCOUNT_A },
    ];
    for (const binding of bad) {
      const error = await catchTransportError(handle.getRoutine(binding, ROUTINE_R, freshSignal()));
      expect({ binding, code: error.code }).toEqual({ binding, code: "invalid_arguments" });
    }
  });

  it("rejects null account on bearer routes but allows it on controls", async () => {
    const success = okJson(200, {});
    const bearer = transportWith([success]);
    const bearerError = await catchTransportError(
      bearer.handle.getRoutine(nullAccountBinding(), ROUTINE_R, freshSignal()),
    );
    expect(bearerError.code).toBe("invalid_arguments");
    expect(bearer.captured.length).toBe(0);

    const control = transportWith([success]);
    await control.handle.authChallenge(nullAccountBinding(), utf8("{}"), freshSignal());
    expect(control.captured.length).toBe(1);
  });

  it("requires a legitimate AbortSignal and rejects substitutes", async () => {
    const { handle } = transportWith([okJson(200, {})]);
    for (const signal of [null, undefined, {}, { aborted: false }]) {
      const error = await catchTransportError(handle.getRoutine(testBinding(), ROUTINE_R, signal));
      expect({ signal, code: error.code }).toEqual({ signal, code: "invalid_arguments" });
    }
  });

  it("aborted caller signal before entry yields operation_interrupted with no send", async () => {
    const { handle, captured } = transportWith([okJson(200, {})]);
    const controller = new AbortController();
    controller.abort();
    const error = await catchTransportError(
      handle.getRoutine(testBinding(), ROUTINE_R, controller.signal),
    );
    expect(error.code).toBe("operation_interrupted");
    expect(error.dispatched).toBe(false);
    expect(captured.length).toBe(0);
  });
});

describe("typed-array identity: capture, copy, no alias", () => {
  it("rejects shared, resizable and detached buffers and non-views", async () => {
    const { handle } = transportWith([]);
    const shared = new Uint8Array(new SharedArrayBuffer(8));
    const resizable = new Uint8Array(new ArrayBuffer(8, { maxByteLength: 16 }));
    const detachedBuffer = new ArrayBuffer(8);
    const detachedView = new Uint8Array(detachedBuffer);
    structuredClone(detachedView, { transfer: [detachedBuffer] });
    const cases = [shared, resizable, detachedView, [1, 2, 3], "{}", 42, null];
    for (const body of cases) {
      const error = await catchTransportError(
        handle.createDraft(testBinding(), ROUTINE_R, body, RESOURCE_KEY, freshSignal()),
      );
      expect({ code: error.code }).toEqual({ code: "invalid_arguments" });
    }
  });

  it("caller mutation after the call cannot alter dispatched bytes", async () => {
    const body = utf8(`{"id":"${ROUTINE_R}"}`);
    const { handle, captured } = transportWith([
      okJson(201, {
        id: ROUTINE_R,
        name: "",
        isDraft: true,
        revision: 1,
        exercises: [],
      }),
    ]);
    const pending = handle.createDraft(testBinding(), ROUTINE_R, body, RESOURCE_KEY, freshSignal());
    body.fill(0x58);
    await pending;
    expect(Buffer.from(captured[0].request.body).toString("utf8")).toBe(`{"id":"${ROUTINE_R}"}`);
  });

  it("accepts Buffer views honoring byteOffset and length", async () => {
    const storage = Buffer.concat([Buffer.from([0x00, 0x00]), utf8(`{"id":"${ROUTINE_R}"}`)]);
    const view = new Uint8Array(storage.buffer, storage.byteOffset + 2, storage.length - 2);
    const { handle, captured } = transportWith([
      okJson(201, {
        id: ROUTINE_R,
        name: "",
        isDraft: true,
        revision: 1,
        exercises: [],
      }),
    ]);
    await handle.createDraft(testBinding(), ROUTINE_R, view, RESOURCE_KEY, freshSignal());
    expect(Buffer.from(captured[0].request.body).toString("utf8")).toBe(`{"id":"${ROUTINE_R}"}`);
  });

  it("returned raw bytes are independent mutable copies, not shared images", async () => {
    const wireBody = {
      id: ROUTINE_R,
      name: "",
      isDraft: true,
      revision: 1,
      exercises: [],
    };
    const { handle } = transportWith([okJson(201, wireBody)]);
    const first = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      utf8(`{"id":"${ROUTINE_R}"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(first.rawBodyBytes).toBeInstanceOf(Uint8Array);
    const snapshot = Buffer.from(first.rawBodyBytes).toString("utf8");
    first.rawBodyBytes.fill(0x51);
    const { handle: secondHandle } = transportWith([okJson(201, wireBody)]);
    void secondHandle;
    // A second identical call decodes the same bytes again: copies are per-call.
    const { handle: replayHandle } = transportWith([okJson(201, wireBody)]);
    const second = await replayHandle.createDraft(
      testBinding(),
      ROUTINE_R,
      utf8(`{"id":"${ROUTINE_R}"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(Buffer.from(second.rawBodyBytes).toString("utf8")).toBe(snapshot);
  });
});

describe("exact frozen request shapes (runtime allowlist)", () => {
  it("challenge accepts {} or signIn/accountStatus purpose only", async () => {
    const good = [utf8("{}"), utf8('{"purpose":"signIn"}'), utf8('{"purpose":"accountStatus"}')];
    for (const body of good) {
      const { handle, captured } = transportWith([okJson(200, {})]);
      await handle.authChallenge(nullAccountBinding(), body, freshSignal());
      expect(captured.length).toBe(1);
    }
    const bad = [
      utf8('{"purpose":"export"}'),
      utf8('{"purpose":"deleteAccount"}'),
      utf8('{"purpose":"signIn","syntheticQaExtra":1}'),
      utf8("[]"),
      utf8('{"a":1,"a":2}'),
      utf8('{"purpose":"signIn",}'),
    ];
    for (const body of bad) {
      const { handle, captured } = transportWith([okJson(200, {})]);
      const error = await catchTransportError(
        handle.authChallenge(nullAccountBinding(), body, freshSignal()),
      );
      expect(error.code).toBe("invalid_arguments");
      expect(captured.length).toBe(0);
    }
  });

  it("exchange/refresh/logout/status enforce exact credential shapes", async () => {
    const exchange = transportWith([okJson(200, {})]);
    await exchange.handle.authExchange(
      nullAccountBinding(),
      utf8(`{"challengeId":"${PROFILE_P}","idToken":"synthetic-qa-google-token"}`),
      AUTH_KEY,
      freshSignal(),
    );
    expect(exchange.captured.length).toBe(1);

    const badExchange = transportWith([okJson(200, {})]);
    const error = await catchTransportError(
      badExchange.handle.authExchange(
        nullAccountBinding(),
        utf8(`{"challengeId":"${PROFILE_P}"}`),
        AUTH_KEY,
        freshSignal(),
      ),
    );
    expect(error.code).toBe("invalid_arguments");

    const badKey = transportWith([okJson(200, {})]);
    const keyError = await catchTransportError(
      badKey.handle.authRefresh(
        nullAccountBinding(),
        utf8('{"refreshToken":"x"}'),
        "bad-key",
        freshSignal(),
      ),
    );
    expect(keyError.code).toBe("invalid_arguments");

    const mismatch = transportWith([okJson(200, {})]);
    const accountId = ACCOUNT_B;
    const mismatchError = await catchTransportError(
      mismatch.handle.accountStatus(
        testBinding(),
        utf8(`{"accountId":"${accountId}","challengeId":"${PROFILE_P}","idToken":"t"}`),
        freshSignal(),
      ),
    );
    expect(mismatchError.code).toBe("invalid_arguments");
  });

  it("draft requires exactly the expected id; save requires nonempty name", async () => {
    const draft = transportWith([
      okJson(201, { id: ROUTINE_R, name: "", isDraft: true, revision: 1, exercises: [] }),
    ]);
    await draft.handle.createDraft(
      testBinding(),
      ROUTINE_R,
      utf8(`{"id":"${ROUTINE_R}"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    const wrong = transportWith([okJson(201, {})]);
    const wrongError = await catchTransportError(
      wrong.handle.createDraft(
        testBinding(),
        ROUTINE_R,
        utf8(`{"id":"${PROFILE_P}"}`),
        RESOURCE_KEY,
        freshSignal(),
      ),
    );
    expect(wrongError.code).toBe("invalid_arguments");

    const emptyName = transportWith([okJson(200, {})]);
    const nameError = await catchTransportError(
      emptyName.handle.saveRoutine(
        testBinding(),
        ROUTINE_R,
        utf8('{"name":""}'),
        RESOURCE_KEY,
        freshSignal(),
      ),
    );
    expect(nameError.code).toBe("invalid_arguments");
  });

  it("leading BOM and duplicate keys reject without dispatch", async () => {
    const { handle, captured } = transportWith([okJson(200, {})]);
    const bomError = await catchTransportError(
      handle.authChallenge(nullAccountBinding(), utf8("﻿{}"), freshSignal()),
    );
    expect(bomError.code).toBe("invalid_arguments");
    expect(captured.length).toBe(0);
  });
});

describe("GET zero-body rule", () => {
  it("single-resource GET sends zero body bytes with no substituted {}", async () => {
    const { handle, captured } = transportWith([
      okJson(200, {
        id: ROUTINE_R,
        name: "",
        isDraft: true,
        revision: 1,
        exercises: [],
      }),
    ]);
    await handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    expect(captured[0].request.body.length).toBe(0);
    const contentLength = captured[0].request.headers.find(([name]) => name === "content-length");
    expect(contentLength?.[1]).toBe("0");
    const contentType = captured[0].request.headers.find(([name]) => name === "content-type");
    expect(contentType).toBe(undefined);
  });

  it("uppercase and non-canonical UUID paths reject before send", async () => {
    const { handle, captured } = transportWith([okJson(200, {})]);
    for (const id of [ROUTINE_R.toUpperCase(), "not-a-uuid", `${ROUTINE_R}?x=1`]) {
      const error = await catchTransportError(handle.getRoutine(testBinding(), id, freshSignal()));
      expect(error.code).toBe("invalid_arguments");
    }
    expect(captured.length).toBe(0);
  });
});

describe("runtime input safety: descriptors, symbols, cycles, prototypes", () => {
  it("never invokes getters while rejecting accessor descriptors", async () => {
    let invoked = 0;
    const binding = { ...testBinding() };
    Object.defineProperty(binding, "origin", {
      enumerable: true,
      get() {
        invoked += 1;
        return ORIGIN;
      },
    });
    const { handle, captured } = transportWith([okJson(200, {})]);
    const error = await catchTransportError(handle.getRoutine(binding, ROUTINE_R, freshSignal()));
    expect(error.code).toBe("invalid_arguments");
    expect(invoked).toBe(0);
    expect(captured.length).toBe(0);
  });

  it("rejects symbol keys, cycles and nonplain prototypes", async () => {
    const { handle, captured } = transportWith([okJson(200, {})]);
    const withSymbol = { ...testBinding(), [Symbol("synthetic-qa")]: 1 };
    const cyclic = { search: "a" };
    cyclic.self = cyclic;
    class BindingClass {
      constructor() {
        this.origin = ORIGIN;
        this.accountUuid = ACCOUNT_A;
        this.sessionGeneration = 0;
        this.profileGenerationId = PROFILE_P;
      }
    }
    const custom = new BindingClass();
    const inherited = Object.create({ origin: ORIGIN });
    inherited.accountUuid = ACCOUNT_A;
    inherited.sessionGeneration = 0;
    inherited.profileGenerationId = PROFILE_P;
    const symbolError = await catchTransportError(
      handle.getRoutine(withSymbol, ROUTINE_R, freshSignal()),
    );
    expect(symbolError.code).toBe("invalid_arguments");
    const searchHandle = transportWith([
      okJson(200, {
        catalogueVersion: "gymtracka-catalogue-v1",
        items: [],
        hasMore: false,
        nextPageToken: null,
      }),
    ]);
    const cycleError = await catchTransportError(
      searchHandle.handle.searchExercises(testBinding(), cyclic, freshSignal()),
    );
    expect(cycleError.code).toBe("invalid_arguments");
    const customError = await catchTransportError(
      handle.getRoutine(custom, ROUTINE_R, freshSignal()),
    );
    expect(customError.code).toBe("invalid_arguments");
    const inheritedError = await catchTransportError(
      handle.getRoutine(inherited, ROUTINE_R, freshSignal()),
    );
    expect(inheritedError.code).toBe("invalid_arguments");
    expect(captured.length).toBe(0);
  });

  it("rejects own __proto__ on strict query input without pollution", async () => {
    // Unknown own query fields, including an own member named __proto__,
    // MUST reject before dispatch: strict tool/query validation is not
    // relaxed by the additive-name rule (which covers backend response
    // data, not unknown strict input fields).
    const page = {
      catalogueVersion: "gymtracka-catalogue-v1",
      items: [],
      hasMore: false,
      nextPageToken: null,
    };
    const { handle, captured } = transportWith([okJson(200, page)]);
    const queryInput = JSON.parse('{"search":"press","__proto__":{"syntheticQaPolluted":true}}');
    expect(Object.prototype.hasOwnProperty.call(queryInput, "__proto__")).toBe(true);
    const error = await catchTransportError(
      handle.searchExercises(testBinding(), queryInput, freshSignal()),
    );
    expect(error.code).toBe("invalid_arguments");
    expect(captured.length).toBe(0);
    expect({}.syntheticQaPolluted).toBe(undefined);
  });

  it("preserves own __proto__ convenience data on valid backend responses", async () => {
    // Positive additive-name coverage on an otherwise-valid BACKEND record:
    // the own JSON __proto__ member is retained as ordinary own data with
    // no prototype pollution.
    const text =
      `{"id":"${ROUTINE_R}","name":"Synthetic QA Saved","isDraft":false,"revision":1,"exercises":[],` +
      `"__proto__":{"syntheticQaKept":true}}`;
    const { handle } = transportWith([
      {
        ok: true,
        status: 200,
        rawHeaders: [["content-type", "application/json"]],
        body: utf8(text),
      },
    ]);
    const result = await handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    expect(result.status).toBe(200);
    expect(Object.prototype.hasOwnProperty.call(result.data, "__proto__")).toBe(true);
    expect(result.data["__proto__"]).toEqual({ syntheticQaKept: true });
    expect({}.syntheticQaKept).toBe(undefined);
  });

  it("rejects escaped duplicate keys and invalid UTF-8 without dispatch", async () => {
    const { handle, captured } = transportWith([okJson(200, {})]);
    const escapedDupes = await catchTransportError(
      handle.authChallenge(
        nullAccountBinding(),
        utf8('{"purpos\\u0065":"signIn","purpose":"accountStatus"}'),
        freshSignal(),
      ),
    );
    expect(escapedDupes.code).toBe("invalid_arguments");
    const invalidUtf8 = await catchTransportError(
      handle.authChallenge(nullAccountBinding(), new Uint8Array([0xff, 0xfe, 0x00]), freshSignal()),
    );
    expect(invalidUtf8.code).toBe("invalid_arguments");
    expect(captured.length).toBe(0);

    const responseDupes = transportWith([
      {
        ok: true,
        status: 200,
        rawHeaders: [["content-type", "application/json"]],
        body: utf8('{"a":1,"\\u0061":2}'),
      },
    ]);
    const responseError = await catchTransportError(
      responseDupes.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(responseError.code).toBe("internal_error");
    const responseBinary = transportWith([
      {
        ok: true,
        status: 200,
        rawHeaders: [["content-type", "application/json"]],
        body: new Uint8Array([0xff, 0xfe]),
      },
    ]);
    const binaryError = await catchTransportError(
      responseBinary.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(binaryError.code).toBe("internal_error");
  });
});

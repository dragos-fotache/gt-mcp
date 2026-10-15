// T05 unit: exact export inventory, frozen default budgets, identity version,
// factory validation (origin/budgets/flags/TLS-env) and inert import/factory.
// Derived solely from approved spec sections 1-3 and 7.

/* global TextEncoder */

import { describe, it, expect } from "vitest";
import * as transportModule from "../../../dist/http/index.js";
import {
  createBackendTransport,
  TransportError,
  isTransportError,
  DEFAULT_TRANSPORT_BUDGETS,
  TRANSPORT_IDENTITY_VERSION,
} from "../../../dist/http/index.js";
import { ORIGIN, baseConfig, baseDeps } from "./helpers.mjs";
import {
  makeSession,
  makeWire,
  okJson,
  bundledExerciseWire,
  searchPageWire,
  testBinding,
  freshSignal,
} from "./helpers.mjs";
import { readFileSync } from "node:fs";

const EXPECTED_BUDGETS = {
  maxRequestBytes: 262144,
  maxRequestTargetBytes: 4096,
  maxResponseBytes: 1048576,
  maxProjectedResultBytes: 1048576,
  maxHeadBytes: 32768,
  maxHeaderCount: 100,
  perAttemptTimeoutMs: 10000,
  totalDeadlineMs: 60000,
  maxAttempts: 3,
  baseRetryDelayMs: 500,
  maxRetryDelayMs: 5000,
};

const HANDLE_METHODS = [
  "accountStatus",
  "authChallenge",
  "authExchange",
  "authLogout",
  "authRefresh",
  "createDraft",
  "getExercise",
  "getRoutine",
  "getWorkout",
  "listRoutines",
  "listWorkouts",
  "populateDraft",
  "saveRoutine",
  "searchExercises",
].sort();

describe("exact runtime export inventory", () => {
  it("exposes exactly the five approved runtime exports", () => {
    expect(Object.keys(transportModule).sort()).toEqual([
      "DEFAULT_TRANSPORT_BUDGETS",
      "TRANSPORT_IDENTITY_VERSION",
      "TransportError",
      "createBackendTransport",
      "isTransportError",
    ]);
  });

  it("publishes the transport identity mechanism marker", () => {
    expect(TRANSPORT_IDENTITY_VERSION).toBe("gymtracka-transport-v1");
  });

  it("publishes frozen default budgets matching the approved table", () => {
    expect({ ...DEFAULT_TRANSPORT_BUDGETS }).toEqual(EXPECTED_BUDGETS);
    expect(Object.isFrozen(DEFAULT_TRANSPORT_BUDGETS)).toBe(true);
  });
});

describe("handle shape: exactly 14 methods, no generic sender or close", () => {
  it("exposes the approved method inventory only", () => {
    const handle = createBackendTransport(baseConfig(), baseDeps());
    expect(Object.keys(handle).sort()).toEqual(HANDLE_METHODS);
    expect("close" in handle).toBe(false);
    expect("send" in handle).toBe(false);
    expect("sendRaw" in handle).toBe(false);
  });
});

describe("factory origin validation", () => {
  const badOrigins = [
    "https://transport-qa.example.invalid/a", // path
    "https://transport-qa.example.invalid/a/..", // traversal
    "https://transport-qa.example.invalid/%2e", // encoded dot
    "https://user@transport-qa.example.invalid/", // userinfo
    "https://user:@transport-qa.example.invalid/", // empty userinfo markers
    "https://transport-qa.example.invalid/?q=1", // query marker
    "https://transport-qa.example.invalid/#f", // fragment marker
    "HTTPS://transport-qa.example.invalid/", // uppercase scheme
    "https://transport-qa.example.invalid\\@evil.example/", // backslash
    "https://transport-qa.example .invalid/", // whitespace
    "https://transport-qa.example.invalid:/", // empty port
    "https://transport-qa.example.invalid:0/", // zero port
    "https://transport-qa.example.invalid:99999/", // out-of-range port
    "https://transport-qa.example.invalid:abc/", // nondecimal port
    "https://transport-qa.example.invalid//", // extra slash
    "https://transport-qa.example.invalid./", // trailing dot host
    "http://transport-qa.example.invalid/", // http without test flag
    "http://localhost:18080/", // DNS name in test mode even with flag
    "http://127.0.0.1.example.invalid/", // DNS-selected lookalike
  ];

  for (const origin of badOrigins) {
    it(`rejects ${origin}`, () => {
      const config =
        origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1.example")
          ? { origin, allowInsecureLoopback: true }
          : { origin };
      let error = null;
      try {
        createBackendTransport(config, baseDeps());
      } catch (thrown) {
        error = thrown;
      }
      expect(error).not.toBe(null);
      expect(isTransportError(error)).toBe(true);
      expect(error).toBeInstanceOf(TransportError);
      expect(error.code).toBe("invalid_arguments");
    });
  }

  it("accepts canonical https origin with single root slash and default-port removal", () => {
    const withSlash = createBackendTransport(
      { origin: "https://transport-qa.example.invalid/" },
      baseDeps(),
    );
    expect(Object.keys(withSlash).sort()).toEqual(HANDLE_METHODS);
    const withPort = createBackendTransport(
      { origin: "https://transport-qa.example.invalid:443/" },
      baseDeps(),
    );
    expect(Object.keys(withPort).sort()).toEqual(HANDLE_METHODS);
  });

  it("accepts literal loopback http only with explicit strict-true flag", () => {
    const handle = createBackendTransport(
      { origin: "http://127.0.0.1:18080", allowInsecureLoopback: true },
      baseDeps(),
    );
    expect(Object.keys(handle).sort()).toEqual(HANDLE_METHODS);
  });

  it("rejects non-boolean allowInsecureLoopback coercion", () => {
    for (const flag of [1, "true", null]) {
      let error = null;
      try {
        createBackendTransport(
          { origin: "http://127.0.0.1:18080", allowInsecureLoopback: flag },
          baseDeps(),
        );
      } catch (thrown) {
        error = thrown;
      }
      expect(error?.code).toBe("invalid_arguments");
    }
  });

  it("restricts testCaPem to literal loopback https fixtures", () => {
    const pem = new TextEncoder().encode("synthetic-qa-test-only-pem");
    const loopback = createBackendTransport(
      { origin: "https://127.0.0.1:18443", testCaPem: pem },
      baseDeps(),
    );
    expect(Object.keys(loopback).sort()).toEqual(HANDLE_METHODS);
    let error = null;
    try {
      createBackendTransport({ origin: ORIGIN, testCaPem: pem }, baseDeps());
    } catch (thrown) {
      error = thrown;
    }
    expect(error?.code).toBe("invalid_arguments");
  });
});

describe("factory budget validation", () => {
  it("rejects below-minimum, above-maximum and unknown/coerced fields", () => {
    const cases = [
      { maxRequestBytes: 63 },
      { maxRequestBytes: 16777217 },
      { maxAttempts: 0 },
      { maxAttempts: 6 },
      { maxHeaderCount: 9 },
      { maxHeadBytes: 4095 },
      { perAttemptTimeoutMs: 49 },
      { totalDeadlineMs: 99 },
      { baseRetryDelayMs: 0, maxRetryDelayMs: -1 },
      { baseRetryDelayMs: 6000, maxRetryDelayMs: 5000 },
      { maxRequestBytes: undefined },
      { maxRequestBytes: null },
      { maxRequestBytes: "262144" },
      { maxAttempts: 3, syntheticQaExtraField: 1 },
    ];
    for (const budgets of cases) {
      let error = null;
      try {
        createBackendTransport({ origin: ORIGIN, budgets }, baseDeps());
      } catch (thrown) {
        error = thrown;
      }
      expect({ budgets, code: error?.code }).toEqual({
        budgets,
        code: "invalid_arguments",
      });
    }
  });

  it("accepts exact-boundary budgets and partial overrides", () => {
    const handle = createBackendTransport(
      {
        origin: ORIGIN,
        budgets: {
          maxRequestBytes: 64,
          maxRequestTargetBytes: 64,
          maxResponseBytes: 64,
          maxProjectedResultBytes: 64,
          maxHeadBytes: 4096,
          maxHeaderCount: 10,
          perAttemptTimeoutMs: 50,
          totalDeadlineMs: 100,
          maxAttempts: 1,
          baseRetryDelayMs: 0,
          maxRetryDelayMs: 0,
        },
      },
      baseDeps(),
    );
    expect(Object.keys(handle).sort()).toEqual(HANDLE_METHODS);
  });
});

describe("factory TLS environment gate", () => {
  it("fails closed under NODE_TLS_REJECT_UNAUTHORIZED=0 without editing env", () => {
    const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
      let error = null;
      try {
        createBackendTransport(baseConfig(), baseDeps());
      } catch (thrown) {
        error = thrown;
      }
      expect(error?.code).toBe("invalid_arguments");
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe("0");
    } finally {
      if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
    }
  });
});

describe("inert import and factory (black-box)", () => {
  it("registers no process global handlers on import and factory", () => {
    const before = {
      unhandledRejection: process.listenerCount("unhandledRejection"),
      uncaughtException: process.listenerCount("uncaughtException"),
      warning: process.listenerCount("warning"),
    };
    createBackendTransport(baseConfig(), baseDeps());
    expect({
      unhandledRejection: process.listenerCount("unhandledRejection"),
      uncaughtException: process.listenerCount("uncaughtException"),
      warning: process.listenerCount("warning"),
    }).toEqual(before);
  });

  it("factory is synchronous and captures config/deps at factory time", () => {
    const config = baseConfig();
    const deps = baseDeps();
    const handle = createBackendTransport(config, deps);
    config.origin = "https://mutated-after-factory.example.invalid";
    deps.session = null;
    expect(Object.keys(handle).sort()).toEqual(HANDLE_METHODS);
  });
});

describe("factory capture proven by a later actual call", () => {
  it("post-factory config/deps mutation cannot change dispatch behavior", async () => {
    const config = baseConfig();
    const { session } = makeSession();
    const page = searchPageWire([bundledExerciseWire()]);
    const { wire, captured } = makeWire([okJson(200, page)]);
    const deps = { ...baseDeps(), session, wire };
    const handle = createBackendTransport(config, deps);
    config.origin = "https://mutated-after-factory.example.invalid";
    config.budgets = { maxAttempts: 1 };
    deps.session = null;
    deps.wire = null;
    const result = await handle.searchExercises(testBinding(), {}, freshSignal());
    expect(result.status).toBe(200);
    expect(captured.length).toBe(1);
    expect(captured[0].request.origin).toBe(ORIGIN);
    expect(captured[0].request.target).toBe("/v1/catalogue/exercises?limit=20");
  });

  it("returned handle and JSON data trees are frozen", async () => {
    const { session } = makeSession();
    const page = searchPageWire([bundledExerciseWire()]);
    const { wire } = makeWire([okJson(200, page)]);
    const handle = createBackendTransport(baseConfig(), { ...baseDeps(), session, wire });
    const result = await handle.searchExercises(testBinding(), {}, freshSignal());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.data)).toBe(true);
    expect(Object.isFrozen(result.data.items)).toBe(true);
    expect(Object.isFrozen(result.data.items[0])).toBe(true);
  });
});

describe("public declarations without implementation reads", () => {
  it("dist/http/index.d.ts declares the approved API surface", () => {
    const url = new URL("../../../dist/http/index.d.ts", import.meta.url);
    const declarations = readFileSync(url, "utf8");
    for (const name of [
      "createBackendTransport",
      "TransportError",
      "isTransportError",
      "DEFAULT_TRANSPORT_BUDGETS",
      "TRANSPORT_IDENTITY_VERSION",
      ...HANDLE_METHODS,
    ]) {
      expect(declarations.includes(name)).toBe(true);
    }
  });
});

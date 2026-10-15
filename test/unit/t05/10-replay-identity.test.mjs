// T05 unit: exact replay identity across attempts — method/origin/target/
// header-key/body byte comparison for draft/populate/save, changed bearer
// under the same binding, seam-buffer alias discipline, cross-namespace key
// reuse. Approved spec sections 4, 5 and 8.

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  ROUTINE_R,
  EXERCISE_E,
  ENTRY_E1,
  SET_S1,
  RESOURCE_KEY,
  BEARER,
  PROFILE_P,
  baseConfig,
  baseDeps,
  makeSession,
  makeWire,
  okJson,
  networkFail,
  utf8,
  testBinding,
  nullAccountBinding,
  freshSignal,
} from "./helpers.mjs";

const BEARER_TWO = "synthetic-qa-bearer.02";

// Populate canary: odd spacing/key order plus an actual fractional numeric
// spelling (40.0) and an exponent spelling (4e1) that must both survive
// replay byte-identically (transport never rewrites entries or tokens).
const CANARY_TEXT =
  `{"exercises" : [{"id" : "${ENTRY_E1}", "exerciseId" : "${EXERCISE_E}", "position" : 0, ` +
  `"restDurationSeconds" : 30, "sets" : [{"id" : "${SET_S1}", "position" : 0, ` +
  `"repetitions" : 8, "weightKg" : 40.0}, {"id" : "${SET_S1}", "position" : 1, ` +
  `"repetitions" : 8, "weightKg" : 4e1}]}], "isDraft" : true, ` +
  `"name" : "Synthetic QA Canary", "id" : "${ROUTINE_R}"}`;

const CANARY_RECORD = {
  id: ROUTINE_R,
  name: "Synthetic QA 40.0",
  isDraft: true,
  revision: 1,
  exercises: [],
};

function replayTransport(script, sessionOverrides = {}) {
  const { session, calls } = makeSession(sessionOverrides);
  const { wire, captured } = makeWire(script);
  const handle = createBackendTransport(baseConfig(), { ...baseDeps(), session, wire });
  return { handle, calls, captured };
}

describe("multi-attempt byte identity per mutation route", () => {
  for (const route of ["createDraft", "populateDraft", "saveRoutine"]) {
    it(`${route} retains method/target/headers/body under replay`, async () => {
      const bodies = {
        createDraft: utf8(`{"id":"${ROUTINE_R}"}`),
        populateDraft: utf8(CANARY_TEXT),
        saveRoutine: utf8('{"name":"Synthetic QA Draft"}'),
      };
      const args = {
        createDraft: [testBinding(), ROUTINE_R, bodies.createDraft, RESOURCE_KEY],
        populateDraft: [testBinding(), ROUTINE_R, bodies.populateDraft, RESOURCE_KEY],
        saveRoutine: [testBinding(), ROUTINE_R, bodies.saveRoutine, RESOURCE_KEY],
      };
      const statuses = { createDraft: 201, populateDraft: 200, saveRoutine: 200 };
      const labels = {
        createDraft: "create_draft",
        populateDraft: "populate_draft",
        saveRoutine: "save_routine",
      };
      const snapshot = Buffer.from(args[route][2]).toString("utf8");
      let seamSeen = null;
      const { handle, captured } = replayTransport([
        (request) => {
          // Snapshot the sender copy BEFORE mutating it, so both the
          // original identity and the subsequent replay are compared.
          seamSeen = Buffer.from(request.body).toString("utf8");
          request.body.fill(0x5a);
          return networkFail();
        },
        okJson(statuses[route], CANARY_RECORD),
      ]);
      const pending = handle[route](...args[route], freshSignal());
      pending.catch(() => {});
      // Mutate the caller buffer while the first attempt is in flight.
      args[route][2].fill(0x51);
      const result = await pending;
      expect(result.routeLabel).toBe(labels[route]);
      expect(captured.length).toBe(2);
      const [first, second] = captured.map((entry) => entry.request);
      expect(first.method).toBe(second.method);
      expect(first.origin).toBe(second.origin);
      expect(first.target).toBe(second.target);
      const headerKey = (headers) => headers.map(([name]) => name);
      expect(headerKey(first.headers)).toEqual(headerKey(second.headers));
      expect(first.headers).toEqual(second.headers);
      expect(Buffer.from(second.body).toString("utf8")).toBe(snapshot);
      expect(seamSeen).toBe(snapshot);
    });
  }

  it("reselected bearer under the same binding changes only authorization", async () => {
    const seen = { count: 0 };
    const bodies = utf8(`{"id":"${ROUTINE_R}"}`);
    const snapshot = Buffer.from(bodies).toString("utf8");
    const { handle, captured } = replayTransport([networkFail(), okJson(201, CANARY_RECORD)], {
      selectCredential: async (binding) => {
        seen.count += 1;
        return { bearerToken: seen.count === 1 ? BEARER : BEARER_TWO, forBinding: binding };
      },
    });
    const result = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      bodies,
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.status).toBe(201);
    const authOf = (headers) => headers.find(([name]) => name === "authorization")[1];
    expect(authOf(captured[0].request.headers)).toBe(`Bearer ${BEARER}`);
    expect(authOf(captured[1].request.headers)).toBe(`Bearer ${BEARER_TWO}`);
    expect(Buffer.from(captured[1].request.body).toString("utf8")).toBe(snapshot);
    const keyOf = (headers) => headers.find(([name]) => name === "idempotency-key")[1];
    expect(keyOf(captured[0].request.headers)).toBe(RESOURCE_KEY);
    expect(keyOf(captured[1].request.headers)).toBe(RESOURCE_KEY);
  });
});

describe("shared seam buffers and cross-namespace keys", () => {
  it("mutating a returned copy never alters the shared seam buffer", async () => {
    const shared = okJson(201, CANARY_RECORD);
    const pristine = Buffer.from(shared.body).toString("utf8");
    const { handle } = replayTransport([shared, shared]);
    const first = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      utf8(`{"id":"${ROUTINE_R}"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    first.rawBodyBytes.fill(0x51);
    expect(Buffer.from(shared.body).toString("utf8")).toBe(pristine);
    const second = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      utf8(`{"id":"${ROUTINE_R}"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(Buffer.from(second.rawBodyBytes).toString("utf8")).toBe(pristine);
  });

  it("one shared key value works across auth and resource namespaces", async () => {
    // The SAME synthetic UUID is used as the resource key and as the auth
    // key: namespaces are route-fixed, so no cross-namespace rule forbids it.
    const draft = replayTransport([okJson(201, CANARY_RECORD)]);
    const created = await draft.handle.createDraft(
      testBinding(),
      ROUTINE_R,
      utf8(`{"id":"${ROUTINE_R}"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(created.status).toBe(201);
    expect(created.resourceKey).toBe(RESOURCE_KEY);

    const exchange = replayTransport([okJson(200, {})]);
    const exchanged = await exchange.handle.authExchange(
      nullAccountBinding(),
      utf8(`{"challengeId":"${PROFILE_P}","idToken":"synthetic-qa-token"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(exchanged.status).toBe(200);
  });
});

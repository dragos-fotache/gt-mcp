// T05 unit: T03 raw-first resource decode incl. Int64 extremes, mutation
// expected-ID decoding, control/logouts boundaries, no false confirmations.
// Approved spec section 6 (T03 decodeBackendResponse first; T10 owns content).

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  ROUTINE_R,
  ROUTINE_R2,
  EXERCISE_E,
  RESOURCE_KEY,
  baseConfig,
  baseDeps,
  makeSession,
  makeWire,
  okJson,
  utf8,
  bundledExerciseWire,
  searchPageWire,
  routineWire,
  routineRawText,
  workoutSummaryWire,
  workoutWire,
  workoutListWire,
  routineListWire,
  testBinding,
  catchTransportError,
  freshSignal,
} from "./helpers.mjs";

function decodeTransport(script) {
  const { session } = makeSession();
  const { wire, captured } = makeWire(script);
  const handle = createBackendTransport(baseConfig(), { ...baseDeps(), session, wire });
  return { handle, captured };
}

describe("lossless Int64 decode on reads (raw entry first)", () => {
  it("projects Int64-max exactly without rounding", async () => {
    const text = routineRawText({ id: ROUTINE_R, revisionToken: "9223372036854775807" });
    const { handle } = decodeTransport([
      {
        ok: true,
        status: 200,
        rawHeaders: [["content-type", "application/json"]],
        body: utf8(text),
      },
    ]);
    const result = await handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    expect(result.status).toBe(200);
    expect(result.data.revision).toBe("9223372036854775807");
    expect(result.data.id).toBe(ROUTINE_R);
  });

  it("accepts integral decimal/exponent spellings as their exact value", async () => {
    for (const [token, projected] of [
      ["40.0", "40"],
      ["4e1", "40"],
      ["9007199254740993", "9007199254740993"],
    ]) {
      const text = routineRawText({ id: ROUTINE_R, revisionToken: token });
      const { handle } = decodeTransport([
        {
          ok: true,
          status: 200,
          rawHeaders: [["content-type", "application/json"]],
          body: utf8(text),
        },
      ]);
      const result = await handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
      expect({ token, revision: result.data.revision }).toEqual({ token, revision: projected });
    }
  });

  it("rejects Int64-max+1, zero, negative and wire-string revisions", async () => {
    const tokens = ["9223372036854775808", "0", "-5", '"40"'];
    for (const [index, token] of tokens.entries()) {
      const text = routineRawText({ id: ROUTINE_R, revisionToken: token });
      const { handle } = decodeTransport([
        {
          ok: true,
          status: 200,
          rawHeaders: [["content-type", "application/json"]],
          body: utf8(text),
        },
      ]);
      const error = await catchTransportError(
        handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
      );
      expect({ index, code: error.code }).toEqual({ index, code: "internal_error" });
      // Reads stay definite even when the body is malformed.
      expect(error.outcomeUnknown).toBe(false);
    }
  });

  it("decodes all six reads whole with catalogueVersion kept inside data", async () => {
    const search = decodeTransport([okJson(200, searchPageWire([bundledExerciseWire()]))]);
    const found = await search.handle.searchExercises(testBinding(), { limit: 20 }, freshSignal());
    expect(found.status).toBe(200);
    expect(found.data.catalogueVersion).toBe("gymtracka-catalogue-v1");
    expect(found.data.items.length).toBe(1);
    expect("catalogueVersion" in found).toBe(false);

    const exercise = decodeTransport([okJson(200, bundledExerciseWire())]);
    const single = await exercise.handle.getExercise(testBinding(), EXERCISE_E, freshSignal());
    expect(single.data.id).toBe(EXERCISE_E);
    expect(single.data.revision ?? null).toBe(null);

    const summaries = decodeTransport([okJson(200, workoutListWire([workoutSummaryWire()]))]);
    const listed = await summaries.handle.listWorkouts(testBinding(), {}, freshSignal());
    expect(listed.data.items[0].revision).toBe("1");

    const workout = decodeTransport([okJson(200, workoutWire())]);
    const full = await workout.handle.getWorkout(testBinding(), ROUTINE_R2, freshSignal());
    expect(full.data.exercises.length).toBe(1);
    expect(full.data.exercises[0].sets.length).toBe(1);

    const routines = decodeTransport([
      okJson(
        200,
        routineListWire([routineWire({ isDraft: false, name: "Synthetic QA Saved", revision: 2 })]),
      ),
    ]);
    const saved = await routines.handle.listRoutines(testBinding(), {}, freshSignal());
    expect(saved.data.items[0].isDraft).toBe(false);
  });

  it("expected-ID mismatch and truncated bodies never become confirmations", async () => {
    const other = decodeTransport([okJson(200, routineWire({ id: ROUTINE_R2 }))]);
    const mismatch = await catchTransportError(
      other.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(mismatch.code).toBe("internal_error");

    const truncated = decodeTransport([
      {
        ok: true,
        status: 200,
        rawHeaders: [["content-type", "application/json"]],
        body: utf8('{"id":"x"'),
      },
    ]);
    const cut = await catchTransportError(
      truncated.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(cut.code).toBe("internal_error");
  });
});

describe("mutation results: expected-ID raw decode plus original bytes", () => {
  it("createDraft returns route label, key, raw bytes and decoded record", async () => {
    const text = routineRawText({ id: ROUTINE_R, revisionToken: "7" });
    const { handle } = decodeTransport([
      {
        ok: true,
        status: 201,
        rawHeaders: [["content-type", "application/json"]],
        body: utf8(text),
      },
    ]);
    const result = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      utf8(`{"id":"${ROUTINE_R}"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(result.status).toBe(201);
    expect(result.routeLabel).toBe("create_draft");
    expect(result.resourceKey).toBe(RESOURCE_KEY);
    expect(Buffer.from(result.rawBodyBytes).toString("utf8")).toBe(text);
    expect(result.data.id).toBe(ROUTINE_R);
    expect(result.data.revision).toBe("7");
  });

  it("populate/save decode with the path routine ID regardless of step", async () => {
    const text = routineRawText({ id: ROUTINE_R, name: "Synthetic QA Draft", revisionToken: "9" });
    const body = utf8(
      `{"id":"${ROUTINE_R}","name":"Synthetic QA Draft","isDraft":true,"exercises":[]}`,
    );
    const populate = decodeTransport([
      {
        ok: true,
        status: 200,
        rawHeaders: [["content-type", "application/json"]],
        body: utf8(text),
      },
    ]);
    const populated = await populate.handle.populateDraft(
      testBinding(),
      ROUTINE_R,
      body,
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(populated.routeLabel).toBe("populate_draft");
    expect(populated.data.id).toBe(ROUTINE_R);

    const save = decodeTransport([
      {
        ok: true,
        status: 200,
        rawHeaders: [["content-type", "application/json"]],
        body: utf8(text),
      },
    ]);
    const saved = await save.handle.saveRoutine(
      testBinding(),
      ROUTINE_R,
      utf8('{"name":"Synthetic QA Draft"}'),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(saved.routeLabel).toBe("save_routine");
    // Transport returns the decoded record; admitted-content equality is T10.
    expect(saved.data.id).toBe(ROUTINE_R);
  });

  it("wrong-status and wrong-ID mutation bodies stay uncertain, never confirmed", async () => {
    const wrongId = decodeTransport([
      okJson(201, { id: ROUTINE_R2, name: "", isDraft: true, revision: 1, exercises: [] }),
    ]);
    const idError = await catchTransportError(
      wrongId.handle.createDraft(
        testBinding(),
        ROUTINE_R,
        utf8(`{"id":"${ROUTINE_R}"}`),
        RESOURCE_KEY,
        freshSignal(),
      ),
    );
    expect(idError.code).toBe("internal_error");
    expect(idError.outcomeUnknown).toBe(true);

    const created = okJson(200, routineWire());
    const statusError = await catchTransportError(
      decodeTransport([created]).handle.createDraft(
        testBinding(),
        ROUTINE_R,
        utf8(`{"id":"${ROUTINE_R}"}`),
        RESOURCE_KEY,
        freshSignal(),
      ),
    );
    expect(statusError.code).toBe("internal_error");
  });
});

describe("control and logout boundaries", () => {
  it("control success carries raw bytes with no grant/account claims", async () => {
    const { handle } = decodeTransport([okJson(200, {})]);
    const result = await handle.authChallenge(testBinding(), utf8("{}"), freshSignal());
    expect(result.status).toBe(200);
    expect(Buffer.from(result.rawBodyBytes).toString("utf8")).toBe("{}");
    expect("data" in result).toBe(false);
    expect("account" in result).toBe(false);
  });

  it("logout accepts only 204 with zero exposed body", async () => {
    const { handle } = decodeTransport([
      { ok: true, status: 204, rawHeaders: [], body: new Uint8Array(0) },
    ]);
    const result = await handle.authLogout(
      testBinding(),
      utf8('{"refreshToken":"synthetic-qa-refresh"}'),
      freshSignal(),
    );
    expect(result.status).toBe(204);
    expect("rawBodyBytes" in result).toBe(false);

    const withBody = decodeTransport([
      { ok: true, status: 204, rawHeaders: [["content-length", "2"]], body: utf8("{}") },
    ]);
    const error = await catchTransportError(
      withBody.handle.authLogout(
        testBinding(),
        utf8('{"refreshToken":"synthetic-qa-refresh"}'),
        freshSignal(),
      ),
    );
    expect(error.code).toBe("internal_error");
  });

  it("non-JSON content types reject on success and error paths alike", async () => {
    const plain = decodeTransport([
      { ok: true, status: 200, rawHeaders: [["content-type", "text/plain"]], body: utf8("{}") },
    ]);
    const error = await catchTransportError(
      plain.handle.authChallenge(testBinding(), utf8("{}"), freshSignal()),
    );
    expect(error.code).toBe("internal_error");

    const charset = decodeTransport([
      {
        ok: true,
        status: 404,
        rawHeaders: [["content-type", "application/json; charset=ISO-8859-1"]],
        body: utf8('{"errorCode":"not_found"}'),
      },
    ]);
    const charsetError = await catchTransportError(
      charset.handle.getRoutine(testBinding(), ROUTINE_R, freshSignal()),
    );
    expect(charsetError.code).toBe("internal_error");
  });
});

describe("exact result shapes carry no grant or history claims", () => {
  it("read results expose exactly status/data/attempts/elapsed/correlation/dispatched", async () => {
    const { handle } = decodeTransport([
      okJson(200, routineWire({ isDraft: false, name: "Synthetic QA Saved", revision: 2 })),
    ]);
    const result = await handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    expect(Object.keys(result).sort()).toEqual(
      ["attempts", "correlationId", "data", "dispatched", "elapsedMs", "status"].sort(),
    );
  });

  it("mutation results expose exactly the approved fields", async () => {
    const { handle } = decodeTransport([okJson(201, routineWire())]);
    const result = await handle.createDraft(
      testBinding(),
      ROUTINE_R,
      utf8(`{"id":"${ROUTINE_R}"}`),
      RESOURCE_KEY,
      freshSignal(),
    );
    expect(Object.keys(result).sort()).toEqual(
      [
        "attempts",
        "correlationId",
        "data",
        "dispatched",
        "elapsedMs",
        "rawBodyBytes",
        "resourceKey",
        "routeLabel",
        "status",
      ].sort(),
    );
    expect("operationId" in result).toBe(false);
    expect("lastConfirmedStep" in result).toBe(false);
  });

  it("control results carry raw bytes with no account or grant fields", async () => {
    const { handle } = decodeTransport([okJson(200, {})]);
    const result = await handle.authChallenge(testBinding(), utf8("{}"), freshSignal());
    expect(Object.keys(result).sort()).toEqual(
      ["attempts", "correlationId", "dispatched", "elapsedMs", "rawBodyBytes", "status"].sort(),
    );
    expect("account" in result).toBe(false);
    expect("accessToken" in result).toBe(false);
  });

  it("logout results expose no body at all", async () => {
    const { handle } = decodeTransport([
      { ok: true, status: 204, rawHeaders: [], body: new Uint8Array(0) },
    ]);
    const result = await handle.authLogout(
      testBinding(),
      utf8('{"refreshToken":"synthetic-qa-refresh"}'),
      freshSignal(),
    );
    expect(Object.keys(result).sort()).toEqual(
      ["attempts", "correlationId", "dispatched", "elapsedMs", "status"].sort(),
    );
  });
});

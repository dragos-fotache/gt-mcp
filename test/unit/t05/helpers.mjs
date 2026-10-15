/* global AbortController, TextEncoder */

// Synthetic T05 QA doubles and builders — independent, derived only from the
// approved public transport spec. No production/implementation imports here.
// Every UUID/token below is a visibly synthetic fixture value.

export const ORIGIN = "https://transport-qa.example.invalid";

export const ACCOUNT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const ACCOUNT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
export const PROFILE_P = "cccccccc-cccc-cccc-cccc-cccccccccccc";
export const ROUTINE_R = "dddddddd-dddd-dddd-dddd-dddddddddddd";
export const ROUTINE_R2 = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
export const EXERCISE_E = "ffffffff-ffff-ffff-ffff-ffffffffffff";
export const ENTRY_E1 = "11111111-1111-1111-1111-111111111111";
export const SET_S1 = "22222222-2222-2222-2222-222222222222";
export const RESOURCE_KEY = "33333333-3333-3333-3333-333333333333";
export const AUTH_KEY = "44444444-4444-4444-4444-444444444444";
export const MUSCLE_A = "55555555-5555-5555-5555-555555555555";
export const MUSCLE_B = "66666666-6666-6666-6666-666666666666";
export const EQUIP_C = "77777777-7777-7777-7777-777777777777";
export const CHALLENGE_C = "88888888-8888-8888-8888-888888888888";

export const BEARER = "synthetic-qa-bearer.01";

// ---------------------------------------------------------------- bindings

export function testBinding(overrides = {}) {
  return {
    origin: ORIGIN,
    accountUuid: ACCOUNT_A,
    sessionGeneration: 0,
    profileGenerationId: PROFILE_P,
    ...overrides,
  };
}

export function nullAccountBinding(overrides = {}) {
  return {
    origin: ORIGIN,
    accountUuid: null,
    sessionGeneration: 0,
    profileGenerationId: PROFILE_P,
    ...overrides,
  };
}

// ---------------------------------------------------------------- session

// Recording SessionHooks double. All hooks resolve; behavior is tuned per test
// through overrides. Every hook invocation is recorded for order assertions.
export function makeSession(overrides = {}) {
  const calls = { checkBinding: [], selectCredential: [], beforeDispatch: [], isCurrent: [] };
  const isCurrentAnswers = overrides.isCurrentAnswers ?? null;
  let isCurrentCount = 0;
  const session = {
    checkBinding: async (point, binding, signal) => {
      calls.checkBinding.push({ point, binding, signal });
      if (overrides.checkBinding) await overrides.checkBinding(point, binding, signal);
    },
    selectCredential: async (binding, route, signal) => {
      calls.selectCredential.push({ binding, route, signal });
      if (overrides.selectCredential) return overrides.selectCredential(binding, route, signal);
      return { bearerToken: BEARER, forBinding: binding };
    },
    beforeDispatch: async (binding, summary, signal) => {
      calls.beforeDispatch.push({ binding, summary, signal });
      if (overrides.beforeDispatch) await overrides.beforeDispatch(binding, summary, signal);
    },
    isCurrent: (binding) => {
      calls.isCurrent.push({ binding });
      if (isCurrentAnswers !== null) {
        const answer = isCurrentAnswers[Math.min(isCurrentCount, isCurrentAnswers.length - 1)];
        isCurrentCount += 1;
        if (answer instanceof Error) throw answer;
        return answer;
      }
      if (overrides.isCurrent) return overrides.isCurrent(binding);
      return true;
    },
  };
  return { session, calls };
}

// ---------------------------------------------------------------- clock/sleeper

export function makeClock(startMs = 1000) {
  let now = startMs;
  return {
    advance: (ms) => {
      now += ms;
    },
    set: (ms) => {
      now = ms;
    },
    clock: { nowMs: () => now },
  };
}

// Deterministic sleeper: records delays, advances the paired manual clock,
// never waits in wall time. Abort is observed by the transport-level race.
export function makeSleeper(clockHandle = null) {
  const sleeps = [];
  return {
    sleeps,
    sleeper: {
      sleep: async (ms) => {
        sleeps.push(ms);
        if (clockHandle) clockHandle.advance(ms);
      },
    },
  };
}

// ---------------------------------------------------------------- wire

export function utf8(text) {
  return new TextEncoder().encode(text);
}

export function jsonBody(obj) {
  return utf8(JSON.stringify(obj));
}

export function rawJson(text) {
  return utf8(text);
}

export function jsonHeaders(extra = []) {
  return [["content-type", "application/json"], ...extra];
}

// Scripted HttpWire double. Each entry is a RawWireResponse object or a
// function (request, budget, signal, index) returning one (or throwing to
// simulate a sender rejection). Captures every invocation.
export function makeWire(script) {
  const captured = [];
  let index = 0;
  const wire = {
    sendRaw: async (request, budget, signal) => {
      const at = index;
      captured.push({ request, budget, signal, index: at });
      index += 1;
      const step = script[Math.min(at, script.length - 1)];
      if (typeof step === "function") return step(request, budget, signal, at);
      return step;
    },
  };
  return { wire, captured };
}

export function okJson(status, obj, headers = []) {
  return { ok: true, status, rawHeaders: jsonHeaders(headers), body: jsonBody(obj) };
}

export function okRaw(status, text, headers = []) {
  return { ok: true, status, rawHeaders: jsonHeaders(headers), body: rawJson(text) };
}

export function networkFail() {
  return { ok: false, kind: "network", status: null };
}

export function tooLargeFail() {
  return { ok: false, kind: "response_too_large", status: null };
}

export function malformedFail() {
  return { ok: false, kind: "malformed", status: null };
}

// ---------------------------------------------------------------- transport assembly

export function baseConfig(overrides = {}) {
  return { origin: ORIGIN, ...overrides };
}

export function baseDeps(overrides = {}) {
  const { session } = makeSession();
  return { session, ...overrides };
}

// ---------------------------------------------------------------- wire fixtures (synthetic records)

// Minimal bundled exercise wire record: revision absent stays absent.
export function bundledExerciseWire(id = EXERCISE_E) {
  return {
    id,
    name: "Synthetic QA Press",
    type: "strength",
    isUserCreated: false,
    muscleGroups: [],
    equipment: [],
  };
}

export function searchPageWire(items, { hasMore = false, nextPageToken = null } = {}) {
  return {
    catalogueVersion: "gymtracka-catalogue-v1",
    items,
    hasMore,
    nextPageToken,
  };
}

// Minimal routine wire record. Empty exercises are valid blank reads;
// revision is a raw JSON number on the wire.
export function routineWire({ id = ROUTINE_R, name = "", isDraft = true, revision = 1 } = {}) {
  return { id, name, isDraft, revision, exercises: [] };
}

// Raw routine JSON text with an exact numeric revision token (no JS rounding).
export function routineRawText({
  id = ROUTINE_R,
  name = "",
  isDraft = true,
  revisionToken = "1",
} = {}) {
  return `{"id":"${id}","name":"${name}","isDraft":${isDraft ? "true" : "false"},"revision":${revisionToken},"exercises":[]}`;
}

export function workoutSummaryWire({ id = ROUTINE_R2, status = "active" } = {}) {
  const record = {
    id,
    name: "Synthetic QA Workout",
    status,
    startedAt: "2026-01-03T00:00:00Z",
    revision: 1,
  };
  return record;
}

// Minimal ACTIVE workout with one entry and one incomplete set. Root, entry
// and set UUIDs are family-distinct; positions equal array indexes.
export function workoutWire() {
  return {
    id: ROUTINE_R2,
    name: "Synthetic QA Workout",
    status: "active",
    startedAt: "2026-01-03T00:00:00Z",
    revision: 1,
    exercises: [
      {
        id: ENTRY_E1,
        exerciseId: EXERCISE_E,
        position: 0,
        notes: "",
        restDurationSeconds: 30,
        sets: [{ id: SET_S1, position: 0, isCompleted: false }],
        exerciseName: "Synthetic QA Press",
      },
    ],
  };
}

export function routineListWire(items) {
  return { items, hasMore: false, nextPageToken: null };
}

export function workoutListWire(items) {
  return { items, hasMore: false, nextPageToken: null };
}

// ---------------------------------------------------------------- error helpers

// Await a transport promise and return the TransportError it rejects with.
// Fails the test if the promise resolves.
export async function catchTransportError(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("synthetic-qa: expected transport rejection, promise resolved");
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function freshSignal() {
  return new AbortController().signal;
}

// T08-S1 QA synthetic fixtures + smallest isolated preparation support.
// Spec authority: t08-s1-runtime-spec, t08-s1-user-decisions, shared MCP
// draft0.2 tools/authentication, backend v1 OpenAPI (WorkoutSummary requires
// id/name/status/startedAt/revision; Routine requires id/name/isDraft/
// revision/exercises). Accepted public T04 provisionProfile/openProfile and
// T06 openSessionState/installInitialGrant are used ONLY for expressly
// isolated fixture preparation. installInitialGrant takes the EXACT pre-auth
// facade binding (null account, generation0) captured from openSessionState;
// the installed binding returned is authoritative, never guessed locally.
// No execution until a separate relay grants it.
/* global AbortController */

import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";

import { openSessionState } from "../../dist/auth/index.js";
import { provisionProfile } from "../../dist/storage/index.js";

export const SYNTHETIC_ORIGIN = "https://synthetic-qa.invalid";

export const SYNTHETIC_UUIDS = {
  account: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  profile: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  exerciseA: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  exerciseB: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  workout: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  routineSaved: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  routineDraft: "11111111-2222-4333-8444-555555555555",
  foreignRoutine: "99999999-8888-4777-8666-555555555555",
  muscle: "aaaaaaa1-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  equipment: "bbbbbbb2-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  entryOne: "c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c0c0",
  setOne: "d0d0d0d0-d0d0-4d0d-8d0d-d0d0d0d0d0d0",
};

// Largest valid Int64 revision token: exact decimal text, never rounded.
export const MAX_INT64_TOKEN = "9223372036854775807";

const U = SYNTHETIC_UUIDS;

// Independently specified expected runtime-boundary values (literal, complete).
export const EXPECTED_EXERCISE = {
  id: U.exerciseB,
  name: "Synthetic Curl",
  type: "reps",
  isUserCreated: true,
  revision: MAX_INT64_TOKEN,
  muscleGroups: [{ id: U.muscle, name: "Synthetic Arm", type: "primary" }],
  equipment: [],
};

export const EXPECTED_SEARCH_PAGE = {
  items: [
    {
      id: U.exerciseA,
      name: "Synthetic Press",
      type: "reps",
      isUserCreated: false,
      revision: null,
      muscleGroups: [{ id: U.muscle, name: "Synthetic Chest", type: "primary" }],
      equipment: [],
    },
  ],
  hasMore: true,
  nextPageToken: "synthetic-continuation-1",
  catalogueVersion: "synthetic-catalogue-7",
};

export const EXPECTED_SEARCH_PAGE_LAST = {
  items: [
    {
      id: U.exerciseB,
      name: "Synthetic Curl",
      type: "reps",
      isUserCreated: true,
      revision: MAX_INT64_TOKEN,
      muscleGroups: [{ id: U.muscle, name: "Synthetic Arm", type: "primary" }],
      equipment: [],
    },
  ],
  hasMore: false,
  nextPageToken: null,
  catalogueVersion: "synthetic-catalogue-7",
};

export const EXPECTED_WORKOUT = {
  id: U.workout,
  name: "Synthetic Evening Session",
  status: "finished",
  startedAt: "2026-01-05T18:00:00.000Z",
  finishedAt: "2026-01-05T19:00:00.000Z",
  revision: "40",
  exercises: [
    {
      id: U.entryOne,
      exerciseId: U.exerciseA,
      exerciseName: "Synthetic Press",
      position: 0,
      notes: "",
      restDurationSeconds: 30,
      sets: [
        {
          id: U.setOne,
          position: 0,
          repetitions: 8,
          weightKg: 40,
          isCompleted: true,
          restSeconds: null,
        },
      ],
    },
  ],
};

export const EXPECTED_WORKOUT_SUMMARY = {
  id: U.workout,
  name: "Synthetic Evening Session",
  status: "finished",
  startedAt: "2026-01-05T18:00:00.000Z",
  finishedAt: "2026-01-05T19:00:00.000Z",
  revision: "40",
};

export const EXPECTED_WORKOUT_PAGE = {
  items: [EXPECTED_WORKOUT_SUMMARY],
  hasMore: false,
  nextPageToken: null,
};

// One nonempty ordered aggregate with nullable set fields: sufficient
// preservation proof, no permutation campaign.
export const EXPECTED_ROUTINE = {
  id: U.routineSaved,
  name: "Synthetic Upper Body",
  isDraft: false,
  revision: "41",
  exercises: [
    {
      id: U.entryOne,
      exerciseId: U.exerciseA,
      exerciseName: "Synthetic Press",
      position: 0,
      restDurationSeconds: 30,
      sets: [{ id: U.setOne, position: 0, repetitions: null, weightKg: null }],
    },
  ],
};

export const EXPECTED_ROUTINE_PAGE = {
  items: [EXPECTED_ROUTINE],
  hasMore: false,
  nextPageToken: null,
};

export const EXPECTED_DRAFT = {
  id: U.routineDraft,
  name: "Synthetic Draft Plan",
  isDraft: true,
  revision: "42",
  exercises: [],
};

// Wire JSON uses RAW numeric revisions where the projection risk is exercised;
// projected strings appear only at the runtime boundary (see EXPECTED_*).
export function wireExerciseGet() {
  return (
    `{"id":${JSON.stringify(U.exerciseB)},"name":"Synthetic Curl",` +
    `"type":"reps","isUserCreated":true,"revision":${MAX_INT64_TOKEN},` +
    `"muscleGroups":[{"id":${JSON.stringify(U.muscle)},"name":"Synthetic Arm","type":"primary"}],` +
    `"equipment":[]}`
  );
}

function wirePageOf(itemsJson, { hasMore, nextPageToken, catalogueVersion } = {}) {
  const tail =
    `"hasMore":${hasMore ? "true" : "false"},` +
    `"nextPageToken":${hasMore ? JSON.stringify(nextPageToken) : "null"}` +
    (catalogueVersion === undefined
      ? ""
      : `,"catalogueVersion":${JSON.stringify(catalogueVersion)}`);
  return `{"items":[${itemsJson.join(",")}],${tail}}`;
}

export function wireSearchFirst() {
  return wirePageOf(
    [
      `{"id":${JSON.stringify(U.exerciseA)},"name":"Synthetic Press",` +
        `"type":"reps","isUserCreated":false,"revision":null,` +
        `"muscleGroups":[{"id":${JSON.stringify(U.muscle)},"name":"Synthetic Chest","type":"primary"}],` +
        `"equipment":[]}`,
    ],
    {
      hasMore: true,
      nextPageToken: "synthetic-continuation-1",
      catalogueVersion: "synthetic-catalogue-7",
    },
  );
}

export function wireSearchLast() {
  return wirePageOf([wireExerciseGet()], {
    hasMore: false,
    catalogueVersion: "synthetic-catalogue-7",
  });
}

export function wireWorkoutGet() {
  return (
    `{"id":${JSON.stringify(U.workout)},` +
    `"name":"Synthetic Evening Session","status":"finished",` +
    `"startedAt":"2026-01-05T18:00:00.000Z","finishedAt":"2026-01-05T19:00:00.000Z",` +
    `"revision":40,"exercises":[{"id":${JSON.stringify(U.entryOne)},` +
    `"exerciseId":${JSON.stringify(U.exerciseA)},"exerciseName":"Synthetic Press",` +
    `"position":0,"notes":"","restDurationSeconds":30,` +
    `"sets":[{"id":${JSON.stringify(U.setOne)},"position":0,` +
    `"repetitions":8,"weightKg":40,"isCompleted":true,"restSeconds":null}]}]}`
  );
}

export function wireWorkoutPage() {
  return wirePageOf([
    `{"id":${JSON.stringify(U.workout)},` +
      `"name":"Synthetic Evening Session","status":"finished",` +
      `"startedAt":"2026-01-05T18:00:00.000Z","finishedAt":"2026-01-05T19:00:00.000Z",` +
      `"revision":40}`,
  ]);
}

export function wireRoutineGet() {
  return (
    `{"id":${JSON.stringify(U.routineSaved)},` +
    `"name":"Synthetic Upper Body","isDraft":false,"revision":41,` +
    `"exercises":[{"id":${JSON.stringify(U.entryOne)},` +
    `"exerciseId":${JSON.stringify(U.exerciseA)},"exerciseName":"Synthetic Press",` +
    `"position":0,` +
    `"restDurationSeconds":30,"sets":[{"id":${JSON.stringify(U.setOne)},` +
    `"position":0,"repetitions":null,"weightKg":null}]}]}`
  );
}

export function wireRoutinePage() {
  return wirePageOf([wireRoutineGet()]);
}

export function wireDraftGet() {
  return (
    `{"id":${JSON.stringify(U.routineDraft)},` +
    `"name":"Synthetic Draft Plan","isDraft":true,"revision":42,"exercises":[]}`
  );
}

// Deterministic canned responder for the six read routes plus continuation,
// expired-token, foreign-id, and refresh paths. Backend machine codes come
// from the public T05 permanent mapping (404 not_found, 410 page_expired).
export function s1RelayResponder(summary) {
  const target = summary.target ?? "";
  if (target.startsWith("/v1/catalogue/exercises")) {
    if (target.includes("pageToken=synthetic-continuation-1")) {
      return { status: 200, body: wireSearchLast() };
    }
    return { status: 200, body: wireSearchFirst() };
  }
  if (target === `/v1/exercises/${U.exerciseB}`) {
    return { status: 200, body: wireExerciseGet() };
  }
  if (target.startsWith("/v1/exercises/")) {
    return { status: 404, body: '{"errorCode":"not_found","message":null}' };
  }
  if (target.startsWith("/v1/workouts") && !target.startsWith("/v1/workouts/")) {
    if (target.includes("pageToken=synthetic-expired-token")) {
      return { status: 410, body: '{"errorCode":"page_expired","message":null}' };
    }
    return { status: 200, body: wireWorkoutPage() };
  }
  if (target === `/v1/workouts/${U.workout}`) {
    return { status: 200, body: wireWorkoutGet() };
  }
  if (target.startsWith("/v1/routines") && !target.startsWith("/v1/routines/")) {
    return { status: 200, body: wireRoutinePage() };
  }
  if (target === `/v1/routines/${U.routineSaved}`) {
    return { status: 200, body: wireRoutineGet() };
  }
  if (target === `/v1/routines/${U.routineDraft}`) {
    return { status: 200, body: wireDraftGet() };
  }
  if (target.startsWith("/v1/routines/")) {
    return { status: 404, body: '{"errorCode":"not_found","message":null}' };
  }
  if (target.startsWith("/v1/auth/refresh")) {
    // Placeholder held/aborted in the begun-refresh settlement case and never
    // consumed as a grant: NOT a ServiceSession validity claim.
    return { status: 200, body: '{"errorCode":"temporarily_unavailable"}' };
  }
  return { status: 404, body: '{"errorCode":"not_found","message":null}' };
}

function ensurePrivateDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  // Explicit mode independent of the inherited umask.
  fs.chmodSync(dir, 0o700);
}

// Smallest real isolated preparation (authored, NOT executed): provision one
// synthetic profile on the expressly isolated bus/roots, then install the
// relay-prepared synthetic grant bytes against the EXACT pre-auth facade
// binding captured from openSessionState (null account, generation0). A null
// grantBytes input prepares a signed-out skeleton and returns its binding.
// The installed binding returned is authoritative; no local account guessing.
export async function prepareIsolatedProfile({
  profileRoot,
  busAddress,
  origin,
  grantBytes = null,
  timeoutMs = 5000,
}) {
  for (const [name, value] of Object.entries({
    profileRoot,
    busAddress,
    origin,
  })) {
    if (value === undefined || value === null || value === "") {
      throw new Error(`BLOCKED: prepareIsolatedProfile requires ${name}`);
    }
  }
  const profile = await provisionProfile({
    origin,
    profileRoot,
    secretServiceBusAddress: busAddress,
    timeoutMs,
  });
  try {
    const session = await openSessionState({ profile });
    try {
      const preAuth = session.binding;
      if (preAuth.accountUuid !== null || preAuth.sessionGeneration !== 0) {
        throw new Error("BLOCKED: freshly provisioned facade is not pre-auth");
      }
      if (grantBytes === null || grantBytes === undefined) {
        return preAuth;
      }
      return await session.installInitialGrant(preAuth, grantBytes, new AbortController().signal);
    } finally {
      session.invalidate();
    }
  } finally {
    // Release the T04 owner so the runtime under test can acquire it.
    await profile.close();
  }
}

// Startup pair writer for isolated startup (0600, separate files,
// outside both storage roots). Returns { configPath, descriptorPath }.
export function writeStartupPair({ dir, origin, profileRoot, busAddress, writesEnabled = false }) {
  const configPath = path.join(dir, "synthetic-config.json");
  const config = {
    version: 2,
    serviceOrigin: origin,
    storage: { profileRoot, secretServiceBusAddress: busAddress },
    ...(writesEnabled ? { writesEnabled: true } : {}),
  };
  fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
  return { configPath };
}

export function makeIsolatedScratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gt-s1-qa-"));
  fs.chmodSync(dir, 0o700);
  return dir;
}

// Deterministic relay preparation contract (authored, NOT executed): builds
// every required isolated config under base and returns the exact GT_S1_*
// manifest the execution relay must export. The relay launcher supplies
// values; it invents no oracles. Trust via NODE_EXTRA_CA_CERTS in the child.
export async function prepareS1RelayFixtures({
  base,
  busAddress,
  origin,
  liveGrantBytes,
  expiredGrantBytes,
}) {
  for (const [name, value] of Object.entries({
    base,
    busAddress,
    origin,
    liveGrantBytes,
    expiredGrantBytes,
  })) {
    if (value === undefined || value === null || value === "") {
      throw new Error(`BLOCKED: prepareS1RelayFixtures requires ${name}`);
    }
  }
  async function buildCase(name, grantBytes, extra = {}) {
    const dir = path.join(base, name);
    ensurePrivateDir(dir);
    const profileRoot = path.join(dir, "profile");
    await prepareIsolatedProfile({
      profileRoot,
      busAddress,
      origin,
      grantBytes,
    });
    return writeStartupPair({
      dir,
      origin,
      profileRoot,
      busAddress,
      ...extra,
    });
  }
  const manifest = {};
  manifest.GT_S1_CONFIGURED_CONFIG = (await buildCase("configured", liveGrantBytes)).configPath;
  manifest.GT_S1_SIGNED_OUT_CONFIG = (await buildCase("signed-out", null)).configPath;
  manifest.GT_S1_WRITES_CONFIG = (
    await buildCase("writes", liveGrantBytes, { writesEnabled: true })
  ).configPath;
  manifest.GT_S1_EXPIRED_GRANT_CONFIG = (await buildCase("expired", expiredGrantBytes)).configPath;
  // Authenticated binding cannot conflict with a separate descriptor anymore.
  // A foreign trusted origin is a retained opening failure before any auth send.
  const conflict = await buildCase("conflict", liveGrantBytes);
  const config = JSON.parse(fs.readFileSync(conflict.configPath));
  config.serviceOrigin = "https://foreign-storage.example.invalid";
  fs.writeFileSync(conflict.configPath, JSON.stringify(config));
  manifest.GT_S1_CONFLICT_CONFIG = conflict.configPath;
  return manifest;
}

// Controlled synthetic HTTPS fixture with held-response coordination.
// Trust arrives via the relay-provided NODE_EXTRA_CA_CERTS environment, never
// via production config. Authored only; execution needs the frozen relay.
export function createHeldFixture({ key, cert }) {
  if (!(key instanceof Uint8Array) || !(cert instanceof Uint8Array)) {
    throw new Error("BLOCKED: createHeldFixture requires key/cert bytes");
  }
  const requests = [];
  let responder = null;
  let held = [];
  const server = https.createServer({ key, cert }, (req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const summary = {
        method: req.method,
        target: req.url,
        body: Buffer.concat(chunks),
      };
      requests.push(summary);
      const reply = async () => {
        const out = responder ? responder(summary) : null;
        const status = out?.status ?? 404;
        const body = out?.body ?? '{"errorCode":"not_found","message":null}';
        res.writeHead(status, { "content-type": "application/json" });
        res.end(body);
      };
      if (held.length > 0) {
        const gate = held.shift();
        gate.then(reply, reply);
      } else {
        void reply();
      }
    });
  });
  let origin = null;
  return {
    get requests() {
      return requests;
    },
    get origin() {
      return origin;
    },
    setResponder(fn) {
      responder = fn;
    },
    holdNext() {
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      held.push(gate);
      return release;
    },
    async listen() {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      origin = `https://127.0.0.1:${address.port}`;
      return origin;
    },
    async close() {
      await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    },
  };
}

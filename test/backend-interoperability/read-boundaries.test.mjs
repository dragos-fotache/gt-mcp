// Shared MCP M04-M09; backend v1 boolean filters, live keysets and Int64 rules.
import { describe, it } from "vitest";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { check, fixture, processSession } from "./helpers.mjs";
import { routine, workout } from "./read-fixtures.mjs";

async function tool(session, name, args = {}) {
  const result = await session.client.callTool({ name, arguments: args });
  check(
    result.content[0].text === JSON.stringify(result.structuredContent),
    "Read envelopes differ",
  );
  return result.structuredContent;
}

async function close(session) {
  if (!session) return;
  await session.close("eof");
  check(session.stderr() === "", "Read process emitted unexpected diagnostics");
}

const ids = (items) => items.map((item) => item.id);

describe("T16-S3 actual read boundaries", () => {
  it("preserves boolean filters, normalized continuation/refresh context and explicit page limits", async () => {
    const f = await fixture();
    let session;
    try {
      const catalogue = (await f.request("GET", "/v1/catalogue/exercises?limit=200")).value;
      const muscles = [
        ...new Set(catalogue.items.flatMap((item) => item.muscleGroups.map((m) => m.id))),
      ];
      const equipment = [
        ...new Set(catalogue.items.flatMap((item) => item.equipment.map((e) => e.id))),
      ];
      check(muscles.length >= 2 && equipment.length >= 2, "Canonical filter fixtures unavailable");
      const [m1, m2] = muscles,
        [e1, e2] = equipment;
      const definitions = [
        [m1, e1],
        [m2, e2],
        [m1, e2],
        [m2, null],
      ];
      const created = [];
      for (const [primaryMuscleGroupId, equipmentId] of definitions) {
        const id = randomUUID();
        check(
          (
            await f.request("POST", "/v1/exercises", {
              id,
              name: "T16 Boundary Filter",
              primaryMuscleGroupId,
              equipmentId,
            })
          ).status === 201,
          "Owned filter fixture creation failed",
        );
        created.push(id);
      }
      check(
        (
          await f.request(
            "POST",
            "/v1/exercises",
            {
              id: randomUUID(),
              name: "T16 Boundary Filter",
              primaryMuscleGroupId: m1,
              equipmentId: e1,
            },
            f.foreign,
          )
        ).status === 201,
        "Foreign filter fixture creation failed",
      );
      session = await processSession(f.configPath);
      const muscleOr = await tool(session, "search_exercises", {
        search: "t16 BOUNDARY filter",
        muscleGroupIds: [m2, m1],
        equipmentIds: [e1],
        limit: 200,
      });
      check(
        muscleOr.ok &&
          isDeepStrictEqual(ids(muscleOr.data.items), [created[0]]) &&
          !muscleOr.data.hasMore &&
          muscleOr.data.nextPageToken === null,
        "Muscle OR/equipment AND or foreign visibility failed",
      );
      const equipmentOr = await tool(session, "search_exercises", {
        search: "t16 boundary FILTER",
        muscleGroupIds: [m1],
        equipmentIds: [e2, e1],
        limit: 200,
      });
      check(
        equipmentOr.ok &&
          isDeepStrictEqual(ids(equipmentOr.data.items), [created[0], created[2]].sort()),
        "Equipment OR/muscle AND semantics failed",
      );
      const context = {
        search: "T16 Boundary Filter",
        muscleGroupIds: [m2, m1, m1],
        equipmentIds: [e2, e1, e2],
        limit: 1,
      };
      const expected = created.slice(0, 3).sort();
      const first = await tool(session, "search_exercises", context);
      check(
        first.ok &&
          first.data.items.length === 1 &&
          first.data.items[0].id === expected[0] &&
          first.data.hasMore,
        "Limit1 did not return the first complete canonical UUID page",
      );
      f.expireAccess();
      const equivalent = {
        ...context,
        search: "t16 boundary filter",
        muscleGroupIds: [m1, m2],
        equipmentIds: [e1, e2],
        pageToken: first.data.nextPageToken,
      };
      const next = await tool(session, "search_exercises", equivalent);
      check(
        next.ok &&
          next.data.items.length === 1 &&
          next.data.items[0].id === expected[1] &&
          next.data.catalogueVersion === first.data.catalogueVersion &&
          f.authRequests.length === 1,
        "Same-account refresh or normalized continuation changed context",
      );
      for (const args of [
        { ...equivalent, limit: 200 },
        { ...equivalent, search: "changed filter" },
      ]) {
        const invalid = await tool(session, "search_exercises", args);
        check(
          !invalid.ok && invalid.error.code === "invalid_page_token",
          "Changed page context silently restarted",
        );
      }
      const wrongEndpoint = await tool(session, "list_routines", {
        limit: 1,
        pageToken: first.data.nextPageToken,
      });
      check(
        !wrongEndpoint.ok && wrongEndpoint.error.code === "invalid_page_token",
        "Foreign endpoint page token was accepted",
      );
      const foreignRoute = `/v1/catalogue/exercises?q=t16%20boundary%20filter&limit=1&muscleGroupId=${m1}&muscleGroupId=${m2}&equipmentId=${e1}&equipmentId=${e2}&pageToken=${encodeURIComponent(first.data.nextPageToken)}`;
      const wrongAccount = await f.request("GET", foreignRoute, undefined, f.foreign);
      check(
        wrongAccount.status === 400 && wrongAccount.value.errorCode === "invalid_page_token",
        "Page token crossed account binding",
      );
      const large = await tool(session, "search_exercises", { limit: 200 });
      check(large.ok, `Limit200 request failed with ${large.error?.code ?? "unknown"}`);
      check(
        large.data.items.length === 200 && large.data.hasMore && large.data.nextPageToken,
        `Limit200 page envelope differs: count=${large.data.items.length}, hasMore=${large.data.hasMore}, token=${Boolean(large.data.nextPageToken)}`,
      );
      check(
        large.data.items.some(
          (item) =>
            !item.isUserCreated &&
            new Set(item.muscleGroups.map((group) => group.id)).size < item.muscleGroups.length,
        ),
        "Actual page did not preserve valid bundled cross-role membership",
      );
      check(f.mutations.length === 0, "Read/filter calls dispatched mutations");
      await close(session);
      session = undefined;
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("preserves own/foreign/missing visibility, saved-only lists and workout status/order", async () => {
    const f = await fixture();
    let session;
    try {
      const saved = await routine(f),
        draft = await routine(f, { saved: false });
      const foreignRoutine = await routine(f, { owner: f.foreign });
      const finished = await workout(f),
        active = await workout(f, { finished: false, startedAt: "2026-01-06T18:00:00Z" });
      const foreignWorkout = await workout(f, { owner: f.foreign });
      session = await processSession(f.configPath);
      for (const [name, key, own, foreign] of [
        ["get_exercise", "exerciseId", f.customs[0], f.foreignId],
        ["get_routine", "routineId", draft.id, foreignRoutine.id],
        ["get_workout", "workoutId", finished.id, foreignWorkout.id],
      ]) {
        const visible = await tool(session, name, { [key]: own });
        check(visible.ok && visible.data.id === own, "Owned resource was not readable");
        for (const id of [foreign, randomUUID()]) {
          const hidden = await tool(session, name, { [key]: id });
          check(
            !hidden.ok && hidden.error.code === "not_found",
            "Foreign/missing resource existence was disclosed",
          );
        }
      }
      for (const limit of [1, 200]) {
        const savedOnly = await tool(session, "list_routines", { limit });
        check(
          savedOnly.ok &&
            isDeepStrictEqual(ids(savedOnly.data.items), [saved.id]) &&
            !savedOnly.data.hasMore &&
            savedOnly.data.nextPageToken === null,
          "Saved routine list leaked draft/foreign or failed page envelope",
        );
      }
      const first = await tool(session, "list_workouts", { limit: 1 });
      check(
        first.ok && isDeepStrictEqual(ids(first.data.items), [active.id]) && first.data.hasMore,
        "Workout first-page order/limit failed",
      );
      const tail = await tool(session, "list_workouts", {
        limit: 1,
        pageToken: first.data.nextPageToken,
      });
      check(
        tail.ok &&
          isDeepStrictEqual(ids(tail.data.items), [finished.id]) &&
          !tail.data.hasMore &&
          tail.data.nextPageToken === null,
        "Workout continuation failed complete timestamp/UUID order",
      );
      for (const [status, id] of [
        ["active", active.id],
        ["finished", finished.id],
      ]) {
        const filtered = await tool(session, "list_workouts", { status, limit: 200 });
        check(
          filtered.ok &&
            isDeepStrictEqual(ids(filtered.data.items), [id]) &&
            !filtered.data.hasMore,
          "Workout status filter leaked another state/account",
        );
      }
      const changed = await tool(session, "list_workouts", {
        limit: 1,
        status: "finished",
        pageToken: first.data.nextPageToken,
      });
      check(
        !changed.ok && changed.error.code === "invalid_page_token",
        "Workout continuation accepted changed status",
      );
      check(f.mutations.length === 0, "Read/visibility calls dispatched mutations");
      await close(session);
      session = undefined;
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("projects actual raw above-2^53 and maximum Int64 revisions without rounding or catalogue invention", async () => {
    const f = await fixture();
    let session;
    try {
      const saved = await routine(f),
        history = await workout(f);
      const high = "9007199254740993",
        max = "9223372036854775807";
      f.setReadRevision("exercise", f.customs[0], high);
      f.setReadRevision("routine", saved.id, max);
      f.setReadRevision("workout", history.id, high);
      for (const [route, expected] of [
        [`/v1/exercises/${f.customs[0]}`, high],
        [`/v1/routines/${saved.id}`, max],
        [`/v1/workouts/${history.id}`, high],
      ]) {
        const wire = await f.request("GET", route);
        check(
          wire.status === 200 &&
            new RegExp(`"revision"\\s*:\\s*${expected}(?=[,}])`).test(wire.text),
          "Backend numeric fixture did not emit the literal Int64 token",
        );
      }
      session = await processSession(f.configPath);
      for (const [name, args, revision] of [
        ["get_exercise", { exerciseId: f.customs[0] }, high],
        ["get_routine", { routineId: saved.id }, max],
        ["get_workout", { workoutId: history.id }, high],
      ]) {
        const result = await tool(session, name, args);
        check(
          result.ok && result.data.revision === revision,
          "MCP rounded a real numeric revision",
        );
      }
      for (const [name, args, id, revision] of [
        ["search_exercises", { search: "T16 fixture" }, f.customs[0], high],
        ["list_routines", {}, saved.id, max],
        ["list_workouts", {}, history.id, high],
      ]) {
        const result = await tool(session, name, args);
        check(
          result.ok && result.data.items.find((item) => item.id === id)?.revision === revision,
          "MCP list rounded a real numeric revision",
        );
      }
      const bundledWire = await f.request("GET", `/v1/exercises/${f.bundled.id}`);
      const bundled = await tool(session, "get_exercise", { exerciseId: f.bundled.id });
      check(
        bundledWire.status === 200 &&
          bundled.ok &&
          !("revision" in bundledWire.value) &&
          !("revision" in bundled.data),
        "Catalogue absence was replaced with an invented revision",
      );
      check(f.mutations.length === 0, "Numeric read calls dispatched mutations");
      await close(session);
      session = undefined;
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("keeps live keyset membership and fixed authentic token expiry explicit across refresh", async () => {
    const f = await fixture({ customCount: 3 });
    let session,
      clockChanged = false;
    try {
      session = await processSession(f.configPath);
      const initial = await tool(session, "search_exercises", { search: "T16 fixture", limit: 1 });
      check(initial.ok && initial.data.hasMore, "Live-page fixture did not issue a continuation");
      const sorted = [...f.customs].sort(),
        firstId = initial.data.items[0].id;
      check(firstId === sorted[0], "Initial UUID keyset order failed");
      check(
        (await f.request("DELETE", `/v1/exercises/${sorted[2]}`)).status === 204,
        "Live-page delete setup failed",
      );
      check(
        (
          await f.request("PUT", `/v1/exercises/${sorted[1]}`, {
            id: sorted[1],
            name: "T16 fixture changed",
          })
        ).status === 200,
        "Live-page update setup failed",
      );
      let inserted = randomUUID();
      for (let attempt = 0; inserted <= firstId && attempt < 100; attempt++)
        inserted = randomUUID();
      check(inserted > firstId, "Live-page insertion fixture could not follow the anchor");
      check(
        (await f.request("POST", "/v1/exercises", { id: inserted, name: "T16 fixture inserted" }))
          .status === 201,
        "Live-page insert setup failed",
      );
      const live = await tool(session, "search_exercises", {
        search: "T16 fixture",
        limit: 1,
        pageToken: initial.data.nextPageToken,
      });
      const liveExpected = [sorted[1], inserted].sort();
      check(
        live.ok &&
          live.data.items[0].id === liveExpected[0] &&
          live.data.items[0].name ===
            (liveExpected[0] === inserted ? "T16 fixture inserted" : "T16 fixture changed"),
        "Continuation returned frozen or deleted membership",
      );
      const issued = await tool(session, "search_exercises", { search: "T16 fixture", limit: 1 });
      const serviceStart = Date.now();
      clockChanged = true;
      await f.restartBackend(new Date(serviceStart + 10 * 60000).toISOString());
      const continued = await tool(session, "search_exercises", {
        search: "T16 fixture",
        limit: 1,
        pageToken: issued.data.nextPageToken,
      });
      check(
        continued.ok && continued.data.hasMore && continued.data.nextPageToken,
        "Authentic unexpired continuation failed after service restart",
      );
      await f.restartBackend(new Date(serviceStart + 16 * 60000).toISOString());
      const expired = await tool(session, "search_exercises", {
        search: "T16 fixture",
        limit: 1,
        pageToken: continued.data.nextPageToken,
      });
      check(
        !expired.ok && expired.error.code === "page_expired" && f.authRequests.length === 1,
        "Original token expiry slid, refreshed silently or lost its explicit error",
      );
      const fresh = await tool(session, "search_exercises", { search: "T16 fixture", limit: 1 });
      check(
        fresh.ok && fresh.data.items[0].id === sorted[0],
        "Explicit fresh traversal did not restart at the first live row",
      );
      check(f.mutations.length === 0, "Live/expiry read calls dispatched mutations");
      await close(session);
      session = undefined;
      await f.restartBackend();
      clockChanged = false;
    } finally {
      await close(session);
      if (clockChanged) await f.restartBackend();
      await f.close();
    }
  }, 90000);
});

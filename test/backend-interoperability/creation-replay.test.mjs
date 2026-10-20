// Oracles come from shared MCP C01/C02/C05/R02 and backend replay/sync rules.
// Failure messages deliberately omit account/resource identities and bodies.
import { describe, it } from "vitest";
import { isDeepStrictEqual } from "node:util";
import { check, fixture, processSession } from "./helpers.mjs";

async function tool(session, name, args = {}) {
  const result = await session.client.callTool({ name, arguments: args });
  check(
    result.content.length === 1 &&
      result.content[0].text === JSON.stringify(result.structuredContent),
    "MCP structured/text envelopes differ",
  );
  return result.structuredContent;
}

function complete(f, intent, result) {
  check(
    result.ok &&
      result.data.status === "saved" &&
      isDeepStrictEqual(Object.keys(result.data).sort(), ["routineId", "status"]),
    "Explicit creation did not return the current saved result",
  );
  const root = result.data.routineId;
  const observed = f.observe(root);
  check(
    observed.roots === 1 &&
      observed.entries === 3 &&
      observed.sets === 3 &&
      observed.revision === 3,
    "Database root/child/revision effects differ from the three-step contract",
  );
  check(
    observed.replays === 3 && new Set(observed.keys).size === 3,
    "Resource replay evidence is not exactly three distinct keys",
  );
  check(observed.batches === 3, "Database did not publish exactly one batch per creation step");
  check(
    observed.changes.length === 3 &&
      observed.changes.every((change, index) => change.revision === index + 1),
    "Database sync history has duplicate/missing revisions",
  );
  const first = f.mutations.find((request) => request.route === "/v1/routines");
  const populate = f.mutations.find((request) => request.method === "PUT");
  const save = f.mutations.find((request) => request.route.endsWith("/save"));
  check(
    first.method === "POST" &&
      JSON.parse(first.body).id === root &&
      populate.route === `/v1/routines/${root}` &&
      save.method === "POST",
    "Three-step routes/root identity changed",
  );
  const body = JSON.parse(populate.body);
  check(
    observed.name === intent.name &&
      observed.draft === false &&
      isDeepStrictEqual(observed.children, body.exercises),
    "Independent database values/relationships/order differ from the submitted routine",
  );
  check(
    body.name === intent.name && body.isDraft === true && body.id === root,
    "Populated draft changed the name/state/root identity",
  );
  check(
    body.exercises.every(
      (entry, index) =>
        entry.position === index && entry.exerciseId === intent.exercises[index].exerciseId,
    ),
    "Exercise references/order changed",
  );
  check(
    body.exercises[0].restDurationSeconds === 30 &&
      body.exercises[1].restDurationSeconds === 0 &&
      body.exercises[2].sets.length === 0,
    "Default/zero rest or empty sets changed",
  );
  check(
    isDeepStrictEqual(
      body.exercises[0].sets.map(({ position, repetitions, weightKg }) => ({
        position,
        repetitions,
        weightKg,
      })),
      [
        { position: 0, repetitions: null, weightKg: null },
        { position: 1, repetitions: 0, weightKg: 0 },
      ],
    ),
    "Default/null/zero set values changed",
  );
  const ids = [
    root,
    ...body.exercises.flatMap((entry) => [entry.id, ...entry.sets.map((set) => set.id)]),
  ];
  check(new Set(ids).size === 7, "Generated root/entry/set identities are not distinct");
  for (const record of [
    body,
    ...body.exercises,
    ...body.exercises.flatMap((entry) => entry.sets),
  ]) {
    check(
      !["revision", "notes", "restSeconds", "isCompleted"].some((key) => key in record),
      "Forbidden creation field was sent",
    );
  }
  return { root, observed, body };
}

describe("T21-S5 actual backend/database MCP boundary", () => {
  it("preserves account visibility, default paging, ordered creation and ordinary sync publication", async () => {
    const f = await fixture({ customCount: 21 });
    let session;
    try {
      session = await processSession(f.configPath);
      const page = await tool(session, "search_exercises", { search: "t16 FIXTURE" });
      check(
        page.ok &&
          page.data.items.length === 20 &&
          page.data.hasMore &&
          page.data.nextPageToken &&
          typeof page.data.catalogueVersion === "string",
        "Default search page is incomplete or misbound",
      );
      check(
        page.data.items.every((item) => f.customs.includes(item.id)),
        "Search disclosed a foreign exercise",
      );
      const tail = await tool(session, "search_exercises", {
        search: "t16 FIXTURE",
        pageToken: page.data.nextPageToken,
      });
      check(
        tail.ok &&
          tail.data.items.length === 1 &&
          !tail.data.hasMore &&
          tail.data.nextPageToken === null,
        "Same-context continuation failed",
      );
      const hidden = await tool(session, "get_exercise", { exerciseId: f.foreignId });
      check(
        !hidden.ok && hidden.error.code === "not_found",
        "Foreign exercise existence was disclosed",
      );
      const intent = f.intent();
      const result = await tool(session, "create_routine", intent);
      const { root, observed, body } = complete(f, intent, result);
      const listed = await tool(session, "list_routines");
      check(
        listed.ok &&
          listed.data.items.length === 1 &&
          listed.data.items[0].id === root &&
          listed.data.items[0].isDraft === false,
        "Saved routine missing from ordinary list",
      );
      const pull = await f.request("GET", "/v1/sync/pull?limit=200");
      check(pull.status === 200 && pull.value.hasMore === false, "Ordinary sync pull failed");
      const changes = pull.value.batches
        .flatMap((batch) => batch.changes)
        .filter((change) => change.aggregateId === root);
      check(
        changes.length === 3 &&
          changes[0].record.isDraft &&
          changes[1].record.isDraft &&
          !changes[2].record.isDraft,
        "Sync failed to publish intermediate drafts and saved state",
      );
      check(
        changes.every((change, index) => change.revision === index + 1),
        "Sync revisions differ from DB history",
      );
      check(
        isDeepStrictEqual(
          changes[2].record.exercises.map((entry) => {
            const withoutLabel = { ...entry };
            delete withoutLabel.exerciseName;
            return withoutLabel;
          }),
          body.exercises,
        ),
        "Sync changed generated child IDs/relationships/order/values",
      );
      const snapshot = await f.request("GET", "/v1/sync/snapshot?limit=200");
      check(
        snapshot.status === 200 &&
          !snapshot.value.hasMore &&
          snapshot.value.records.some(
            (record) =>
              record.aggregateId === root && isDeepStrictEqual(record.record, changes[2].record),
          ),
        "Snapshot did not expose the saved canonical routine",
      );
      const before = f.mutations.length;
      const repeated = await tool(session, "create_routine", intent);
      check(
        repeated.ok && repeated.data.routineId !== root,
        "Identical explicit call did not allocate a fresh root",
      );
      const second = f.observe(repeated.data.routineId);
      const original = f.observe(root);
      check(
        f.mutations.length === before + 3 &&
          second.roots === 2 &&
          second.revision === 3 &&
          second.batches === 3 &&
          second.replays === 6 &&
          original.revision === observed.revision &&
          original.batches === observed.batches &&
          isDeepStrictEqual(original.children, observed.children) &&
          new Set(f.mutations.map((request) => request.key)).size === 6,
        "Fresh repeat rewrote the original graph or reused a step key",
      );
      await session.close();
      check(session.stderr() === "", "MCP process emitted unexpected diagnostics");
      session = undefined;
    } finally {
      await session?.close();
      await f.close();
    }
  }, 60000);

  it("lost populate response leaves a draft; restart does nothing and a new call is fresh", async () => {
    const f = await fixture();
    let session;
    try {
      f.state.lose = "populate";
      session = await processSession(f.configPath);
      const intent = f.intent();
      const interrupted = await tool(session, "create_routine", intent);
      check(
        f.state.dropped &&
          !interrupted.ok &&
          interrupted.error.retryable === false &&
          interrupted.error.lastConfirmedStep === "draft" &&
          interrupted.error.outcomeUnknown === true &&
          f.mutations.length === 2,
        "Lost committed response advanced or hid uncertainty",
      );
      const root = JSON.parse(f.mutations[0].body).id;
      check(
        interrupted.error.routineId === root && !("operationId" in interrupted.error),
        "Uncertainty context did not identify only the current invocation",
      );
      const before = f.observe(root);
      check(
        before.roots === 1 &&
          before.draft &&
          before.revision === 2 &&
          before.batches === 2 &&
          before.entries === 3 &&
          before.sets === 3,
        "Lost response did not preserve exactly the committed draft prefix",
      );
      const draft = await tool(session, "get_routine", { routineId: root });
      const list = await tool(session, "list_routines");
      check(
        draft.ok && draft.data.isDraft && list.ok && list.data.items.length === 0,
        "Own draft visibility/saved-only list differs",
      );
      await session.close("eof");
      check(session.stderr() === "", "Interrupted process emitted unexpected diagnostics");
      session = undefined;
      const local = await f.privateState();
      check(
        isDeepStrictEqual(local.files, ["credentials.enc", "owner.lock"]),
        "Creation left extra local files",
      );
      const count = f.requests.length;
      session = await processSession(f.configPath);
      check(
        f.requests.length === count && isDeepStrictEqual(f.observe(root), before),
        "Restart autonomously changed remote work",
      );
      const result = await tool(session, "create_routine", intent);
      check(
        result.ok && result.data.routineId !== root && f.mutations.length === 5,
        "New invocation resumed or reused the uncertain routine",
      );
      const other = f.observe(result.data.routineId),
        original = f.observe(root);
      check(
        other.roots === 2 &&
          other.revision === 3 &&
          !other.draft &&
          other.batches === 3 &&
          original.revision === 2 &&
          original.draft &&
          isDeepStrictEqual(original.children, before.children) &&
          new Set(f.mutations.map((request) => request.key)).size === 5,
        "Fresh attempt altered the uncertain draft or reused request identity",
      );
      await session.close();
      check(session.stderr() === "", "Fresh process emitted unexpected diagnostics");
      session = undefined;
    } finally {
      await session?.close();
      await f.close();
    }
  }, 60000);
});

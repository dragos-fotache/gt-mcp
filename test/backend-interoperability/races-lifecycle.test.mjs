/* global AbortController */
// Shared MCP R09/R10 and A07/A08/R11/R12: actual service effects, private owner.
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { describe, it } from "vitest";
import { openProfile } from "../../dist/storage/index.js";
import { openLifecycleSessionState } from "../../dist/auth/index.js";
import { signOutProfile } from "../../dist/lifecycle/index.js";
import { createCreationService } from "../../dist/creation/index.js";
import { check, fixture, processSession, waitFor } from "./helpers.mjs";

const signal = () => new AbortController().signal;
async function tool(session, name, args = {}) {
  const result = await session.client.callTool({ name, arguments: args });
  check(
    result.content[0].text === JSON.stringify(result.structuredContent),
    "MCP envelopes differ",
  );
  return result.structuredContent;
}
// DB roots/replays/keys summarize the account; compare the target aggregate
// separately when another independent creation legitimately adds account history.
function aggregateState(f, root) {
  const state = f.observe(root);
  delete state.roots;
  delete state.replays;
  delete state.keys;
  return state;
}

async function close(session) {
  if (!session) return;
  await session.close("eof");
  check(session.stderr() === "", "Unexpected MCP diagnostics");
}
async function profile(f) {
  return openProfile(f.privateProfileOptions());
}
async function edited(f, root, other) {
  const current = await f.request("GET", `/v1/routines/${root}`, undefined, other);
  check(current.status === 200, "Other client could not read its draft");
  const body = {
    id: root,
    name: "T16 other client edit",
    isDraft: true,
    exercises: current.value.exercises.map((entry) => ({
      id: entry.id,
      exerciseId: entry.exerciseId,
      position: entry.position,
      restDurationSeconds: entry.restDurationSeconds + 1,
      sets: entry.sets.map((set) => ({
        id: set.id,
        position: set.position,
        repetitions: set.repetitions,
        weightKg: set.weightKg,
      })),
    })),
  };
  // Empty drafts need valid children for save, and populated drafts retain IDs.
  if (body.exercises.length === 0)
    body.exercises = [
      {
        id: randomUUID(),
        exerciseId: f.customs[0],
        position: 0,
        restDurationSeconds: 30,
        sets: [],
      },
    ];
  const result = await f.request("PUT", `/v1/routines/${root}`, body, other);
  check(result.status === 200, "Actual other-client edit failed");
  return body;
}
async function sentinel(f, other) {
  const id = randomUUID();
  check(
    (await f.request("POST", "/v1/routines", { id }, other)).status === 201,
    "Unrelated routine setup failed",
  );
  return id;
}
describe("T21-S5 actual other-client races", () => {
  for (const stage of ["populate", "save"]) {
    it(`deletion before ${stage} stops unsent work and preserves unrelated state`, async () => {
      const f = await fixture();
      let session;
      try {
        const other = await f.newSession();
        const unrelated = await sentinel(f, other);
        const beforeUnrelated = aggregateState(f, unrelated);
        let root, afterDelete, replaysAfterDelete;
        f.state.beforeRequest = async ({ mutation, step }) => {
          if (!mutation || step !== stage) return;
          f.state.beforeRequest = null;
          root = JSON.parse(f.mutations[0].body).id;
          check(
            (await f.request("DELETE", `/v1/routines/${root}`, undefined, other)).status === 204,
            "Actual other-client delete failed",
          );
          afterDelete = aggregateState(f, root);
          replaysAfterDelete = f.observe(root).replays;
        };
        session = await processSession(f.configPath);
        const result = await tool(session, "create_routine", f.intent());
        check(
          !f.state.hookFailed &&
            afterDelete &&
            !result.ok &&
            result.error.code === "not_found" &&
            result.error.retryable === false &&
            result.error.lastConfirmedStep === (stage === "populate" ? "draft" : "populate") &&
            result.error.outcomeUnknown === false,
          "In-call deletion was not reported truthfully",
        );
        check(
          f.mutations.length === (stage === "populate" ? 2 : 3) &&
            isDeepStrictEqual(aggregateState(f, root), afterDelete) &&
            f.observe(root).replays === replaysAfterDelete + 1 &&
            f.mutations.at(-1).status === 404 &&
            isDeepStrictEqual(aggregateState(f, unrelated), beforeUnrelated),
          "Rejected creation rewrote deleted or unrelated state or sent dependent work",
        );
      } finally {
        await close(session);
        await f.close();
      }
    }, 60000);
  }

  for (const stage of ["populate", "save"]) {
    it(`${stage}: actual in-call edit preserves last-write-wins and truthful saved conflict`, async () => {
      const f = await fixture();
      let session;
      try {
        const intent = f.intent();
        const other = await f.newSession();
        const unrelated = await sentinel(f, other);
        const beforeUnrelated = aggregateState(f, unrelated);
        let root, otherBody, beforeRace;
        f.state.beforeRequest = async ({ mutation, step }) => {
          if (!mutation || step !== stage) return;
          f.state.beforeRequest = null;
          root = JSON.parse(f.mutations[0].body).id;
          // Another actual client commits before the next creation step.
          otherBody = await edited(f, root, other);
          beforeRace = f.observe(root);
        };
        session = await processSession(f.configPath);
        const result = await tool(session, "create_routine", intent);
        check(!f.state.hookFailed && otherBody && beforeRace, "In-call race was not reached");
        const final = f.observe(root);
        check(
          final.roots === 2 &&
            final.draft === false &&
            final.revision === 4 &&
            final.batches === 4 &&
            final.replays === 5,
          "Actual race history duplicated or rolled back effects",
        );
        if (stage === "populate") {
          check(
            result.ok && result.data.routineId === root,
            "Actual LWW populate did not complete",
          );
          const body = JSON.parse(f.mutations.find((m) => m.method === "PUT").body);
          check(
            final.name === intent.name &&
              isDeepStrictEqual(final.children, body.exercises) &&
              beforeRace.name === otherBody.name,
            "Actual PUT did not overwrite the intervening edit under LWW",
          );
        } else {
          check(
            !result.ok &&
              result.error.code === "concurrent_modification" &&
              result.error.retryable === false &&
              result.error.lastConfirmedStep === "save" &&
              result.error.outcomeUnknown === false &&
              final.name === intent.name &&
              isDeepStrictEqual(final.children, otherBody.exercises),
            "Confirmed save conflict hid the other client's actual saved shape",
          );
        }
        check(
          f.mutations.length === 3 &&
            isDeepStrictEqual(aggregateState(f, unrelated), beforeUnrelated),
          "In-call race changed unrelated state or dispatched extra workflow steps",
        );
      } finally {
        await close(session);
        await f.close();
      }
    }, 60000);
  }
});

describe("T21-S5 actual service and local lifecycle composition", () => {
  for (const kind of ["read", "write"]) {
    it(`local sign-out discards a held real ${kind} result and fences unsent steps`, async () => {
      const f = await fixture();
      let owner, auth, pending, release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      let entered = false;
      try {
        owner = await profile(f);
        const source = owner.binding;
        auth = await openLifecycleSessionState({
          profile: owner,
          transportConfig: { origin: f.origin },
        });
        f.state.afterResponse = async ({ mutation, route }) => {
          if (
            (kind === "write" && mutation?.route === "/v1/routines") ||
            (kind === "read" && route.startsWith("/v1/routines?"))
          ) {
            entered = true;
            await held;
          }
        };
        if (kind === "write") {
          const service = createCreationService({ session: auth, writesEnabled: true });
          pending = service.create(source, f.intent(), signal()).catch((error) => error);
        } else pending = auth.listRoutines(source, {}, signal()).catch((error) => error);
        await waitFor(() => entered, "Real response did not reach held delivery boundary");
        const root = kind === "write" ? JSON.parse(f.mutations[0].body).id : null;
        if (root) check(f.observe(root).revision === 1, "Held real mutation was not committed");
        const next = await auth.signOut(source);
        check(
          next.sessionGeneration === source.sessionGeneration + 1,
          "Sign-out generation differs",
        );
        release();
        const result = await pending;
        check(
          result &&
            !result.ok &&
            !("data" in result) &&
            (result.code === "operation_interrupted" ||
              result.code === "generation_mismatch" ||
              result.error?.code === "operation_interrupted"),
          "Obsolete generation exposed a real result",
        );
        check(f.mutations.length === (root ? 1 : 0), "Generation fence dispatched dependent work");
        if (root)
          check(
            f.observe(root).revision === 1 && f.observe(root).draft === true,
            "Local fence pretended to roll back an actual committed draft",
          );
        auth.invalidate();
        auth = undefined;
        await owner.close();
        owner = undefined;
        const { vault, binding, files } = await f.privateState();
        check(
          vault.grant === null &&
            binding.sessionGeneration === source.sessionGeneration + 1 &&
            isDeepStrictEqual(files, ["credentials.enc", "owner.lock"]),
          "Sign-out failed to fence the single record or retained credentials",
        );
      } finally {
        release();
        if (pending) await pending;
        auth?.invalidate();
        await owner?.close();
        await f.close();
      }
    }, 60000);
  }

  it("fresh same-account login fences identity and later creation is independent of an uncertain prefix", async () => {
    const f = await fixture();
    let session, owner, auth;
    try {
      const intent = f.intent();
      f.state.lose = "populate";
      session = await processSession(f.configPath);
      const lost = await tool(session, "create_routine", intent);
      check(!lost.ok && lost.error.outcomeUnknown, "Actual uncertain prefix not established");
      const root = lost.error.routineId;
      const before = aggregateState(f, root);
      await close(session);
      session = undefined;
      const prior = (await f.privateState()).binding;
      await signOutProfile({ configPath: f.configPath }, signal());
      const signedOut = await f.privateState();
      check(
        signedOut.vault.grant === null &&
          signedOut.binding.accountUuid === prior.accountUuid &&
          signedOut.binding.sessionGeneration === prior.sessionGeneration + 1 &&
          isDeepStrictEqual(aggregateState(f, root), before),
        "Sign-out failed to fence credentials or altered uncertain remote work",
      );
      owner = await profile(f);
      auth = await openLifecycleSessionState({
        profile: owner,
        transportConfig: { origin: f.origin },
      });
      const source = owner.binding;
      const signedOutBytes = Buffer.from(await owner.readVaultBytes());
      const rejected = await auth
        .replaceGrant(source, Buffer.from(JSON.stringify(f.foreign)), signal())
        .catch((error) => error);
      check(
        rejected.code === "operation_interrupted" &&
          Buffer.from(await owner.readVaultBytes()).equals(signedOutBytes),
        "Different verified account adopted or destroyed the bound credential record",
      );
      const fresh = await f.newSession();
      const installed = await auth.replaceGrant(
        source,
        Buffer.from(JSON.stringify(fresh)),
        signal(),
      );
      check(
        installed.accountUuid === source.accountUuid &&
          installed.profileGenerationId === source.profileGenerationId &&
          installed.sessionGeneration === source.sessionGeneration + 1,
        "Same-account fresh grant did not advance its authenticated binding",
      );
      auth.invalidate();
      auth = undefined;
      await owner.close();
      owner = undefined;
      session = await processSession(f.configPath);
      check(f.mutations.length === 2, "Reauthentication/startup resumed creation autonomously");
      const saved = await tool(session, "create_routine", intent);
      check(
        saved.ok &&
          saved.data.routineId !== root &&
          f.observe(saved.data.routineId).revision === 3 &&
          f.observe(saved.data.routineId).batches === 3 &&
          f.mutations.length === 5 &&
          isDeepStrictEqual(aggregateState(f, root), before),
        "Fresh explicit creation resumed or changed old uncertain work",
      );
    } finally {
      await close(session);
      auth?.invalidate();
      await owner?.close();
      await f.close();
    }
  }, 60000);
});

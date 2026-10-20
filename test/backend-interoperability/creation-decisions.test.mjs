/* global AbortController */
// Shared MCP A05/C04–C08/R07/R08; real service responses and independent DB effects.
// No assertions print actual grant, body, account or resource values.
import fs from "node:fs";
import { setTimeout, clearTimeout } from "node:timers";
import { isDeepStrictEqual } from "node:util";
import { describe, it } from "vitest";
import { openLifecycleSessionState } from "../../dist/auth/index.js";
import { check, fixture, processSession } from "./helpers.mjs";

async function tool(session, name, args = {}) {
  const result = await session.client.callTool({ name, arguments: args });
  check(
    result.content[0].text === JSON.stringify(result.structuredContent),
    "MCP envelopes differ",
  );
  return result.structuredContent;
}

async function close(session) {
  if (!session) return;
  await session.close("eof");
  check(session.stderr() === "", "MCP process emitted unexpected diagnostics");
}

describe("T21-S5 actual auth recovery and creation decisions", () => {
  it("durably installs authentic expired-access replay before one distinct serialized rotation", async () => {
    const f = await fixture();
    let session,
      clockChanged = false;
    try {
      const before = f.authSnapshot();
      f.expireAccess();
      f.state.lose = "refresh";
      session = await processSession(f.configPath);
      const lost = await tool(session, "list_routines");
      check(
        !lost.ok && f.state.dropped && f.authRequests.length === 1,
        "Original refresh loss did not preserve a pending attempt",
      );
      await close(session);
      session = undefined;
      const original = JSON.parse(f.authRequests[0].response);
      const now = Date.parse(original.accessExpiresAt) + 1000;
      check(now < Date.parse(original.refreshExpiresAt), "Returned refresh is not current");
      clockChanged = true;
      await f.restartBackend(new Date(now).toISOString());
      let installedBeforeRotation = false,
        checkedFreshDispatch = false;
      await f.withPrivateProfile(async (profile) => {
        // Delegate every actual commit to the real owner, then read its acknowledged
        // durable vault. This observes ordering without fabricating stored state.
        const observedOwner = {
          binding: profile.binding,
          readVaultBytes: () => profile.readVaultBytes(),
          advanceSessionGeneration: (bytes) => profile.advanceSessionGeneration(bytes),
          async commit(update) {
            await profile.commit(update);
            const durable = JSON.parse(Buffer.from(await profile.readVaultBytes()).toString());
            if (
              durable.grant?.refreshToken === original.refreshToken &&
              durable.pendingRefresh === null
            ) {
              check(
                durable.grant.accessToken === original.accessToken &&
                  durable.grant.accessExpiresAt === original.accessExpiresAt &&
                  durable.grant.refreshExpiresAt === original.refreshExpiresAt,
                "Recovered install extended or changed the original grant",
              );
              installedBeforeRotation = true;
            }
          },
        };
        f.state.beforeRequest = async ({ authRecord }) => {
          if (!authRecord || f.authRequests.length !== 3) return;
          const durable = JSON.parse(Buffer.from(await profile.readVaultBytes()).toString());
          check(
            installedBeforeRotation &&
              durable.grant.refreshToken === original.refreshToken &&
              durable.pendingRefresh.authKey === authRecord.key &&
              Buffer.from(durable.pendingRefresh.bodyBase64, "base64").equals(authRecord.body),
            "Fresh dispatch preceded durable original install/prepare",
          );
          checkedFreshDispatch = true;
        };
        const auth = await openLifecycleSessionState({
          profile: observedOwner,
          transportConfig: {
            origin: f.origin,
            testCaPem: fs.readFileSync(process.env.GT_S1_FIXTURE_CERT_FILE),
          },
          clock: { nowMs: () => now },
        });
        try {
          check(f.authRequests.length === 1, "Facade opening resumed auth autonomously");
          await Promise.all([
            auth.listRoutines(auth.binding, { limit: 1 }, new AbortController().signal),
            auth.listRoutines(auth.binding, { limit: 1 }, new AbortController().signal),
          ]);
        } finally {
          auth.invalidate();
          f.state.beforeRequest = null;
        }
      });
      check(
        !f.state.hookFailed &&
          installedBeforeRotation &&
          checkedFreshDispatch &&
          f.authRequests.length === 3,
        "Expired-access recovery did not complete one replay and one fresh rotation",
      );
      const [lostRequest, replay, rotation] = f.authRequests;
      check(
        replay.status === 200 &&
          rotation.status === 200 &&
          replay.key === lostRequest.key &&
          replay.body.equals(lostRequest.body) &&
          replay.response.equals(lostRequest.response) &&
          rotation.key !== replay.key &&
          JSON.parse(rotation.body).refreshToken === original.refreshToken,
        "Authentic auth replay changed identity/result or fresh rotation used a predecessor",
      );
      const after = f.authSnapshot();
      check(
        after.replays === before.replays + 2 && after.liveRefresh === 1 && after.revoked === 0,
        "Auth replay duplicated rotation or revoked the real session family",
      );
      const { vault } = await f.privateState();
      const successor = JSON.parse(rotation.response);
      check(
        vault.pendingRefresh === null &&
          vault.grant.refreshToken === successor.refreshToken &&
          vault.grant.accessToken === successor.accessToken &&
          vault.grant.accessExpiresAt === successor.accessExpiresAt &&
          vault.grant.refreshExpiresAt === successor.refreshExpiresAt &&
          Date.parse(successor.accessExpiresAt) > now &&
          f.mutations.length === 0,
        "Final real grant was not installed exactly or read recovery mutated domain data",
      );
      await f.restartBackend();
      clockChanged = false;
      session = await processSession(f.configPath);
      check((await tool(session, "list_routines")).ok, "Recovered profile did not reopen in MCP");
      check(f.authRequests.length === 3, "Settled reopen caused an extra rotation");
      await close(session);
      session = undefined;
    } finally {
      await close(session);
      if (clockChanged) await f.restartBackend();
      await f.close();
    }
  }, 90000);

  it("rejects an invisible reference before any domain mutation", async () => {
    const f = await fixture();
    let session;
    try {
      session = await processSession(f.configPath);
      const intent = f.intent();
      intent.exercises[0].exerciseId = f.foreignId;
      const rejected = await tool(session, "create_routine", intent);
      check(
        !rejected.ok && rejected.error.code === "invalid_reference" && f.mutations.length === 0,
        "Invisible reference was disclosed or admitted to domain writes",
      );
      const corrected = { ...intent, exercises: f.intent().exercises };
      const saved = await tool(session, "create_routine", corrected);
      check(
        saved.ok && f.mutations.length === 3 && f.observe(saved.data.routineId).roots === 1,
        "Pre-admission reference failure reserved the operation or allocated a root",
      );
      await close(session);
      session = undefined;
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("stops on actual populate rejection and permits corrected fresh input under live auth", async () => {
    const f = await fixture();
    let session;
    try {
      const intent = f.intent();
      f.state.beforeRequest = async ({ mutation, step }) => {
        if (!mutation || step !== "populate") return;
        f.state.beforeRequest = null;
        check(
          (await f.request("DELETE", `/v1/exercises/${f.customs[0]}`)).status === 204,
          "Reference deletion after successful precheck failed",
        );
      };
      session = await processSession(f.configPath);
      const rejected = await tool(session, "create_routine", intent);
      check(rejected.error?.retryable === false, "Creation failure advertised retry");
      check(
        !f.state.hookFailed &&
          !rejected.ok &&
          rejected.error.code === "invalid_reference" &&
          rejected.error.lastConfirmedStep === "draft" &&
          !rejected.error.outcomeUnknown &&
          f.mutations.length === 2 &&
          f.mutations[1].status === 422,
        "Actual reference rejection did not stop dependent save with truthful history",
      );
      const root = JSON.parse(f.mutations[0].body).id;
      const observed = f.observe(root);
      check(
        observed.roots === 1 &&
          observed.draft &&
          observed.entries === 0 &&
          observed.sets === 0 &&
          observed.revision === 1 &&
          observed.batches === 1 &&
          observed.replays === 2,
        "Populate rejection changed the committed draft or fabricated domain/sync effects",
      );
      await close(session);
      session = undefined;
      f.expireAccess();
      session = await processSession(f.configPath);
      const repeat = await tool(session, "create_routine", intent);
      check(
        !repeat.ok &&
          repeat.error.code === "invalid_reference" &&
          repeat.error.retryable === false &&
          f.mutations.length === 2 &&
          f.authRequests.length === 1 &&
          f.authRequests[0].status === 200 &&
          isDeepStrictEqual(f.observe(root), observed),
        "New call skipped live reference/auth validation or changed the old draft",
      );
      const corrected = {
        ...intent,
        name: "T21 corrected intent",
        exercises: intent.exercises.map((entry) => ({ ...entry, exerciseId: f.bundled.id })),
      };
      const saved = await tool(session, "create_routine", corrected);
      check(
        saved.ok &&
          saved.data.routineId !== root &&
          f.mutations.length === 5 &&
          f.observe(saved.data.routineId).revision === 3 &&
          f.observe(root).revision === 1,
        "Corrected fresh input resumed or rewrote the rejected draft",
      );
      await close(session);
      session = undefined;
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("creates independent concurrent identical calls and treats changed content as another fresh call", async () => {
    const f = await fixture();
    let session, release;
    try {
      const intent = f.intent();
      let reached;
      const atDraft = new Promise((resolve) => {
        reached = resolve;
      });
      const hold = new Promise((resolve) => {
        release = resolve;
      });
      f.state.beforeRequest = async ({ mutation, step }) => {
        if (!mutation || step !== "draft") return;
        f.state.beforeRequest = null;
        reached();
        await hold;
      };
      session = await processSession(f.configPath);
      const first = tool(session, "create_routine", intent);
      let timer;
      try {
        await Promise.race([
          atDraft,
          first.then(() => {
            throw new Error("Creation stopped before the held draft boundary");
          }),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("Draft gate did not become ready")), 20000);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      const identical = tool(session, "create_routine", intent);
      release();
      const [saved, same] = await Promise.all([first, identical]);
      check(
        !f.state.hookFailed &&
          saved.ok &&
          same.ok &&
          same.data.routineId !== saved.data.routineId &&
          f.mutations.length === 6,
        "Concurrent identical calls were deduplicated or reused a root",
      );
      for (const result of [saved, same]) {
        const observed = f.observe(result.data.routineId);
        check(
          observed.roots === 2 &&
            observed.revision === 3 &&
            observed.batches === 3 &&
            observed.entries === 3 &&
            observed.sets === 3 &&
            !observed.draft,
          "Independent concurrent creation lost its own graph/history",
        );
      }
      const changed = await tool(session, "create_routine", {
        ...intent,
        name: "T21 changed input",
      });
      check(
        changed.ok &&
          new Set([saved, same, changed].map((r) => r.data.routineId)).size === 3 &&
          f.mutations.length === 9 &&
          new Set(f.mutations.map((r) => r.key)).size === 9,
        "Changed explicit input reused a root or another invocation's step keys",
      );
      const obsolete = await tool(session, "create_routine", {
        ...intent,
        operationId: f.customs[0],
      });
      check(
        !obsolete.ok &&
          obsolete.error.code === "invalid_arguments" &&
          obsolete.error.retryable === false &&
          f.mutations.length === 9,
        "Obsolete operationId was accepted or dispatched work",
      );
      await close(session);
      session = undefined;
    } finally {
      release?.();
      await close(session);
      await f.close();
    }
  }, 60000);

  it("fails closed on a real reserved-root collision without regenerated identity", async () => {
    const f = await fixture();
    let session;
    try {
      const intent = f.intent();
      f.state.beforeRequest = async ({ mutation, step }) => {
        if (!mutation || step !== "draft") return;
        f.state.beforeRequest = null;
        const body = JSON.parse(mutation.body);
        check(
          (await f.request("POST", "/v1/routines", body)).status === 201,
          "Independent semantic root reservation failed",
        );
      };
      session = await processSession(f.configPath);
      const rejected = await tool(session, "create_routine", intent);
      check(rejected.error?.retryable === false, "Creation failure advertised retry");
      check(
        !f.state.hookFailed &&
          !rejected.ok &&
          rejected.error.code === "id_collision" &&
          rejected.error.lastConfirmedStep === "none" &&
          !rejected.error.outcomeUnknown &&
          f.mutations.length === 1 &&
          f.mutations[0].status === 409,
        "Actual root collision regenerated identity or dispatched dependent work",
      );
      const root = JSON.parse(f.mutations[0].body).id;
      const observed = f.observe(root);
      check(
        observed.roots === 1 &&
          observed.revision === 1 &&
          observed.batches === 1 &&
          observed.replays === 2 &&
          observed.entries === 0 &&
          observed.name === "",
        "Colliding operation overwrote or duplicated the independently reserved root",
      );
      await close(session);
      session = undefined;
      session = await processSession(f.configPath);
      const count = f.requests.length;
      check(f.mutations.length === 1, "Restart resumed the colliding attempt");
      const fresh = await tool(session, "create_routine", intent);
      check(
        fresh.ok &&
          fresh.data.routineId !== root &&
          f.mutations.length === 4 &&
          f.requests.length > count &&
          f.observe(root).revision === observed.revision &&
          f.observe(fresh.data.routineId).revision === 3,
        "Fresh explicit call reused or overwrote the independently reserved root",
      );
      await close(session);
      session = undefined;
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);
});

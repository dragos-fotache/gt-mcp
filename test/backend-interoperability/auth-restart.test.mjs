// Shared MCP A03/A04/A06 and cross-project live authorization and exact refresh recovery rules.
// Real service/DB observations; error messages never dump grants or bodies.
import { describe, it } from "vitest";
import { isDeepStrictEqual } from "node:util";
import { check, fixture, processSession } from "./helpers.mjs";

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
  check(session.stderr() === "", "MCP process emitted unexpected diagnostics");
}

describe("T21-S5 actual authentication/restart boundary", () => {
  it("serializes concurrent authoritative401 recovery into one real refresh rotation", async () => {
    const f = await fixture();
    let session;
    try {
      const before = f.authSnapshot();
      f.expireAccess();
      session = await processSession(f.configPath);
      const results = await Promise.all([
        tool(session, "list_routines"),
        tool(session, "get_exercise", { exerciseId: f.customs[0] }),
        tool(session, "search_exercises", { search: "T16 fixture" }),
      ]);
      check(
        results.every((result) => result.ok),
        "Concurrent real reads did not recover authentication",
      );
      check(
        f.authRequests.length === 1 && f.authRequests[0].status === 200,
        "Concurrent calls caused extra refresh attempts",
      );
      const after = f.authSnapshot();
      check(
        after.replays === before.replays + 1 && after.liveRefresh === 1 && after.revoked === 0,
        "Independent DB did not observe exactly one live rotation",
      );
      check(f.mutations.length === 0, "Read recovery dispatched a domain mutation");
      await close(session);
      session = undefined;
      const { vault } = await f.privateState();
      const received = JSON.parse(f.authRequests[0].response);
      check(
        vault.pendingRefresh === null &&
          vault.grant.accessToken === received.accessToken &&
          vault.grant.refreshToken === received.refreshToken &&
          vault.grant.accessExpiresAt === received.accessExpiresAt &&
          vault.grant.refreshExpiresAt === received.refreshExpiresAt,
        "Returned real grant/deadlines were not installed exactly",
      );
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("keeps exact in-call draft identity across real401 recovery and commits only three steps", async () => {
    const f = await fixture();
    let session;
    try {
      const before = f.authSnapshot();
      let expired = false;
      f.state.beforeRequest = ({ mutation, step }) => {
        if (!mutation || step !== "draft") return;
        f.state.beforeRequest = null;
        check(
          f.requests.some(
            (request) => request.method === "GET" && request.route.startsWith("/v1/exercises/"),
          ) && f.authRequests.length === 0,
          "Exercise visibility did not precede the held draft authorization boundary",
        );
        // Only the real backend credential row changes. The relay forwards the
        // original draft and its real401; it does not fabricate a rejection.
        f.expireAccess();
        expired = true;
      };
      session = await processSession(f.configPath);
      const saved = await tool(session, "create_routine", f.intent());
      check(
        !f.state.hookFailed && expired && saved.ok && saved.data.status === "saved",
        "Real draft401 recovery did not complete the invocation",
      );
      const [rejected, replayed, populate, save] = f.mutations;
      check(
        f.mutations.length === 4 &&
          rejected.status === 401 &&
          replayed.status === 201 &&
          rejected.method === "POST" &&
          rejected.route === "/v1/routines" &&
          rejected.method === replayed.method &&
          rejected.route === replayed.route &&
          rejected.key === replayed.key &&
          rejected.body.equals(replayed.body) &&
          populate.method === "PUT" &&
          populate.status === 200 &&
          save.method === "POST" &&
          save.status === 200 &&
          new Set(f.mutations.map((mutation) => mutation.key)).size === 3,
        "Authentication retry changed exact draft identity or dispatched extra steps",
      );
      const after = f.authSnapshot();
      check(
        f.authRequests.length === 1 &&
          f.authRequests[0].status === 200 &&
          after.replays === before.replays + 1 &&
          after.liveRefresh === 1 &&
          after.revoked === 0,
        "Resource401 caused extra real refresh rotations or family revocation",
      );
      const observed = f.observe(saved.data.routineId);
      check(
        observed.roots === 1 &&
          observed.entries === 3 &&
          observed.sets === 3 &&
          observed.draft === false &&
          observed.revision === 3 &&
          observed.batches === 3 &&
          observed.replays === 3 &&
          observed.changes.length === 3,
        "Resource401 recovery duplicated domain, replay or sync effects",
      );
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("recovers a lost committed refresh across backend and MCP restart with original bytes/key/grant", async () => {
    const f = await fixture();
    let session;
    try {
      const before = f.authSnapshot();
      f.expireAccess();
      f.state.lose = "refresh";
      session = await processSession(f.configPath);
      const interrupted = await tool(session, "list_routines");
      check(
        !interrupted.ok && f.state.dropped && f.authRequests.length === 1,
        "Lost refresh response did not stop the original resource request",
      );
      const committed = f.authSnapshot();
      check(
        committed.replays === before.replays + 1 &&
          committed.liveRefresh === 1 &&
          committed.revoked === 0,
        "Lost response did not leave exactly one committed real rotation",
      );
      await close(session);
      session = undefined;
      const { vault: pending } = await f.privateState();
      check(
        pending.pendingRefresh.authKey === f.authRequests[0].key &&
          Buffer.from(pending.pendingRefresh.bodyBase64, "base64").equals(f.authRequests[0].body) &&
          pending.grant.refreshToken === f.grant.refreshToken,
        "Lost refresh did not retain exact private predecessor/request identity",
      );
      await f.restartBackend();
      session = await processSession(f.configPath);
      check(f.authRequests.length === 1, "Startup resumed refresh autonomously");
      check(
        (await tool(session, "list_routines")).ok,
        "Explicit read did not settle original refresh",
      );
      check(
        f.authRequests.length === 2 &&
          f.authRequests[0].key === f.authRequests[1].key &&
          f.authRequests[0].body.equals(f.authRequests[1].body) &&
          f.authRequests[0].response.equals(f.authRequests[1].response),
        "Restart recovery changed exact refresh request/result",
      );
      check(
        isDeepStrictEqual(f.authSnapshot(), committed),
        "Auth replay rotated again or revoked the family",
      );
      await close(session);
      session = undefined;
      const { vault: settled } = await f.privateState();
      const original = JSON.parse(f.authRequests[0].response);
      check(
        settled.pendingRefresh === null &&
          settled.grant.accessToken === original.accessToken &&
          settled.grant.refreshToken === original.refreshToken &&
          settled.grant.accessExpiresAt === original.accessExpiresAt &&
          settled.grant.refreshExpiresAt === original.refreshExpiresAt,
        "Restart recovery did not install the original grant exactly",
      );
    } finally {
      await close(session);
      await f.close();
    }
  }, 90000);

  it("leaves an uncertain populate unchanged across restart and makes a later explicit call fresh", async () => {
    const f = await fixture();
    let session;
    try {
      f.state.lose = "populate";
      const intent = f.intent();
      session = await processSession(f.configPath);
      const interrupted = await tool(session, "create_routine", intent);
      check(
        !interrupted.ok &&
          interrupted.error.outcomeUnknown &&
          interrupted.error.retryable === false &&
          interrupted.error.lastConfirmedStep === "draft" &&
          f.mutations.length === 2,
        "Populate response loss did not stop the uncertain committed prefix",
      );
      const root = JSON.parse(f.mutations[0].body).id;
      const before = f.observe(root);
      const beforeAggregate = aggregateState(f, root);
      check(
        before.draft && before.revision === 2 && before.batches === 2 && before.replays === 2,
        "Committed populate prefix differs in DB",
      );
      await close(session);
      session = undefined;
      await f.restartBackend();
      check(
        isDeepStrictEqual(f.observe(root), before),
        "Service restart changed durable domain/replay history",
      );
      session = await processSession(f.configPath);
      check(f.mutations.length === 2, "Startup resumed resource mutation autonomously");
      const saved = await tool(session, "create_routine", intent);
      check(
        saved.ok && saved.data.routineId !== root && saved.data.status === "saved",
        "Later explicit creation did not allocate a fresh root",
      );
      const fresh = f.observe(saved.data.routineId);
      check(
        f.mutations.length === 5 &&
          fresh.roots === 2 &&
          fresh.entries === 3 &&
          fresh.sets === 3 &&
          fresh.revision === 3 &&
          fresh.batches === 3 &&
          fresh.replays === 5 &&
          fresh.changes.length === 3 &&
          isDeepStrictEqual(aggregateState(f, root), beforeAggregate) &&
          new Set(f.mutations.map((mutation) => mutation.key)).size === 5,
        "Fresh creation resumed old work or duplicated real domain/sync effects",
      );
    } finally {
      await close(session);
      await f.close();
    }
  }, 90000);

  for (const fence of ["logout", "account-disable"]) {
    it(`${fence} wins the real authorization lock and prevents an already in-flight workflow write`, async () => {
      const f = await fixture();
      let session, held;
      try {
        const sameAccount = fence === "logout" ? await f.newSession() : null;
        session = await processSession(f.configPath);
        held = await f.lockAccount();
        let logout;
        if (fence === "logout") {
          logout = f.logout().then(
            (reply) => reply,
            () => null,
          );
          await held.waitForBlocked(1);
        }
        const pending = tool(session, "create_routine", f.intent()).then(
          (result) => result,
          () => null,
        );
        await held.waitForBlocked(fence === "logout" ? 2 : 1);
        check(f.mutations.length === 1, "Workflow did not stop at its first serialized write");
        const root = JSON.parse(f.mutations[0].body).id;
        await held.release(fence === "account-disable");
        if (logout) check((await logout)?.status === 204, "Dedicated session logout failed");
        const rejected = await pending;
        check(
          rejected && !rejected.ok && rejected.error.code === "reauthentication_required",
          "Revoked/disabled in-flight workflow was not fenced",
        );
        const observed = f.observe(root);
        check(
          observed.roots === 0 &&
            observed.entries === 0 &&
            observed.sets === 0 &&
            observed.replays === 0 &&
            observed.batches === 0 &&
            observed.revision === null &&
            f.mutations.length === 1,
          "Revoked/disabled write left domain/replay/sync effects or dependent steps",
        );
        check(
          f.authRequests.length === 1 && f.authRequests[0].status === 401,
          "Invalid refresh was retried or unexpectedly accepted",
        );
        const unaffected = await f.request(
          "GET",
          "/v1/routines?limit=1",
          undefined,
          sameAccount ?? f.foreign,
        );
        check(unaffected.status === 200, "Fence disabled an unrelated session/account");
        await close(session);
        session = undefined;
        const { vault, binding, files } = await f.privateState();
        check(
          vault.grant?.refreshToken === f.grant.refreshToken &&
            binding.accountUuid === f.grant.account.id &&
            isDeepStrictEqual(files, ["credentials.enc", "owner.lock"]),
          "Generic authorization failure erased or rebound private credentials",
        );
      } finally {
        await held?.release();
        await close(session);
        await f.close();
      }
    }, 60000);
  }
});

/* global AbortController */
// Draft0.3 R01–R08: representative actual process/DB/SDK boundaries. Original
// exhaustive journal/recovery cases are archived and explicitly retired/mapped.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { describe, it } from "vitest";
import { check, fixture, processSession, waitFor } from "./helpers.mjs";
import { checkpointChild } from "./checkpoint-helper.mjs";

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
function aggregate(f, root) {
  const { roots, replays, keys, ...value } = f.observe(root);
  void roots;
  void replays;
  void keys;
  return value;
}
function prefix(f, root, count) {
  const observed = f.observe(root);
  check(
    observed.roots === (count === 0 ? 0 : 1) &&
      observed.revision === (count === 0 ? null : count) &&
      observed.replays === count &&
      observed.batches === count &&
      observed.entries === (count < 2 ? 0 : 3) &&
      observed.sets === (count < 2 ? 0 : 3),
    "Actual DB prefix differs from committed steps",
  );
  return aggregate(f, root);
}
function credentialBytes(f) {
  return fs.readFileSync(path.join(f.privateProfileOptions().profileRoot, "credentials.enc"));
}
async function credentialsOnly(f, before) {
  check(
    isDeepStrictEqual((await f.privateState()).files, ["credentials.enc", "owner.lock"]) &&
      credentialBytes(f).equals(before),
    "Creation persisted state or altered credentials without auth activity",
  );
}

describe("T21-S5 actual process/cancellation/failure boundaries", () => {
  for (const phase of ["before-dispatch", "after-response"]) {
    it(`${phase}: stopped child leaves no creation state and explicit restart call is fresh`, async () => {
      const f = await fixture();
      let session;
      try {
        const intent = f.intent(),
          bytes = credentialBytes(f);
        await checkpointChild({ location: f.privateProfileOptions(), intent, phase }, () =>
          check(f.requests.length === 0, "Checkpoint opening sent autonomous HTTP"),
        );
        const count = phase === "before-dispatch" ? 0 : 1;
        check(f.mutations.length === count, "Process boundary dispatched dependent work");
        const root = count ? JSON.parse(f.mutations[0].body).id : null;
        const before = root ? prefix(f, root, 1) : null;
        await credentialsOnly(f, bytes);
        const requests = f.requests.length;
        session = await processSession(f.configPath);
        check(f.requests.length === requests, "Restart autonomously resumed creation");
        const saved = await tool(session, "create_routine", intent);
        check(
          saved.ok &&
            saved.data.status === "saved" &&
            saved.data.routineId !== root &&
            f.mutations.length === count + 3 &&
            f.observe(saved.data.routineId).revision === 3,
          "Explicit call resumed old work or failed fresh creation",
        );
        if (root)
          check(isDeepStrictEqual(aggregate(f, root), before), "Fresh call rewrote stopped draft");
        await close(session);
        session = undefined;
        await credentialsOnly(f, bytes);
      } finally {
        await close(session);
        await f.close();
      }
    }, 60000);
  }

  it("lost final MCP reply leaves a saved routine; later explicit call creates another", async () => {
    const f = await fixture();
    let session;
    try {
      const intent = f.intent(),
        bytes = credentialBytes(f);
      session = await processSession(f.configPath);
      const lost = session.loseSavedReply();
      const delivered = session.client.callTool({ name: "create_routine", arguments: intent }).then(
        () => true,
        () => false,
      );
      const original = (await lost).structuredContent;
      check(
        original.ok && original.data.status === "saved",
        "Loss boundary did not observe saved result",
      );
      await close(session);
      session = undefined;
      check(!(await delivered), "Discarded MCP result reached SDK caller");
      const root = original.data.routineId,
        before = prefix(f, root, 3);
      await credentialsOnly(f, bytes);
      const requests = f.requests.length;
      session = await processSession(f.configPath);
      check(f.requests.length === requests, "Lost-result restart sent autonomous HTTP");
      const next = await tool(session, "create_routine", intent);
      check(
        next.ok &&
          next.data.routineId !== root &&
          f.mutations.length === 6 &&
          f.observe(next.data.routineId).revision === 3 &&
          isDeepStrictEqual(aggregate(f, root), before),
        "New explicit call replayed a receipt or changed the original saved graph",
      );
      await close(session);
      session = undefined;
      await credentialsOnly(f, bytes);
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("SDK cancellation before dispatch sends nothing; after populate commit stops save without rollback", async () => {
    const f = await fixture();
    let session, release, held;
    try {
      const bytes = credentialBytes(f),
        intent = f.intent();
      session = await processSession(f.configPath);
      const pre = new AbortController();
      pre.abort();
      const preCanceled = await session.client
        .callTool({ name: "create_routine", arguments: intent }, undefined, { signal: pre.signal })
        .then(
          () => false,
          () => true,
        );
      check(preCanceled && f.requests.length === 0, "Canceled call sent HTTP");
      const hold = new Promise((resolve) => {
        release = resolve;
      });
      f.state.afterResponse = async ({ mutation, step }) => {
        if (!mutation || step !== "populate") return;
        f.state.afterResponse = null;
        held = mutation;
        await hold;
      };
      const controller = new AbortController();
      const canceled = session.client
        .callTool({ name: "create_routine", arguments: intent }, undefined, {
          signal: controller.signal,
        })
        .then(
          () => false,
          () => true,
        );
      await waitFor(() => held !== undefined, "Actual response did not reach cancellation gate");
      const root = JSON.parse(f.mutations[0].body).id,
        before = prefix(f, root, 2);
      controller.abort();
      check(await canceled, "SDK delivered canceled result");
      await waitFor(() => held.disconnected, "Cancellation did not close downstream request", 2000);
      release();
      await session.client.listTools();
      await close(session);
      session = undefined;
      check(
        !f.state.hookFailed &&
          f.mutations.length === 2 &&
          isDeepStrictEqual(aggregate(f, root), before),
        "Cancellation sent dependent work or rolled back the draft",
      );
      await credentialsOnly(f, bytes);
      const count = f.requests.length;
      session = await processSession(f.configPath);
      check(f.requests.length === count, "Canceled restart resumed creation");
      const saved = await tool(session, "create_routine", intent);
      check(
        saved.ok &&
          saved.data.routineId !== root &&
          f.mutations.length === 5 &&
          isDeepStrictEqual(aggregate(f, root), before),
        "Explicit call resumed canceled work",
      );
    } finally {
      release?.();
      await close(session);
      await f.close();
    }
  }, 60000);

  it("injected Retry-After beyond budget stops without persistence; later call uses fresh identity", async () => {
    const f = await fixture();
    let session;
    try {
      const bytes = credentialBytes(f),
        intent = f.intent();
      f.state.rateLimit = "draft";
      session = await processSession(f.configPath);
      const limited = await tool(session, "create_routine", intent);
      check(
        !limited.ok &&
          limited.error.code === "rate_limited" &&
          limited.error.retryable === false &&
          limited.error.retryAfterSeconds === 60 &&
          f.mutations.length === 1 &&
          f.mutations[0].status === 429,
        "Retry-After was shortened, retried or misreported",
      );
      const root = JSON.parse(f.mutations[0].body).id;
      prefix(f, root, 0);
      await close(session);
      session = undefined;
      await credentialsOnly(f, bytes);
      f.state.rateLimit = null;
      const count = f.requests.length;
      session = await processSession(f.configPath);
      check(f.requests.length === count, "Rate-limit startup sent work");
      const saved = await tool(session, "create_routine", intent);
      check(
        saved.ok &&
          saved.data.routineId !== root &&
          f.mutations.length === 4 &&
          f.mutations[0].key !== f.mutations[1].key,
        "Fresh call reused failed invocation identity",
      );
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("real save rejection preserves another client's draft; corrected new call is independent", async () => {
    const f = await fixture();
    let session;
    try {
      const intent = f.intent();
      f.state.beforeRequest = async ({ mutation, step }) => {
        if (!mutation || step !== "save") return;
        f.state.beforeRequest = null;
        const body = JSON.parse(f.mutations.find((r) => r.method === "PUT").body);
        check(
          (
            await f.request("PUT", mutation.route.replace(/\/save$/, ""), {
              ...body,
              exercises: [],
            })
          ).status === 200,
          "Actual other-client draft clear failed",
        );
      };
      session = await processSession(f.configPath);
      const rejected = await tool(session, "create_routine", intent);
      check(
        !f.state.hookFailed &&
          !rejected.ok &&
          rejected.error.code === "validation_error" &&
          rejected.error.retryable === false &&
          rejected.error.lastConfirmedStep === "populate" &&
          !rejected.error.outcomeUnknown &&
          f.mutations.length === 3 &&
          f.mutations[2].status === 422,
        "Actual save rejection advanced work or hid committed history",
      );
      const root = JSON.parse(f.mutations[0].body).id,
        before = aggregate(f, root),
        observed = f.observe(root);
      check(
        observed.draft &&
          observed.revision === 3 &&
          observed.entries === 0 &&
          observed.sets === 0 &&
          observed.batches === 3 &&
          observed.replays === 4,
        "Save rejection restored another client's draft",
      );
      const saved = await tool(session, "create_routine", { ...intent, name: "T21 corrected" });
      check(
        saved.ok &&
          saved.data.routineId !== root &&
          f.mutations.length === 6 &&
          isDeepStrictEqual(aggregate(f, root), before),
        "Fresh call resumed rejected save or rewrote old state",
      );
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("real backend key reuse stops without identity regeneration in that invocation", async () => {
    const f = await fixture();
    let session, peer;
    try {
      f.state.beforeRequest = async ({ mutation, step }) => {
        if (!mutation || step !== "draft") return;
        f.state.beforeRequest = null;
        peer = randomUUID();
        check(
          peer !== JSON.parse(mutation.body).id &&
            (await f.request("POST", "/v1/routines", { id: peer }, f.grant, mutation.key))
              .status === 201,
          "Independent actual key claim failed",
        );
      };
      session = await processSession(f.configPath);
      const rejected = await tool(session, "create_routine", f.intent());
      check(
        !f.state.hookFailed &&
          !rejected.ok &&
          rejected.error.code === "idempotency_key_reused" &&
          rejected.error.retryable === false &&
          rejected.error.lastConfirmedStep === "none" &&
          !rejected.error.outcomeUnknown &&
          f.mutations.length === 1 &&
          f.mutations[0].status === 409,
        "Actual key reuse regenerated identity or advanced work",
      );
      const root = JSON.parse(f.mutations[0].body).id,
        observed = f.observe(root),
        other = f.observe(peer);
      check(
        observed.roots === 1 &&
          observed.revision === null &&
          observed.replays === 1 &&
          observed.batches === 0 &&
          other.revision === 1 &&
          other.batches === 1 &&
          other.draft,
        "Key reuse overwrote independent root/history",
      );
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  for (const corruption of ["malformed JSON", "unrelated target identity"]) {
    it(`${corruption} in actual success remains uncertain and never advances`, async () => {
      const f = await fixture();
      let session;
      try {
        const bytes = credentialBytes(f);
        f.state.malformed = "draft";
        f.state.corruptIdentity = corruption === "unrelated target identity";
        session = await processSession(f.configPath);
        const result = await tool(session, "create_routine", f.intent());
        check(
          !result.ok &&
            result.error.code === "internal_error" &&
            result.error.retryable === false &&
            result.error.outcomeUnknown &&
            result.error.lastConfirmedStep === "none" &&
            f.state.malformedSent &&
            f.mutations.length === 1,
          "Corrupted success fabricated confirmation",
        );
        const root = JSON.parse(f.mutations[0].body).id;
        prefix(f, root, 1);
        await close(session);
        session = undefined;
        await credentialsOnly(f, bytes);
      } finally {
        await close(session);
        await f.close();
      }
    }, 60000);
  }
});

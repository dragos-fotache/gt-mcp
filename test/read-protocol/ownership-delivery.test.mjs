/* global AbortController */
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { openConfiguredToolServer } from "../../dist/protocol/index.js";
import { acquireProfile } from "../../dist/storage/credential/acquire.js";
import { fixture } from "../fault/t15/s1-helpers.mjs";
import { rawCall, ajvValidator } from "./helpers.mjs";
import { deferred } from "./fixtures.mjs";

// One concrete delayed SDK send, using real runtime/provider/ownership. No body logging.
async function heldResponse(f) {
  const server = await openConfiguredToolServer({ configPath: f.configPath });
  const [clientTransport, transport] = InMemoryTransport.createLinkedPair();
  const entered = deferred(),
    gate = deferred();
  const unavailable = deferred();
  const send = transport.send.bind(transport),
    close = transport.close.bind(transport);
  let stopped = false,
    fail = false,
    successes = 0;
  transport.send = async (message, options) => {
    if (message.result?.structuredContent !== undefined) {
      if (message.result.structuredContent.error?.code === "recovery_unavailable")
        unavailable.resolve();
      entered.resolve();
      await gate.promise;
      if (stopped || fail) throw new Error("Synthetic result output stopped.");
      if (message.result.structuredContent.ok) successes += 1;
    }
    return send(message, options);
  };
  transport.close = async () => {
    stopped = true;
    gate.resolve();
    await close();
  };
  const client = new Client(
    { name: "synthetic-ownership-delivery", version: "0" },
    { jsonSchemaValidator: ajvValidator() },
  );
  await server.connect(transport);
  await client.connect(clientTransport);
  return {
    server,
    client,
    entered: entered.promise,
    unavailable: unavailable.promise,
    release: () => gate.resolve(),
    fail: () => {
      fail = true;
      gate.resolve();
    },
    successes: () => successes,
    async close() {
      gate.resolve();
      try {
        await server.close();
      } finally {
        await client.close();
      }
    },
  };
}
const acquire = (f) =>
  acquireProfile(
    { ...f.storage, origin: f.origin },
    { signal: new AbortController().signal, waitMs: 2000 },
  );

describe("S2 credential ownership through actual SDK result handoff", () => {
  it("suppresses a pending success when a queued call discovers unsafe profile state", async () => {
    const f = await fixture();
    let session, first, second;
    try {
      session = await heldResponse(f);
      const outcome = (request) =>
        request.then(
          (value) => ({ value }),
          (error) => ({ error }),
        );
      first = outcome(rawCall(session.client, { name: "list_routines" }));
      await session.entered;
      fs.chmodSync(f.storage.profileRoot, 0o755);
      second = outcome(rawCall(session.client, { name: "list_routines" }));
      // The old defect reaches the unavailable response; correct fencing closes
      // output first. Neither synchronization path assumes a sleeping timer.
      await Promise.race([session.unavailable, first]);
      session.release();
      expect((await first).value?.structuredContent?.ok).not.toBe(true);
      await second;
      expect(session.successes()).toBe(0);
      await session.server.close();
      fs.chmodSync(f.storage.profileRoot, 0o700);
      const owner = await acquire(f);
      await owner.close();
    } finally {
      fs.chmodSync(f.storage.profileRoot, 0o700);
      session?.release();
      await Promise.allSettled([first, second]);
      await session?.close();
      await f.close();
    }
  });
  it("retains the kernel lock until a delayed response write completes", async () => {
    const f = await fixture();
    let session, pending;
    try {
      session = await heldResponse(f);
      pending = rawCall(session.client, { name: "list_routines" });
      await session.entered;
      await expect(f.open()).rejects.toMatchObject({ code: "locked_by_other_owner" });
      await delay(25);
      session.release();
      expect((await pending).structuredContent.ok).toBe(true);
      const owner = await acquire(f);
      await owner.close();
      expect(session.successes()).toBe(1);
    } finally {
      session?.release();
      await pending?.catch(() => {});
      await session?.close();
      await f.close();
    }
  });

  it.each(["cancel", "close", "write-failure"])(
    "%s settles output before releasing ownership with no late success",
    async (mode) => {
      const f = await fixture();
      let session, pending;
      try {
        session = await heldResponse(f);
        const controller = new AbortController();
        pending = rawCall(
          session.client,
          { name: "list_routines" },
          { signal: controller.signal },
        ).then(
          (value) => ({ value }),
          (error) => ({ error }),
        );
        await session.entered;
        await expect(f.open()).rejects.toMatchObject({ code: "locked_by_other_owner" });
        if (mode === "cancel") controller.abort();
        else if (mode === "close") await session.server.close();
        else session.fail();
        expect((await pending).value?.structuredContent?.ok).not.toBe(true);
        if (mode === "write-failure")
          await expect(session.server.close()).rejects.toMatchObject({ code: "internal_error" });
        else await session.server.close();
        const owner = await acquire(f);
        await owner.close();
        session.release();
        expect(session.successes()).toBe(0);
      } finally {
        session?.release();
        await pending;
        await session?.close().catch((error) => {
          if (mode !== "write-failure") throw error;
        });
        await f.close();
      }
    },
  );
});

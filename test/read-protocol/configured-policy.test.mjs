// AUTHORED ONLY: separate isolated real-provider relay required. No ambient bus.
// Coordinator approved null-account/true-policy representative composition;
// authenticated parent/stdio behavior remains S3, not replaced by this check.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { openConfiguredReadToolServer } from "../../dist/protocol/index.js";
import { openReadRuntime } from "../../dist/runtime/index.js";
import {
  createHeldFixture,
  prepareIsolatedProfile,
  writeStartupPair,
} from "../read-runtime/fixtures.mjs";
import { requiredEnv } from "../read-runtime/helpers.mjs";
import { CREATE_ARGS } from "./fixtures.mjs";
import { connectServer, expectError, rawCall } from "./helpers.mjs";

async function prepare() {
  if (requiredEnv("GT_S2_ISOLATION_CONFIRMED") !== "t08-s2-isolated") {
    throw new Error("BLOCKED: separately verified S2 isolated environment required");
  }
  const busAddress = requiredEnv("GT_S2_TEST_BUS");
  const base = requiredEnv("GT_S2_PRIVATE_ROOT");
  const backend = createHeldFixture({
    key: fs.readFileSync(requiredEnv("GT_S2_TLS_KEY")),
    cert: fs.readFileSync(requiredEnv("GT_S2_TLS_CERT")),
  });
  const dir = fs.mkdtempSync(path.join(base, "synthetic-s2-"));
  fs.chmodSync(dir, 0o700);
  try {
    const origin = await backend.listen();
    const profileRoot = path.join(dir, "profile");
    const anchorRoot = path.join(dir, "anchor");
    const binding = await prepareIsolatedProfile({
      profileRoot,
      anchorRoot,
      busAddress,
      origin,
      profileGenerationId: randomUUID(),
      grantBytes: null,
    });
    const pair = writeStartupPair({
      dir,
      origin,
      profileRoot,
      anchorRoot,
      busAddress,
      descriptorBinding: binding,
      writesEnabled: true,
    });
    const config = JSON.parse(fs.readFileSync(pair.configPath, "utf8"));
    return {
      ...pair,
      backend,
      config,
      write(value) {
        fs.writeFileSync(pair.configPath, JSON.stringify(value), { mode: 0o600 });
      },
      async close() {
        try {
          await backend.close();
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    try {
      await backend.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    throw error;
  }
}

describe("S2 configured S1 composition (separate isolated relay)", () => {
  it("strictly accepts only the additive protocol shape/range and preserves S1 entry compatibility", async () => {
    const fixture = await prepare();
    try {
      for (const protocol of [
        undefined,
        {},
        { maxToolResultBytes: 4096 },
        { maxToolResultBytes: 67108864 },
      ]) {
        fixture.write({ ...fixture.config, ...(protocol === undefined ? {} : { protocol }) });
        const server = await openConfiguredReadToolServer({ configPath: fixture.configPath });
        await server.close();
        const runtime = await openReadRuntime({ configPath: fixture.configPath });
        await runtime.close();
      }
      for (const protocol of [
        null,
        [],
        4096,
        { unknown: true },
        { maxToolResultBytes: null },
        { maxToolResultBytes: "4096" },
        { maxToolResultBytes: false },
        { maxToolResultBytes: 4095 },
        { maxToolResultBytes: 67108865 },
        { maxToolResultBytes: 4096.5 },
      ]) {
        fixture.write({ ...fixture.config, protocol });
        await expect(
          openConfiguredReadToolServer({ configPath: fixture.configPath }),
        ).rejects.toMatchObject({ code: "configuration_required" });
        await expect(openReadRuntime({ configPath: fixture.configPath })).rejects.toMatchObject({
          code: "configuration_required",
        });
      }
      expect(fixture.backend.requests).toHaveLength(0);
    } finally {
      await fixture.close();
    }
  });

  it("true write policy cannot activate creation and config/descriptor are detached startup snapshots", async () => {
    const fixture = await prepare();
    let session;
    try {
      fixture.write({ ...fixture.config, protocol: { maxToolResultBytes: 4096 } });
      const server = await openConfiguredReadToolServer({ configPath: fixture.configPath });
      session = await connectServer(server);
      // No watcher/reload: after startup both metadata files become invalid.
      fixture.write({ version: "synthetic-invalid-replacement" });
      fs.writeFileSync(fixture.descriptorPath, "{}");
      expectError(
        await rawCall(session.client, { name: "create_routine", arguments: CREATE_ARGS }),
        "configuration_required",
        false,
        { message: "Routine creation is unavailable in this build." },
      );
      expectError(
        await rawCall(session.client, { name: "list_routines" }),
        "authentication_required",
        false,
      );
      expect(fixture.backend.requests).toHaveLength(0);
      // Short responses do NOT prove configured budget capture. Independent
      // boundary tests + Coordinator forwarding/one-read audit cover that risk.
    } finally {
      try {
        if (session) await session.close();
      } finally {
        await fixture.close();
      }
    }
  });
});

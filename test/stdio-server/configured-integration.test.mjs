/* global AbortController */
// Real stdio + isolated HTTPS/Secret Service/ext4 integration. Public boundaries only.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { setTimeout, clearTimeout } from "node:timers";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { openReadRuntime } from "../../dist/runtime/index.js";
import { requiredEnv } from "../read-runtime/helpers.mjs";
import { ajvValidator, expectEnvelope, expectError } from "../read-protocol/helpers.mjs";
import { CREATE_ARGS } from "../read-protocol/fixtures.mjs";
import {
  createHeldFixture,
  prepareIsolatedProfile,
  writeStartupPair,
  s1RelayResponder,
  SYNTHETIC_UUIDS as U,
  EXPECTED_SEARCH_PAGE,
  EXPECTED_SEARCH_PAGE_LAST,
  EXPECTED_EXERCISE,
  EXPECTED_WORKOUT,
  EXPECTED_WORKOUT_PAGE,
  EXPECTED_ROUTINE_PAGE,
  EXPECTED_ROUTINE,
  EXPECTED_DRAFT,
  wireExerciseGet,
} from "../read-runtime/fixtures.mjs";
import { INITIALIZE, SERVER, frame } from "./helpers.mjs";

async function fixture({ signedOut = false, expired = false, budget } = {}) {
  expect(requiredEnv("GT_S3_ISOLATION_CONFIRMED")).toBe("t08-s3-isolated");
  const dir = fs.mkdtempSync(path.join(requiredEnv("GT_S3_PRIVATE_ROOT"), "synthetic-stdio-"));
  const backend = createHeldFixture({
    key: fs.readFileSync(requiredEnv("GT_S1_FIXTURE_KEY_FILE")),
    cert: fs.readFileSync(requiredEnv("GT_S1_FIXTURE_CERT_FILE")),
  });
  const origin = await backend.listen();
  backend.setResponder(s1RelayResponder);
  const grant = signedOut
    ? null
    : Buffer.from(
        JSON.stringify({
          account: { id: U.account, displayName: null },
          accessToken: "synthetic-s3-access",
          refreshToken: "synthetic-s3-refresh",
          accessExpiresAt: new Date(Date.now() + (expired ? -60000 : 3600000)).toISOString(),
          refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      );
  try {
    const profileRoot = path.join(dir, "profile");
    const anchorRoot = path.join(dir, "anchor");
    const binding = await prepareIsolatedProfile({
      profileRoot,
      anchorRoot,
      busAddress: requiredEnv("GT_S3_TEST_BUS"),
      origin,
      profileGenerationId: randomUUID(),
      grantBytes: grant,
    });
    const pair = writeStartupPair({
      dir,
      origin,
      profileRoot,
      anchorRoot,
      busAddress: requiredEnv("GT_S3_TEST_BUS"),
      descriptorBinding: binding,
      writesEnabled: true,
    });
    const config = JSON.parse(fs.readFileSync(pair.configPath, "utf8"));
    config.storage.timeoutMs = 1000;
    if (budget !== undefined) config.protocol = { maxToolResultBytes: budget };
    fs.writeFileSync(pair.configPath, JSON.stringify(config), { mode: 0o600 });
    return {
      ...pair,
      backend,
      async reopen() {
        const rt = await openReadRuntime({ configPath: pair.configPath });
        await rt.close();
      },
      async close() {
        await backend.close();
        fs.rmSync(dir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await backend.close();
    // Preserve state on unexpected provisioning failure; isolated runner owns final cleanup.
    throw error;
  }
}

async function session(configPath) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER, "--config", configPath],
    env: process.env,
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr.on("data", (c) => {
    stderr += c.toString();
  });
  let closed;
  const exited = new Promise((resolve) => {
    closed = resolve;
  });
  transport.onclose = closed;
  const client = new Client(
    { name: "synthetic-s3-configured", version: "0" },
    { jsonSchemaValidator: ajvValidator() },
  );
  await client.connect(transport);
  return {
    client,
    transport,
    exited,
    stderr: () => stderr,
    async stop(signal = "SIGTERM") {
      if (transport.pid !== null) process.kill(transport.pid, signal);
      await exited;
      // SDK close can force-kill after a timer. Invoke it only after actual child exit.
      await client.close();
    },
  };
}

async function waitRequest(backend, method = "GET") {
  for (let i = 0; i < 200; i++) {
    const request = backend.requests.find((r) => r.method === method);
    if (request) return request;
    await delay(10);
  }
  throw new Error("Synthetic backend dispatch not observed");
}

describe("S3 configured actual process boundary", () => {
  it("serves all six canonical reads, continuation/context/draft visibility and true-policy no mutation", async () => {
    const f = await fixture();
    let s;
    try {
      s = await session(f.configPath);
      expect((await s.client.listTools()).tools).toHaveLength(7);
      const context = { search: "Synthetic", muscleGroupIds: [U.muscle], limit: 2 };
      const first = await s.client.callTool({ name: "search_exercises", arguments: context });
      expectEnvelope(first, { ok: true, data: EXPECTED_SEARCH_PAGE });
      expectEnvelope(
        await s.client.callTool({
          name: "search_exercises",
          arguments: { ...context, pageToken: first.structuredContent.data.nextPageToken },
        }),
        { ok: true, data: EXPECTED_SEARCH_PAGE_LAST },
      );
      for (const [name, args, data] of [
        ["get_exercise", { exerciseId: U.exerciseB }, EXPECTED_EXERCISE],
        ["list_workouts", {}, EXPECTED_WORKOUT_PAGE],
        ["get_workout", { workoutId: U.workout }, EXPECTED_WORKOUT],
        ["list_routines", {}, EXPECTED_ROUTINE_PAGE],
        ["get_routine", { routineId: U.routineSaved }, EXPECTED_ROUTINE],
        ["get_routine", { routineId: U.routineDraft }, EXPECTED_DRAFT],
      ])
        expectEnvelope(await s.client.callTool({ name, arguments: args }), { ok: true, data });
      expectError(
        await s.client.callTool({
          name: "get_routine",
          arguments: { routineId: U.foreignRoutine },
        }),
        "not_found",
        false,
        { backendErrorCode: "not_found" },
      );
      expectError(
        await s.client.callTool({
          name: "list_workouts",
          arguments: { pageToken: "synthetic-expired-token" },
        }),
        "page_expired",
        false,
        { backendErrorCode: "page_expired" },
      );
      expectError(
        await s.client.callTool({ name: "create_routine", arguments: CREATE_ARGS }),
        "configuration_required",
        false,
        { message: "Routine creation is unavailable in this build." },
      );
      expectError(
        await s.client.callTool({ name: "create_routine", arguments: {} }),
        "invalid_arguments",
        false,
      );
      expect(f.backend.requests.every((r) => r.method === "GET")).toBe(true);
      const target = new URL(f.backend.requests[1].target, "https://synthetic.invalid");
      expect(target.searchParams.get("q")).toBe("synthetic");
      expect(target.searchParams.get("limit")).toBe("2");
      expect(target.searchParams.get("muscleGroupId")).toBe(U.muscle);
      expect(target.searchParams.get("pageToken")).toBe("synthetic-continuation-1");
      // An authenticated profile must not turn malformed whole-message ingress
      // into backend authority. Public transport sends bytes the SDK Client cannot.
      const beforeMalformed = f.backend.requests.length;
      await s.transport.send({ jsonrpc: "2.0", id: 88, method: "tools/call", params: null });
      await s.exited;
      expect(s.stderr()).toBe("GymTracka MCP input protocol failure.\n");
      expect(f.backend.requests).toHaveLength(beforeMalformed);
      await f.reopen();
    } finally {
      if (s) await s.stop();
      await f.close();
    }
  });

  it("signed-out state reports auth-required with no backend dispatch", async () => {
    const f = await fixture({ signedOut: true });
    let s;
    try {
      s = await session(f.configPath);
      expectError(
        await s.client.callTool({ name: "list_routines" }),
        "authentication_required",
        false,
      );
      expect(f.backend.requests).toHaveLength(0);
      await s.stop();
      await f.reopen();
    } finally {
      if (s) await s.stop();
      await f.close();
    }
  });

  it("returns a whole too-large error instead of truncating a canonical response", async () => {
    const f = await fixture({ budget: 4096 });
    let s;
    f.backend.setResponder(() => ({
      status: 200,
      body: wireExerciseGet().replace("Synthetic Curl", "Synthetic Curl ".repeat(400)),
    }));
    try {
      s = await session(f.configPath);
      expectError(
        await s.client.callTool({ name: "get_exercise", arguments: { exerciseId: U.exerciseB } }),
        "result_too_large",
        false,
      );
    } finally {
      if (s) await s.stop();
      await f.close();
    }
  });

  it("caller cancellation suppresses a held read and leaves the process usable", async () => {
    const f = await fixture();
    let s;
    const release = f.backend.holdNext();
    try {
      s = await session(f.configPath);
      const controller = new AbortController();
      const pending = s.client
        .callTool({ name: "search_exercises" }, undefined, { signal: controller.signal })
        .then(
          () => false,
          () => true,
        );
      await waitRequest(f.backend);
      controller.abort();
      expect(await pending).toBe(true);
      release();
      expectEnvelope(await s.client.callTool({ name: "search_exercises" }), {
        ok: true,
        data: EXPECTED_SEARCH_PAGE,
      });
      expect(s.stderr()).toBe("");
    } finally {
      release();
      if (s) await s.stop();
      await f.close();
    }
  });

  it("signal during a held read releases the owner without late success", async () => {
    const f = await fixture();
    let s;
    const release = f.backend.holdNext();
    try {
      s = await session(f.configPath);
      const pending = s.client.callTool({ name: "search_exercises" }).then(
        () => false,
        () => true,
      );
      await waitRequest(f.backend);
      await s.stop();
      expect(await pending).toBe(true);
      expect(s.stderr()).toBe("");
      release();
      await f.reopen();
    } finally {
      release();
      if (s) await s.stop();
      await f.close();
    }
  });

  it("unexpected SDK fault fences the process, reports fixed failure and releases ownership", async () => {
    const f = await fixture();
    let s;
    const release = f.backend.holdNext();
    try {
      s = await session(f.configPath);
      const pending = s.client.callTool({ name: "search_exercises" }).then(
        () => false,
        () => true,
      );
      await waitRequest(f.backend);
      await s.transport.send({ jsonrpc: "2.0", id: "synthetic-unknown-response", result: {} });
      await s.exited;
      expect(await pending).toBe(true);
      expect(s.stderr()).toBe("GymTracka MCP server failed.\n");
      release();
      await f.reopen();
    } finally {
      release();
      if (s) await s.stop();
      await f.close();
    }
  });

  it("signal during begun refresh settles recoverable persistence before a new opener", async () => {
    const f = await fixture({ expired: true });
    let s;
    const release = f.backend.holdNext();
    try {
      s = await session(f.configPath);
      const pending = s.client.callTool({ name: "search_exercises" }).then(
        () => false,
        () => true,
      );
      expect((await waitRequest(f.backend, "POST")).target).toBe("/v1/auth/refresh");
      await s.stop();
      expect(await pending).toBe(true);
      expect(s.stderr()).toBe("");
      release();
      await f.reopen();
    } finally {
      release();
      if (s) await s.stop();
      await f.close();
    }
  });
});

// Small private-provider acquisition gate: monitor method metadata only, never log bodies.
async function startupGate(f) {
  const bus = requiredEnv("GT_S3_TEST_BUS");
  const provider = Number(requiredEnv("GT_S3_PROVIDER_PID"));
  let seen;
  const called = new Promise((resolve) => {
    seen = resolve;
  });
  const monitor = spawn(
    "dbus-monitor",
    ["--address", bus, "type='method_call',path_namespace='/org/freedesktop/secrets'"],
    { env: process.env, stdio: ["ignore", "pipe", "ignore"] },
  );
  let tail = "";
  monitor.stdout.on("data", (c) => {
    tail = (tail + c.toString()).slice(-2000);
    if (tail.includes("method call")) seen();
  });
  await delay(50);
  process.kill(provider, "SIGSTOP");
  const child = spawn(process.execPath, [SERVER, "--config", f.configPath], {
    env: process.env,
    stdio: "pipe",
  });
  let stdout = "",
    stderr = "";
  child.stdout.on("data", (c) => {
    stdout += c.toString();
  });
  child.stderr.on("data", (c) => {
    stderr += c.toString();
  });
  child.stdin.on("error", () => {});
  const exited = new Promise((resolve) =>
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr })),
  );
  let timeout;
  try {
    await Promise.race([
      called,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Synthetic startup provider gate not observed")),
          3000,
        );
      }),
    ]);
  } catch (error) {
    process.kill(provider, "SIGCONT");
    child.stdin.end();
    await exited;
    monitor.kill("SIGTERM");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  return {
    child,
    exited,
    resume: () => process.kill(provider, "SIGCONT"),
    async close() {
      process.kill(provider, "SIGCONT");
      child.stdin.end();
      await exited;
      monitor.kill("SIGTERM");
      await new Promise((r) => (monitor.exitCode !== null ? r() : monitor.once("close", r)));
    },
  };
}

describe("S3 acquisition shutdown races", () => {
  it("EOF during opening prevents buffered initialize dispatch and releases the acquired runtime", async () => {
    const f = await fixture();
    let gate;
    try {
      gate = await startupGate(f);
      gate.child.stdin.end(frame(INITIALIZE));
      await delay(50);
      gate.resume();
      expect(await gate.exited).toEqual({ code: 0, signal: null, stdout: "", stderr: "" });
      expect(f.backend.requests).toHaveLength(0);
      await f.reopen();
    } finally {
      if (gate) await gate.close();
      await f.close();
    }
  });
  it("a private-state opening failure overrides an earlier requested signal", async () => {
    const f = await fixture();
    let gate;
    try {
      gate = await startupGate(f);
      gate.child.kill("SIGTERM");
      expect(await gate.exited).toEqual({
        code: 78,
        signal: null,
        stdout: "",
        stderr: "GymTracka MCP private state could not be opened safely.\n",
      });
      gate.resume();
      expect(f.backend.requests).toHaveLength(0);
      await f.reopen();
    } finally {
      if (gate) await gate.close();
      await f.close();
    }
  });
});

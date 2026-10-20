// Installed CLI/server use the actual isolated Secret Service and module-relative credential worker.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { setTimeout, clearTimeout } from "node:timers";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ReadBuffer, serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";
import { afterAll, beforeAll, expect, it } from "vitest";
import { ajvValidator } from "../unit/t03/helpers.mjs";
import { fixture as authenticatedFixture, args, processSession } from "../create-stdio/helpers.mjs";
import { createArtifactFixture, installExtracted, readJson, run } from "./helpers.mjs";

async function connectInstalled(app, configPath, fixture) {
  let child,
    exited,
    stderr = "";
  const buffer = new ReadBuffer();
  const transport = {
    async start() {
      child = spawn(
        process.execPath,
        [path.join(app, "dist/protocol/server.js"), "--config", configPath],
        {
          cwd: fixture.root,
          env: fixture.env,
          stdio: "pipe",
        },
      );
      exited = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code, signal) => resolve({ code, signal }));
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.stdin.on("error", (error) => transport.onerror?.(error));
      child.stdout.on("data", (chunk) => {
        try {
          buffer.append(chunk);
          for (let message; (message = buffer.readMessage()) !== null;)
            transport.onmessage?.(message);
        } catch (error) {
          transport.onerror?.(error);
        }
      });
    },
    async send(message) {
      await new Promise((resolve, reject) =>
        child.stdin.write(serializeMessage(message), (error) =>
          error ? reject(error) : resolve(),
        ),
      );
    },
    async close() {
      child.stdin.end();
      let timer;
      try {
        const result = await Promise.race([
          exited,
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              child.kill("SIGKILL"); // failed owned-test teardown only
              reject(new Error("Installed server failed graceful EOF cleanup"));
            }, 15000);
          }),
        ]);
        expect(result).toEqual({ code: 0, signal: null });
        expect(stderr).toBe("");
      } finally {
        clearTimeout(timer);
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        await exited;
      }
    },
  };
  const client = new Client(
    { name: "synthetic-t18-holder", version: "0" },
    { jsonSchemaValidator: ajvValidator() },
  );
  try {
    await client.connect(transport, { timeout: 5000 });
    return client;
  } catch (error) {
    await transport.close();
    throw error;
  }
}

let fixture, app;
beforeAll(() => {
  if (
    process.env.GT_S3_ISOLATION_CONFIRMED !== "t08-s3-isolated" ||
    !process.env.GT_S3_TEST_BUS ||
    !process.env.GT_S3_PRIVATE_ROOT
  )
    throw new Error("Qualified private provider runner required; never use ambient services");
  fixture = createArtifactFixture();
  app = installExtracted(fixture);
}, 360000);
afterAll(() => fixture?.cleanup());

it("provisions and updates the installed app without changing credentials, then reads and removes locally", async () => {
  const privateRoot = fs.mkdtempSync(path.join(process.env.GT_S3_PRIVATE_ROOT, "t18-holder-"));
  const configPath = path.join(privateRoot, "config.json");
  const config = {
    version: 2,
    serviceOrigin: "https://synthetic-package.invalid",
    storage: {
      profileRoot: path.join(privateRoot, "profile"),
      secretServiceBusAddress: process.env.GT_S3_TEST_BUS,
      timeoutMs: 5000,
    },
    writesEnabled: false,
  };
  fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
  const cli = path.join(app, "dist/cli/main.js");
  const command = (args) =>
    run(process.execPath, [cli, ...args], { cwd: fixture.root, env: fixture.env });
  let client;
  const openProbe = `import fs from 'node:fs';
    import {openProfile} from ${JSON.stringify(pathToFileURL(path.join(app, "dist/storage/index.js")).href)};
    const config=JSON.parse(fs.readFileSync(process.argv[1]));
    let owner;
    try {owner=await openProfile({...config.storage,origin:config.serviceOrigin});process.stdout.write('opened');}
    catch(error){process.stdout.write(error.code);}
    finally{await owner?.close();}`;
  try {
    const setup = command(["setup", "--config", configPath]);
    expect(setup.stdout).toBe("");
    expect(setup.stderr).toContain("repeating a call may create a duplicate");
    const header = readJson(path.join(config.storage.profileRoot, "credentials.enc"));
    expect(header).toMatchObject({ format: "gymtracka-credentials", version: 1 });
    const { openProfile } = await import(
      pathToFileURL(path.join(app, "dist/storage/index.js")).href
    );
    const preAuth = await openProfile({ ...config.storage, origin: config.serviceOrigin });
    try {
      expect(preAuth.binding).toMatchObject({ accountUuid: null, sessionGeneration: 0 });
    } finally {
      await preAuth.close();
    }
    const credential = path.join(config.storage.profileRoot, "credentials.enc");
    const beforeUpdate = fs.readFileSync(credential);
    const updater = path.join(fixture.root, "updater");
    fs.mkdirSync(updater, { mode: 0o700 });
    run("tar", ["-xzf", fixture.archive, "-C", updater, "--no-same-owner"], {
      env: fixture.env,
    });
    const update = run(process.execPath, [path.join(updater, "package/install.mjs"), "--update"], {
      cwd: fixture.root,
      env: fixture.env,
      input: [app, configPath, "y", "y", ""].join("\n"),
    });
    expect(update.stdout).toContain("Application updated at the existing path");
    expect(fs.readFileSync(credential)).toEqual(beforeUpdate);
    client = await connectInstalled(app, configPath, fixture);
    const signedOut = await client.callTool({ name: "list_routines", arguments: {} });
    expect(signedOut.structuredContent).toMatchObject({
      ok: false,
      error: { code: "authentication_required" },
    });
    const probe = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", openProbe, configPath],
      {
        cwd: fixture.root,
        env: fixture.env,
        encoding: "utf8",
        timeout: 15000,
      },
    );
    expect(probe.error).toBeUndefined();
    expect(probe.status).toBe(0);
    expect(probe.signal).toBeNull();
    expect(probe.stderr).toBe("");
    expect(probe.stdout).toBe("opened");
    await client.close();
    client = undefined;
    const reopen = run(process.execPath, ["--input-type=module", "-e", openProbe, configPath], {
      cwd: fixture.root,
      env: fixture.env,
    });
    expect(reopen.stdout).toBe("opened");
    const removal = command(["profile-remove", "--config", configPath, "--confirm"]);
    expect(removal.stderr).toContain("erases local credentials");
    expect(fs.readdirSync(config.storage.profileRoot)).toEqual(["owner.lock"]);
  } finally {
    await client?.close();
    fs.rmSync(privateRoot, { recursive: true, force: true });
  }
}, 60000);

it("serves two installed authenticated processes sharing one unchanged credential record", async () => {
  const f = await authenticatedFixture({ writesEnabled: false });
  const credentialPath = path.join(f.storage.profileRoot, "credentials.enc");
  const original = fs.readFileSync(credentialPath);
  const options = {
    entry: path.join(app, "dist/protocol/server.js"),
    cwd: fixture.root,
    env: fixture.env,
  };
  let first, second;
  async function close(session) {
    if (!session) return;
    await session.close("eof");
    expect(session.stderr()).toBe("");
  }
  try {
    first = await processSession(f.configPath, options);
    second = await processSession(f.configPath, options);
    const expected = { ok: true, data: { items: [], hasMore: false, nextPageToken: null } };
    const responses = await Promise.all(
      [first, second].map((session) =>
        session.client.callTool({ name: "list_routines", arguments: {} }),
      ),
    );
    for (const response of responses) expect(response.structuredContent).toEqual(expected);
    const { openProfile } = await import(
      pathToFileURL(path.join(app, "dist/storage/index.js")).href
    );
    const config = readJson(f.configPath);
    const owner = await openProfile({ ...config.storage, origin: config.serviceOrigin });
    await owner.close();
    await close(first);
    first = undefined;
    expect(
      (await second.client.callTool({ name: "list_routines", arguments: {} })).structuredContent,
    ).toEqual(expected);
    const denied = await second.client.callTool({
      name: "create_routine",
      arguments: args(),
    });
    expect(denied.structuredContent).toMatchObject({
      ok: false,
      error: { code: "configuration_required", retryable: false },
    });
    expect(f.mutations()).toEqual([]);
    expect(fs.readFileSync(credentialPath)).toEqual(original);
  } finally {
    await close(first);
    await close(second);
    await f.close();
  }
}, 60000);

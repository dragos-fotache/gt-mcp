/* global AbortController */
// Shared draft0.3: current-format replacement preserves auth, never creation recovery.
// Synthetic HTTPS/provider fixtures; every candidate import/process uses the archive.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { args, fixture, processSession } from "../create-stdio/helpers.mjs";
import { expectError } from "../read-protocol/helpers.mjs";
import { createArtifactFixture, installExtracted, readJson, run, sha256 } from "./helpers.mjs";

let artifact, app, oldEntry, installedStorage, installedLogin, installedLifecycle, decodeVault;
beforeAll(async () => {
  const baseline = process.env.GT_PACKAGE_REFRESH_BASELINE_ROOT;
  if (process.env.GT_S3_ISOLATION_CONFIRMED !== "t08-s3-isolated" || !baseline)
    throw new Error("Qualified private runner and frozen accepted S5 baseline required");
  oldEntry = path.join(baseline, "dist/protocol/server.js");
  expect(fs.statSync(oldEntry).isFile()).toBe(true);
  artifact = createArtifactFixture();
  app = installExtracted(artifact);
  const load = (module) => import(pathToFileURL(path.join(app, "dist", module)).href);
  installedStorage = await load("storage/index.js");
  installedLogin = await load("login/index.js");
  installedLifecycle = await load("lifecycle/index.js");
  ({ decodeLifecycleVaultBytes: decodeVault } = await load("auth/vault.js"));
}, 360000);
afterAll(() => artifact?.cleanup());

const signal = () => new AbortController().signal;
const installed = () => ({
  entry: path.join(app, "dist/protocol/server.js"),
  cwd: artifact.root,
  env: artifact.env,
});
const command = (args) =>
  run(process.execPath, [path.join(app, "dist/cli/main.js"), ...args], {
    cwd: artifact.root,
    env: artifact.env,
  });
const call = (session, input = args()) =>
  session.client.callTool({ name: "create_routine", arguments: input });
async function close(session) {
  if (!session) return;
  await session.close("eof");
  expect(session.stderr()).toBe("");
}
function location(f) {
  const config = readJson(f.configPath);
  return { ...config.storage, origin: config.serviceOrigin };
}
async function record(f) {
  const owner = await installedStorage.openProfile(location(f));
  try {
    const bytes = Buffer.from(await owner.readVaultBytes());
    return { binding: owner.binding, bytes };
  } finally {
    await owner.close();
  }
}
function privateImage(f) {
  const image = {};
  const config = readJson(f.configPath);
  function visit(file) {
    if (!file || !fs.existsSync(file)) return;
    if (fs.statSync(file).isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) visit(path.join(file, name));
    } else image[path.relative(path.dirname(f.configPath), file)] = sha256(fs.readFileSync(file));
  }
  for (const file of [
    f.configPath,
    config.storage.profileRoot,
    config.storage.anchorRoot,
    config.bindingDescriptorPath,
  ])
    visit(file);
  return image;
}

describe("T21-S6 installed current-format replacement", () => {
  it("replaces the frozen S5 process inertly, enforces policy, and starts fresh after saved/uncertain calls", async () => {
    const f = await fixture();
    let session;
    try {
      session = await processSession(f.configPath, { entry: oldEntry, cwd: artifact.root });
      const saved = (await call(session)).structuredContent;
      expect(saved).toMatchObject({ ok: true, data: { status: "saved" } });
      f.state.malformed = "populate";
      const uncertain = await call(session);
      const uncertainRoot = JSON.parse(f.mutations().at(-2).body).id;
      expectError(uncertain, "internal_error", false, {
        routineId: uncertainRoot,
        lastConfirmedStep: "draft",
        outcomeUnknown: true,
      });
      await close(session);
      session = undefined;
      const before = f.requests.length;
      const image = privateImage(f);
      const priorRecord = await record(f);
      decodeVault(priorRecord.bytes, priorRecord.binding);
      session = await processSession(f.configPath, installed());
      expect(f.requests).toHaveLength(before);
      await close(session);
      session = undefined;
      expect(privateImage(f)).toEqual(image);

      f.write({ ...f.config, writesEnabled: false });
      const disabledImage = privateImage(f);
      session = await processSession(f.configPath, installed());
      expectError(await call(session), "configuration_required", false, {
        message: "Routine creation is disabled in the operator configuration.",
      });
      expect(f.requests).toHaveLength(before);
      await close(session);
      session = undefined;
      expect(privateImage(f)).toEqual(disabledImage);

      f.write(f.config);
      const enabledImage = privateImage(f);
      session = await processSession(f.configPath, installed());
      expect(f.requests).toHaveLength(before);
      const mutationCount = f.mutations().length;
      const first = (await call(session)).structuredContent;
      const second = (await call(session)).structuredContent;
      expect(first).toMatchObject({ ok: true, data: { status: "saved" } });
      expect(second).toMatchObject({ ok: true, data: { status: "saved" } });
      expect(
        new Set([saved.data.routineId, uncertainRoot, first.data.routineId, second.data.routineId])
          .size,
      ).toBe(4);
      const fresh = f.mutations().slice(mutationCount);
      expect(fresh).toHaveLength(6);
      expect(
        fresh
          .filter((request) => request.target === "/v1/routines")
          .map((request) => JSON.parse(request.body).id),
      ).toEqual([first.data.routineId, second.data.routineId]);
      expect(fresh.every((request) => !request.target.includes(uncertainRoot))).toBe(true);
      expect(new Set(f.mutations().map((request) => request.key)).size).toBe(f.mutations().length);
      await close(session);
      session = undefined;
      expect(privateImage(f)).toEqual(enabledImage);
      expect(fs.readdirSync(f.storage.profileRoot).sort()).toEqual([
        "credentials.enc",
        "owner.lock",
      ]);
      expect((await record(f)).bytes).toEqual(priorRecord.bytes);
    } finally {
      await close(session);
      await f.close();
    }
  }, 60000);

  it("runs installed CLI setup, synthetic configured login, restart/read/create/auth recovery and local lifecycle", async () => {
    const f = await fixture({ signedOut: true });
    let session, transaction;
    try {
      const config = {
        ...f.config,
        storage: {
          ...f.storage,
          profileRoot: path.join(path.dirname(f.configPath), "installed-profile"),
        },
      };
      f.write(config);
      expect(command(["setup", "--config", f.configPath]).stderr).toContain("Setup complete");
      const preAuth = await record(f);
      expect(preAuth.binding).toMatchObject({ accountUuid: null, sessionGeneration: 0 });
      expect(f.requests).toHaveLength(0);
      transaction = await installedLogin.openConfiguredLoginTransaction({
        configPath: f.configPath,
        loginConfigPath: f.loginConfigPath,
      });
      const challenge = await transaction.start(signal());
      const binding = await transaction.submit(
        challenge.attemptId,
        "synthetic-t21-installed-google",
        signal(),
      );
      await transaction.close();
      transaction = undefined;
      expect(binding.accountUuid).toBe(f.grant.account.id);
      expect(binding.profileGenerationId).toBe(preAuth.binding.profileGenerationId);
      expect(binding.sessionGeneration).toBe(1);
      const loggedIn = await record(f);
      decodeVault(loggedIn.bytes, loggedIn.binding);
      const before = f.requests.length;
      session = await processSession(f.configPath, installed());
      expect(f.requests).toHaveLength(before);
      expect(
        (await session.client.callTool({ name: "list_routines", arguments: {} })).structuredContent,
      ).toEqual({ ok: true, data: { items: [], hasMore: false, nextPageToken: null } });
      f.state.authRetry = "draft";
      expect((await call(session)).structuredContent).toMatchObject({
        ok: true,
        data: { status: "saved" },
      });
      const mutations = f.mutations();
      expect(mutations).toHaveLength(4);
      expect(mutations[0]).toEqual(mutations[1]);
      expect(f.requests.filter((request) => request.target === "/v1/auth/refresh")).toHaveLength(1);
      await close(session);
      session = undefined;
      const authenticated = await record(f);
      const vault = decodeVault(authenticated.bytes, authenticated.binding);
      expect(vault.pendingRefresh).toBeNull();
      expect(vault.grant.accessToken).toBe("synthetic-t21-rotated-access");
      expect(command(["recover", "--config", f.configPath]).stderr).toContain("Recovery complete");
      const signedOut = await installedLifecycle.signOutProfile(
        { configPath: f.configPath },
        signal(),
      );
      expect(signedOut.sessionGeneration).toBe(binding.sessionGeneration + 1);
      const cleared = await record(f);
      expect(decodeVault(cleared.bytes, cleared.binding).grant).toBeNull();
      session = await processSession(f.configPath, installed());
      expectError(
        await session.client.callTool({ name: "list_routines", arguments: {} }),
        "authentication_required",
        false,
      );
      await close(session);
      session = undefined;
      expect(command(["profile-remove", "--config", f.configPath, "--confirm"]).stderr).toContain(
        "Profile removal complete",
      );
      expect(fs.readdirSync(config.storage.profileRoot)).toEqual(["owner.lock"]);
    } finally {
      await close(session);
      await transaction?.close();
      await f.close();
    }
  }, 60000);

  it("refuses future auth/credential versions and corrupt credentials without changes or network", async () => {
    const f = await fixture({ writesEnabled: false });
    try {
      const file = path.join(f.storage.profileRoot, "credentials.enc");
      const original = fs.readFileSync(file);
      const owner = await installedStorage.openProfile(location(f));
      try {
        await owner.commit({ vaultBytes: Buffer.from('{"version":99}') });
      } finally {
        await owner.close();
      }
      await refusesStartup(f, true);
      fs.writeFileSync(file, original);
      const future = JSON.parse(original);
      future.version = 2;
      fs.writeFileSync(file, JSON.stringify(future));
      await refusesStartup(f);
      const corrupt = JSON.parse(original);
      const tag = Buffer.from(corrupt.tagBase64, "base64");
      tag[0] ^= 1;
      corrupt.tagBase64 = tag.toString("base64");
      fs.writeFileSync(file, JSON.stringify(corrupt));
      await refusesStartup(f);
    } finally {
      await f.close();
    }
  }, 60000);

  it("refuses config1 and an old profile without migration, reset or data changes", async () => {
    const f = await fixture({ signedOut: true, writesEnabled: false });
    try {
      const oldRoot = path.join(path.dirname(f.configPath), "old-profile");
      const anchorRoot = path.join(path.dirname(f.configPath), "old-anchor");
      const descriptorPath = path.join(path.dirname(f.configPath), "old-binding.json");
      for (const root of [oldRoot, anchorRoot]) fs.mkdirSync(root, { mode: 0o700 });
      for (const name of ["owner.lock", "vault.bin", "operations.bin"])
        fs.writeFileSync(path.join(oldRoot, name), "synthetic-old-format-evidence", {
          mode: 0o600,
        });
      fs.writeFileSync(descriptorPath, '{"version":1}', { mode: 0o600 });
      const oldConfig = {
        ...f.config,
        version: 1,
        storage: { ...f.storage, profileRoot: oldRoot, anchorRoot },
        bindingDescriptorPath: descriptorPath,
      };
      f.write(oldConfig);
      await refusesStartup(f, false, "configuration");
      f.write({ ...f.config, storage: { ...f.storage, profileRoot: oldRoot } });
      await refusesStartup(f);
      const before = privateImage(f);
      const setup = spawnSync(
        process.execPath,
        [path.join(app, "dist/cli/main.js"), "setup", "--config", f.configPath],
        { cwd: artifact.root, env: artifact.env, encoding: "utf8", timeout: 15000 },
      );
      expect(setup.error).toBeUndefined();
      expect(setup.status).toBe(3);
      expect(setup.stdout).toBe("");
      expect(privateImage(f)).toEqual(before);
    } finally {
      await f.close();
    }
  }, 60000);
});

async function refusesStartup(f, probeOwner = false, category = "private") {
  const image = privateImage(f);
  const requestCount = f.requests.length;
  const result = spawnSync(
    process.execPath,
    [path.join(app, "dist/protocol/server.js"), "--config", f.configPath],
    { cwd: artifact.root, env: artifact.env, encoding: "utf8", timeout: 15000 },
  );
  expect(result.error).toBeUndefined();
  expect(result).toMatchObject({
    status: 78,
    signal: null,
    stdout: "",
    stderr:
      category === "configuration"
        ? "GymTracka MCP startup configuration is invalid or unsafe.\n"
        : "GymTracka MCP private state could not be opened safely.\n",
  });
  expect(f.requests).toHaveLength(requestCount);
  expect(privateImage(f)).toEqual(image);
  if (probeOwner) {
    const owner = await installedStorage.openProfile(location(f));
    await owner.close();
    expect(privateImage(f)).toEqual(image);
  }
}

/* global AbortController */
// Shared S1/S2 synthetic fixture: explicitly isolated ext4/private Secret Service
// and private-CA HTTPS only. Missing facilities fail, never skip.
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { expect } from "vitest";
import { openConfiguredLoginTransaction } from "../../dist/login/index.js";
import { openProfile } from "../../dist/storage/index.js";
export const ACCOUNT = "79999999-9999-4999-8999-999999999999";
export const CHALLENGE = "78888888-8888-4888-8888-888888888888";
export const SETTINGS = {
  version: 1,
  googleWebClientId: "synthetic-t07-client.example.invalid",
  browserOrigin: "http://localhost:43219",
};
export const signal = () => new AbortController().signal;
export const bytes = (r) => Buffer.from(JSON.stringify(r));
export const parse = (b) => JSON.parse(Buffer.from(b).toString());

function required(name) {
  if (!process.env[name]) throw new Error(`BLOCKED: isolated fixture ${name} required`);
  return process.env[name];
}

export async function fixture() {
  expect(required("GT_S3_ISOLATION_CONFIRMED")).toBe("t08-s3-isolated");
  const dir = fs.mkdtempSync(path.join(required("GT_S3_PRIVATE_ROOT"), "synthetic-t07-"));
  expect(fs.statfsSync(dir).type).toBe(0xef53); // Real ext4, matching T04 supported baseline.
  const requests = [];
  let exchangeReply = null;
  const grant = {
    account: { id: ACCOUNT, displayName: null },
    accessToken: "synthetic-t07-access",
    accessExpiresAt: new Date(Date.now() + 60000).toISOString(),
    refreshToken: "synthetic-t07-refresh",
    refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const server = https.createServer(
    {
      key: fs.readFileSync(required("GT_S1_FIXTURE_KEY_FILE")),
      cert: fs.readFileSync(required("GT_S1_FIXTURE_CERT_FILE")),
    },
    (req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const request = {
          route: req.url,
          body: Buffer.concat(chunks),
          key: req.headers["idempotency-key"],
        };
        requests.push(request);
        if (req.url === "/v1/auth/google" && exchangeReply !== null) {
          exchangeReply(req, res, request);
          return;
        }
        const data =
          req.url === "/v1/auth/google/challenge"
            ? {
                challengeId: CHALLENGE,
                nonce: "synthetic-t07-nonce",
                expiresAt: new Date(Date.now() + 300000).toISOString(),
              }
            : req.url === "/v1/auth/google"
              ? grant
              : { items: [], hasMore: false, nextPageToken: null };
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(bytes(data));
      });
    },
  );
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `https://127.0.0.1:${server.address().port}`;
  const configPath = path.join(dir, "config.json"),
    loginConfigPath = path.join(dir, "login.json"),
    descriptorPath = path.join(dir, "binding.json");
  const profileRoot = path.join(dir, "profile"),
    anchorRoot = path.join(dir, "anchor");
  fs.mkdirSync(profileRoot, { mode: 0o700 });
  fs.mkdirSync(anchorRoot, { mode: 0o700 });
  const storage = {
    profileRoot,
    anchorRoot,
    secretServiceBusAddress: required("GT_S3_TEST_BUS"),
    timeoutMs: 5000,
  };
  fs.writeFileSync(
    configPath,
    bytes({
      version: 1,
      serviceOrigin: origin,
      storage,
      bindingDescriptorPath: descriptorPath,
      writesEnabled: false,
      transportBudgets: { perAttemptTimeoutMs: 1000, totalDeadlineMs: 2000 },
    }),
    { mode: 0o600 },
  );
  fs.writeFileSync(loginConfigPath, bytes(SETTINGS), { mode: 0o600 });
  return {
    dir,
    origin,
    configPath,
    loginConfigPath,
    descriptorPath,
    storage,
    requests,
    grant,
    setExchange(fn) {
      exchangeReply = fn;
    },
    async open(binding) {
      return openProfile({ ...storage, expectedBinding: binding });
    },
    async login() {
      return openConfiguredLoginTransaction({ configPath, loginConfigPath });
    },
    async close() {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export async function signIn(f) {
  const login = await f.login();
  try {
    const challenge = await login.start(signal());
    return await login.submit(challenge.attemptId, "synthetic-t07-google", signal());
  } finally {
    await login.close();
  }
}

/* global AbortController */
// Actual isolated provider/ext4/T06/T05 HTTPS; scripted synthetic replies are not a real backend.
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { randomUUID } from "node:crypto";
import { openProfile } from "../../../dist/storage/index.js";
import { openConfiguredLoginTransaction } from "../../../dist/login/index.js";
import { decodeLifecycleVaultBytes } from "../../../dist/auth/vault.js";
import { prepareIsolatedProfile, writeStartupPair } from "../../read-runtime/fixtures.mjs";
import { bundledExerciseWire } from "../../unit/t05/helpers.mjs";
export const uuid = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const signal = () => new AbortController().signal;
const gate = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
export const args = () => ({
  name: "Synthetic routine",
  exercises: [
    { exerciseId: uuid(4), sets: [{}] },
    { exerciseId: uuid(4), sets: [] },
  ],
});

export async function fixture({ signedOut = false, writesEnabled = true } = {}) {
  if (process.env.GT_S3_ISOLATION_CONFIRMED !== "t08-s3-isolated")
    throw new Error("BLOCKED: private provider runner required");
  const required = (name) => {
    if (!process.env[name]) throw new Error("BLOCKED: isolated fixture setting required");
    return process.env[name];
  };
  const dir = fs.mkdtempSync(path.join(required("GT_S3_PRIVATE_ROOT"), "synthetic-t15-"));
  if (fs.statfsSync(dir).type !== 0xef53) throw new Error("BLOCKED: ext4 fixture required");
  const requests = [],
    cache = new Map();
  let routine;
  const state = {
    invisible: false,
    malformed: null,
    hold: null,
    deny: false,
    reject: null,
    rateLimited: null,
    authRetry: null,
  };
  const grant = {
    account: { id: uuid(1), displayName: null },
    accessToken: "synthetic-t15-access",
    refreshToken: "synthetic-t15-refresh",
    accessExpiresAt: new Date(Date.now() + 600000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const entered = gate(),
    released = gate(),
    aborted = gate();
  const server = https.createServer(
    {
      key: fs.readFileSync(required("GT_S1_FIXTURE_KEY_FILE")),
      cert: fs.readFileSync(required("GT_S1_FIXTURE_CERT_FILE")),
    },
    (req, res) => {
      res.once("close", () => {
        if (!res.writableEnded) aborted.resolve();
      });
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const record = {
          method: req.method,
          target: req.url,
          body: Buffer.concat(chunks),
          key: req.headers["idempotency-key"],
        };
        requests.push(record);
        const reply = async () => {
          let status = 200,
            value;
          if (req.url === "/v1/auth/google/challenge") {
            value = {
              challengeId: randomUUID(),
              nonce: "synthetic-t15-nonce",
              expiresAt: new Date(Date.now() + 300000).toISOString(),
            };
          } else if (req.url === "/v1/auth/google") value = grant;
          else if (req.url === "/v1/auth/refresh")
            value = {
              ...grant,
              accessToken: "synthetic-t21-rotated-access",
              refreshToken: "synthetic-t21-rotated-refresh",
            };
          else if (req.url === "/v1/auth/logout") {
            status = 204;
          } else if (state.deny) {
            status = 403;
            value = { errorCode: "read_only", message: null };
          } else if (req.method === "GET") {
            if (req.url === "/v1/routines?limit=1" || req.url === "/v1/routines?limit=20")
              value = { items: [], hasMore: false, nextPageToken: null };
            else if (req.url === `/v1/exercises/${uuid(4)}`) {
              if (state.invisible) {
                status = 404;
                value = { errorCode: "not_found", message: null };
              } else value = bundledExerciseWire(uuid(4));
            } else if (routine && req.url === `/v1/routines/${routine.id}`) value = routine;
            else {
              status = 404;
              value = { errorCode: "not_found", message: null };
            }
          } else {
            const input = JSON.parse(record.body);
            const step =
              req.url === "/v1/routines" ? "draft" : req.method === "PUT" ? "populate" : "save";
            if (state.authRetry === step) {
              state.authRetry = null;
              res.writeHead(401, { "content-type": "application/json" });
              res.end(JSON.stringify({ errorCode: "reauthentication_required" }));
              return;
            }
            if (state.rateLimited === step) {
              state.rateLimited = null;
              res.writeHead(429, { "content-type": "application/json", "retry-after": "1" });
              res.end(JSON.stringify({ errorCode: "rate_limited", message: null }));
              return;
            }
            const retained = cache.get(record.key);
            if (retained) {
              status = retained.status;
              value = retained.value;
            } else if (state.reject === step) {
              status = 409;
              value = { errorCode: "invalid_state", message: null };
              cache.set(record.key, { status, value });
            } else {
              status = step === "draft" ? 201 : 200;
              if (step === "draft")
                routine = { id: input.id, name: "", isDraft: true, revision: 1, exercises: [] };
              else if (step === "populate")
                routine = {
                  ...input,
                  revision: 2,
                  exercises: input.exercises.map((e) => ({
                    ...e,
                    exerciseName: "Synthetic exercise",
                  })),
                };
              else routine = { ...routine, name: input.name, isDraft: false, revision: 3 };
              value = JSON.parse(JSON.stringify(routine));
              cache.set(record.key, { status, value });
            }
            if (state.hold === step) {
              entered.resolve();
              await released.promise;
            }
            if (state.malformed === step) {
              state.malformed = null;
              value = {};
            }
          }
          res.writeHead(status, { "content-type": "application/json" });
          res.end(status === 204 ? undefined : JSON.stringify(value));
        };
        void reply().catch(() => res.destroy());
      });
    },
  );
  let binding;
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `https://127.0.0.1:${server.address().port}`;
    const location = {
      profileRoot: path.join(dir, "profile"),
      secretServiceBusAddress: required("GT_S3_TEST_BUS"),
    };
    binding = await prepareIsolatedProfile({
      ...location,
      busAddress: location.secretServiceBusAddress,
      origin,
      profileGenerationId: randomUUID(),
      grantBytes: signedOut ? null : Buffer.from(JSON.stringify(grant)),
    });
    const pair = writeStartupPair({
      dir,
      origin,
      ...location,
      busAddress: location.secretServiceBusAddress,
      writesEnabled: true,
    });
    const config = JSON.parse(fs.readFileSync(pair.configPath));
    const loginConfigPath = path.join(dir, "synthetic-login.json");
    fs.writeFileSync(
      loginConfigPath,
      JSON.stringify({
        version: 1,
        googleWebClientId: "synthetic-t15-client.example.invalid",
        browserOrigin: "http://localhost:43219",
      }),
      { mode: 0o600 },
    );
    config.writesEnabled = writesEnabled;
    config.transportBudgets = { perAttemptTimeoutMs: 1000, totalDeadlineMs: 2000 };
    fs.writeFileSync(pair.configPath, JSON.stringify(config), { mode: 0o600 });
    return {
      ...pair,
      config,
      binding,
      origin,
      storage: location,
      grant,
      loginConfigPath,
      state,
      requests,
      entered: entered.promise,
      aborted: aborted.promise,
      release() {
        released.resolve();
      },
      mutations: () =>
        requests.filter((r) => r.method !== "GET" && r.target.startsWith("/v1/routines")),
      write(config) {
        fs.writeFileSync(pair.configPath, JSON.stringify(config), { mode: 0o600 });
      },
      open: () => openProfile({ ...location, origin }),
      login: () => openConfiguredLoginTransaction({ configPath: pair.configPath, loginConfigPath }),
      async inspect() {
        const owner = await openProfile({ ...location, origin });
        try {
          // Validate the entire decrypted auth record, including exact allowed
          // fields, then expose the actual file set as a no-creation-store oracle.
          decodeLifecycleVaultBytes(await owner.readVaultBytes(), owner.binding);
          return fs.readdirSync(location.profileRoot).sort();
        } finally {
          await owner.close();
        }
      },
      async close() {
        released.resolve();
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        fs.rmSync(dir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    released.resolve();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

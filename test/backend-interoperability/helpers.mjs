/* global fetch, AbortSignal */
// Real backend/domain/auth/DB fixture. TLS relay forwards bytes, or applies the
// explicitly selected loss/corruption/injected429 fault. No external Google.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { execFileSync, spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { decodeLifecycleVaultBytes } from "../../dist/auth/vault.js";
import { openProfile } from "../../dist/storage/index.js";
import { prepareIsolatedProfile, writeStartupPair } from "../read-runtime/fixtures.mjs";
export { processSession } from "../create-stdio/helpers.mjs";

export function check(condition, message) {
  if (!condition) throw new Error(message); // never dump private actual/expected values
}

export async function waitFor(predicate, message, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    check(Date.now() < deadline, message);
    await delay(30);
  }
}

// The backend and TLS relay own separate connections. Do not advertise the
// backend's keep-alive/framing policy as if it belonged to this Node server.
// Domain bytes and end-to-end headers are preserved; this hop frames its body.
function relayResponseHeaders(headers, length) {
  const hop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    ...(headers.connection ?? "").split(",").map((name) => name.trim().toLowerCase()),
  ]);
  return {
    ...Object.fromEntries(Object.entries(headers).filter(([name]) => !hop.has(name.toLowerCase()))),
    "content-length": length,
  };
}

export async function fixture({ customCount = 1 } = {}) {
  check(process.env.GT_S3_ISOLATION_CONFIRMED === "t08-s3-isolated", "Private runner required");
  const configPath = process.env.GT_T16_BACKEND_CONFIG;
  check(typeof configPath === "string", "Disposable backend configuration required");
  const stat = fs.lstatSync(configPath);
  check(
    stat.isFile() && (stat.mode & 0o777) === 0o600 && stat.uid === process.getuid(),
    "Disposable configuration ownership/mode mismatch",
  );
  const backend = JSON.parse(fs.readFileSync(configPath));
  check(
    /^gymtracka-android-test-[0-9a-f-]{36}$/.test(backend.containerName),
    "Unowned container refused",
  );
  check(/^http:\/\/127\.0\.0\.1:\d+$/.test(backend.baseUrl), "Nonloopback backend refused");
  check(
    backend.databaseUser === "android_test" && backend.jdbcUrl.endsWith("/gymtracka_android_test"),
    "Nondisposable database refused",
  );
  check(
    execFileSync(
      "docker",
      [
        "inspect",
        "--format",
        '{{index .Config.Labels "gymtracka.android-test-run"}}',
        backend.containerName,
      ],
      { encoding: "utf8" },
    ).trim() === backend.runId,
    "Container ownership guard mismatch",
  );
  function sql(statement) {
    try {
      return execFileSync(
        "docker",
        [
          "exec",
          "-i",
          backend.containerName,
          "psql",
          "-X",
          "-qAt",
          "-U",
          "android_test",
          "-d",
          "gymtracka_android_test",
          "-v",
          "ON_ERROR_STOP=1",
        ],
        { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 10000 },
      ).trim();
    } catch {
      throw new Error("Isolated database command failed");
    }
  }
  check(
    sql("select run_id from gymtracka_android_test_guard;") === backend.runId,
    "Database run guard mismatch",
  );
  async function request(grant, method, route, body, key = randomUUID()) {
    const response = await fetch(backend.baseUrl + route, {
      method,
      headers: {
        "content-type": "application/json",
        "idempotency-key": key,
        ...(grant ? { authorization: "Bearer " + grant.accessToken } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    return { status: response.status, value: text ? JSON.parse(text) : null, text };
  }
  const macKey = createHmac("sha256", Buffer.from(backend.authKey, "base64"))
    .update("GymTracka auth HMAC v1")
    .digest();
  const fingerprint = (token) => createHmac("sha256", macKey).update(token).digest("hex");
  async function account(existingId) {
    const id = existingId ?? randomUUID(),
      session = randomUUID(),
      token = randomBytes(32).toString("base64url");
    const digest = fingerprint(token);
    sql(`${existingId ? "" : `insert into accounts(id) values('${id}');`}
      insert into auth_sessions(id,account_id,created_at) values('${session}','${id}',clock_timestamp());
      insert into auth_credentials(fingerprint,session_id,kind,issued_at,expires_at)
      values(decode('${digest}','hex'),'${session}','refresh',clock_timestamp(),clock_timestamp()+interval '30 days');`);
    const refreshed = await request(null, "POST", "/v1/auth/refresh", { refreshToken: token });
    check(
      refreshed.status === 200 && refreshed.value.account.id === id,
      "Real service grant failed",
    );
    return refreshed.value;
  }
  const grant = await account(),
    foreign = await account();
  const customs = [];
  for (let index = 0; index < customCount; index++) {
    const id = randomUUID();
    const created = await request(grant, "POST", "/v1/exercises", {
      id,
      name: "T16 fixture " + index,
    });
    check(created.status === 201, "Real custom fixture creation failed");
    customs.push(id);
  }
  const foreignId = randomUUID();
  check(
    (await request(foreign, "POST", "/v1/exercises", { id: foreignId, name: "T16 foreign" }))
      .status === 201,
    "Foreign fixture creation failed",
  );
  const catalogue = await request(grant, "GET", "/v1/catalogue/exercises?limit=200");
  check(
    catalogue.status === 200 && typeof catalogue.value.catalogueVersion === "string",
    "Real catalogue unavailable",
  );
  const bundled = catalogue.value.items.find((item) => !item.isUserCreated);
  check(bundled !== undefined, "Bundled fixture unavailable");
  const dir = fs.mkdtempSync(path.join(process.env.GT_S3_PRIVATE_ROOT, "t16-real-"));
  const mutations = [],
    requests = [],
    authRequests = [],
    locks = [];
  const state = {
    lose: null,
    dropped: false,
    beforeRequest: null,
    afterResponse: null,
    malformed: null,
    malformedSent: false,
    corruptIdentity: false,
    rateLimit: null,
    hookFailed: false,
  };
  const relay = https.createServer(
    {
      key: fs.readFileSync(process.env.GT_S1_FIXTURE_KEY_FILE),
      cert: fs.readFileSync(process.env.GT_S1_FIXTURE_CERT_FILE),
    },
    (incoming, outgoing) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("end", () => {
        const body = Buffer.concat(chunks);
        requests.push({ method: incoming.method, route: incoming.url });
        const mutable = incoming.method !== "GET" && incoming.url.startsWith("/v1/routines");
        const refreshing = incoming.url === "/v1/auth/refresh";
        const step =
          incoming.url === "/v1/routines"
            ? "draft"
            : incoming.method === "PUT"
              ? "populate"
              : "save";
        const mutation = mutable
          ? {
              method: incoming.method,
              route: incoming.url,
              key: incoming.headers["idempotency-key"],
              body,
            }
          : null;
        if (mutation) mutations.push(mutation);
        if (mutation)
          outgoing.once("close", () => {
            mutation.disconnected = true;
          });
        const authRecord = refreshing ? { key: incoming.headers["idempotency-key"], body } : null;
        if (authRecord) authRequests.push(authRecord);
        const target = new URL(incoming.url, backend.baseUrl);
        if (target.origin !== backend.baseUrl) {
          outgoing.destroy();
          return;
        }
        const forward = () => {
          if (mutation && state.rateLimit === step) {
            // Explicit relay fault, not a claim of a backend-generated429.
            const limited = Buffer.from('{"errorCode":"rate_limited"}');
            mutation.status = 429;
            outgoing.writeHead(429, {
              "content-type": "application/json",
              "content-length": limited.length,
              "retry-after": "60",
            });
            outgoing.end(limited);
            return;
          }
          const forwarded = http.request(
            target,
            { method: incoming.method, headers: { ...incoming.headers, host: target.host } },
            (response) => {
              const received = [];
              response.on("data", (chunk) => received.push(chunk));
              response.on("end", () => {
                const responseBody = Buffer.concat(received);
                if (authRecord) {
                  authRecord.response = responseBody;
                  authRecord.status = response.statusCode;
                }
                if (mutation) mutation.status = response.statusCode;
                const deliver = () => {
                  if (outgoing.destroyed) return;
                  if (
                    mutation &&
                    state.malformed === step &&
                    !state.malformedSent &&
                    response.statusCode < 300
                  ) {
                    state.malformedSent = true;
                    let corrupted = Buffer.from("{");
                    if (state.corruptIdentity) {
                      const altered = JSON.parse(responseBody);
                      altered.id = altered.id.slice(0, -1) + (altered.id.endsWith("0") ? "1" : "0");
                      corrupted = Buffer.from(JSON.stringify(altered));
                    }
                    outgoing.writeHead(
                      response.statusCode,
                      relayResponseHeaders(response.headers, corrupted.length),
                    );
                    outgoing.end(corrupted);
                    return;
                  }
                  if (
                    ((mutable && state.lose === step) ||
                      (refreshing && state.lose === "refresh")) &&
                    !state.dropped &&
                    response.statusCode < 300
                  ) {
                    state.dropped = true;
                    outgoing.destroy(); // backend has answered; discard its actual committed result
                  } else {
                    outgoing.writeHead(
                      response.statusCode,
                      relayResponseHeaders(response.headers, responseBody.length),
                    );
                    outgoing.end(responseBody);
                  }
                };
                Promise.resolve()
                  .then(() => state.afterResponse?.({ mutation, step, route: incoming.url }))
                  .then(deliver)
                  .catch(() => {
                    state.hookFailed = true;
                    outgoing.destroy();
                  });
              });
            },
          );
          forwarded.on("error", () => outgoing.destroy());
          forwarded.end(body);
        };
        Promise.resolve()
          .then(() => state.beforeRequest?.({ mutation, authRecord, step, route: incoming.url }))
          .then(forward)
          .catch(() => {
            state.hookFailed = true;
            outgoing.destroy();
          });
      });
    },
  );
  // Native Android establishes a baseline, then waits while the separate MCP
  // child starts and completes creation. Do not inject Node's incidental five-
  // second idle disconnect into that ordinary handoff. Deliberate loss/cancel/
  // timeout fixtures remain controlled by their unchanged explicit hooks.
  relay.keepAliveTimeout = 60000;
  try {
    await new Promise((resolve) => relay.listen(0, "127.0.0.1", resolve));
    const origin = `https://127.0.0.1:${relay.address().port}`;
    const profileRoot = path.join(dir, "profile");
    const busAddress = process.env.GT_S3_TEST_BUS;
    await prepareIsolatedProfile({
      profileRoot,
      busAddress,
      origin,
      grantBytes: Buffer.from(JSON.stringify(grant)),
    });
    const pair = writeStartupPair({
      dir,
      origin,
      profileRoot,
      busAddress,
      writesEnabled: true,
    });
    const config = JSON.parse(fs.readFileSync(pair.configPath));
    config.transportBudgets = { perAttemptTimeoutMs: 3000, totalDeadlineMs: 6000 };
    fs.writeFileSync(pair.configPath, JSON.stringify(config), { mode: 0o600 });
    return {
      ...pair,
      grant,
      foreign,
      foreignId,
      customs,
      bundled,
      state,
      mutations,
      requests,
      authRequests,
      origin,
      privateProfileOptions: () => ({
        profileRoot,
        secretServiceBusAddress: busAddress,
        origin,
      }),
      newSession: () => account(grant.account.id),
      bindProofSubject(subject) {
        check(/^t16-s6-[0-9a-f-]{36}$/.test(subject), "Invalid isolated proof subject");
        check(
          sql(`insert into google_identity_bindings(google_subject,account_id)
            values('${subject}','${grant.account.id}') returning 1;`) === "1",
          "Isolated proof binding failed",
        );
      },
      observeDeletion() {
        return JSON.parse(
          sql(`select json_build_object(
            'deleted',(select deleted_at is not null from accounts where id='${grant.account.id}'),
            'ledger',(select count(*) from account_deletion_ledger where old_account_id='${grant.account.id}'),
            'purgeIntents',(select count(*) from account_purge_intents where old_account_id='${grant.account.id}'),
            'bindings',(select count(*) from google_identity_bindings where account_id='${grant.account.id}'),
            'sessions',(select count(*) from auth_sessions where account_id='${grant.account.id}'),
            'revoked',(select count(*) from auth_sessions where account_id='${grant.account.id}' and revoked_at is not null)
          );`),
        );
      },
      logout: (sessionGrant = grant) =>
        request(null, "POST", "/v1/auth/logout", { refreshToken: sessionGrant.refreshToken }),
      expireAccess() {
        check(
          sql(`update auth_credentials set expires_at=clock_timestamp()-interval '1 second'
          where fingerprint=decode('${fingerprint(grant.accessToken)}','hex') returning 1;`) ===
            "1",
          "Isolated access expiry setup failed",
        );
      },
      setReadRevision(kind, id, revision) {
        const table = { exercise: "exercises", routine: "routines", workout: "workouts" }[kind];
        check(
          table !== undefined &&
            /^[0-9a-f-]{36}$/.test(id) &&
            ["9007199254740993", "9223372036854775807"].includes(revision),
          "Invalid isolated numeric fixture",
        );
        check(
          sql(`update ${table} set revision=${revision} where id='${id}' and owner_id='${grant.account.id}'
          returning revision::text;`) === revision,
          "Numeric fixture revision setup failed",
        );
      },
      authSnapshot() {
        return JSON.parse(
          sql(`select json_build_object(
          'replays',(select count(*) from auth_idempotency i join auth_sessions s on s.id=i.session_id where s.account_id='${grant.account.id}'),
          'liveRefresh',(select count(*) from auth_credentials c join auth_sessions s on s.id=c.session_id where s.account_id='${grant.account.id}' and c.kind='refresh' and c.consumed_at is null and c.expires_at>clock_timestamp()),
          'revoked',(select count(*) from auth_sessions where account_id='${grant.account.id}' and revoked_at is not null)
        );`),
        );
      },
      async withPrivateProfile(action) {
        const profile = await openProfile({
          profileRoot,
          secretServiceBusAddress: busAddress,
          origin,
        });
        try {
          return await action(profile);
        } finally {
          await profile.close();
        }
      },
      async privateState() {
        return this.withPrivateProfile(async (profile) => {
          const bytes = await profile.readVaultBytes();
          decodeLifecycleVaultBytes(bytes, profile.binding);
          return {
            vault: JSON.parse(Buffer.from(bytes).toString("utf8")),
            binding: profile.binding,
            files: fs.readdirSync(profileRoot).sort(),
          };
        });
      },
      async restartBackend(clockInstant) {
        check(process.env.GT_T16_BACKEND_RESTARTABLE === "1", "Owned restart supervisor required");
        check(
          clockInstant === undefined ||
            (process.env.GT_T16_CLOCK_SEAM === "1" &&
              typeof clockInstant === "string" &&
              /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(clockInstant) &&
              Number.isFinite(Date.parse(clockInstant))),
          "Owned fixed-clock input required",
        );
        const socketPath = configPath + ".control";
        const control = fs.lstatSync(socketPath);
        check(
          control.isSocket() &&
            (control.mode & 0o777) === 0o600 &&
            control.uid === process.getuid(),
          "Restart control ownership/mode mismatch",
        );
        await new Promise((resolve, reject) => {
          const socket = net.createConnection(socketPath);
          let reply = "";
          socket.setTimeout(60000);
          socket.on("connect", () =>
            socket.write(clockInstant === undefined ? "restart\n" : `clock:${clockInstant}\n`),
          );
          socket.on("data", (chunk) => {
            reply += chunk.toString();
          });
          socket.on("end", () => {
            socket.destroy();
            if (reply === "restarted\n") resolve();
            else reject(new Error("Owned backend restart rejected"));
          });
          socket.on("error", () => {
            socket.destroy();
            reject(new Error("Owned backend restart control failed"));
          });
          socket.on("timeout", () => {
            socket.destroy();
            reject(new Error("Owned backend restart timed out"));
          });
        });
      },
      async lockAccount() {
        const child = spawn(
          "docker",
          [
            "exec",
            "-i",
            backend.containerName,
            "psql",
            "-X",
            "-qAt",
            "-U",
            "android_test",
            "-d",
            "gymtracka_android_test",
            "-v",
            "ON_ERROR_STOP=1",
          ],
          { stdio: "pipe" },
        );
        let output = "",
          locked = false,
          exited,
          released = false;
        child.stdout.on("data", (chunk) => {
          output += chunk.toString();
          locked ||= output.includes("T16-LOCKED");
        });
        child.stderr.resume();
        child.on("close", (code) => {
          exited = code;
        });
        child.on("error", () => {
          exited = -1;
        });
        child.stdin.on("error", () => {
          exited = -1;
        });
        const held = {
          async release(disable = false) {
            if (released) return;
            released = true;
            if (exited === undefined)
              child.stdin.end(
                `${disable ? `update accounts set deleted_at=clock_timestamp() where id='${grant.account.id}';` : ""}\nCOMMIT;\n`,
              );
            await waitFor(() => exited !== undefined, "Owned row-lock session did not exit");
            check(exited === 0, "Owned row-lock session failed");
          },
          async waitForBlocked(count) {
            await waitFor(
              () =>
                Number(
                  sql(
                    "select count(*) from pg_stat_activity where datname='gymtracka_android_test' and wait_event_type='Lock' and query like 'SELECT 1 FROM accounts WHERE id=%';",
                  ),
                ) >= count,
              "Backend did not reach the serialized authorization lock",
            );
          },
        };
        locks.push(held);
        child.stdin.write(
          `BEGIN;\nSET LOCAL idle_in_transaction_session_timeout='30s';\nSELECT 1 FROM accounts WHERE id='${grant.account.id}' FOR UPDATE;\n\\echo T16-LOCKED\n`,
        );
        await waitFor(() => locked || exited !== undefined, "Owned account lock did not qualify");
        check(locked && exited === undefined, "Owned account lock failed");
        return held;
      },
      request: (method, route, body, other = grant, key) =>
        request(other, method, route, body, key),
      intent: () => ({
        name: "  T16 real routine  ",
        exercises: [
          { exerciseId: customs[0], sets: [{}, { repetitions: 0, weightKg: 0 }] },
          {
            exerciseId: bundled.id,
            restDurationSeconds: 0,
            sets: [{ repetitions: null, weightKg: null }],
          },
          { exerciseId: customs[0], sets: [] },
        ],
      }),
      observe(root) {
        check(/^[0-9a-f-]{36}$/.test(root), "Invalid observation identity");
        return JSON.parse(
          sql(`select json_build_object(
          'roots',(select count(*) from routines where owner_id='${grant.account.id}'),
          'entries',(select count(*) from routine_exercises where routine_id='${root}'),
          'sets',(select count(*) from routine_sets s join routine_exercises e on e.id=s.routine_exercise_id where e.routine_id='${root}'),
          'revision',(select revision from routines where id='${root}'),
          'name',(select name from routines where id='${root}'),
          'draft',(select is_draft from routines where id='${root}'),
          'batches',(select count(distinct cursor) from sync_changes where account_id='${grant.account.id}' and aggregate_id='${root}'),
          'children',(select json_agg(json_build_object('id',e.id,'exerciseId',e.exercise_id,'position',e.position,
            'restDurationSeconds',e.rest_duration_seconds,'sets',coalesce((select json_agg(json_build_object(
              'id',s.id,'position',s.position,'repetitions',s.repetitions,'weightKg',s.weight_kg) order by s.position)
              from routine_sets s where s.routine_exercise_id=e.id),'[]'::json)) order by e.position)
            from routine_exercises e where e.routine_id='${root}'),
          'replays',(select count(*) from resource_mutations where owner_id='${grant.account.id}' and request_route like '/v1/routines%'),
          'changes',(select json_agg(json_build_object('revision',revision,'payload',payload) order by cursor) from sync_changes where account_id='${grant.account.id}' and aggregate_id='${root}'),
          'keys',(select json_agg(idempotency_key order by created_at) from resource_mutations where owner_id='${grant.account.id}' and request_route like '/v1/routines%')
        );`),
        );
      },
      async close() {
        for (const held of locks) await held.release();
        relay.closeAllConnections();
        await new Promise((resolve) => relay.close(resolve));
        fs.rmSync(dir, { recursive: true, force: true });
      },
    };
  } catch {
    relay.closeAllConnections();
    await new Promise((resolve) => relay.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error("Real backend MCP fixture setup failed");
  }
}

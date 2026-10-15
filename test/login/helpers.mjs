/* global AbortController, structuredClone */
// All accounts, tokens and deadlines here are visibly synthetic isolated inputs.
import {
  readFixture,
  startLoopbackHttps,
  closeServer,
  jsonResponse,
} from "../fault/t05/helpers.mjs";

export const ACCOUNT = "71111111-1111-4111-8111-111111111111";
export const OTHER_ACCOUNT = "72222222-2222-4222-8222-222222222222";
export const PROFILE = "73333333-3333-4333-8333-333333333333";
export const CHALLENGE = "74444444-4444-4444-8444-444444444444";
export const AUTH_KEY = "75555555-5555-4555-8555-555555555555";
export const ATTEMPT = "76666666-6666-4666-8666-666666666666";
export const NOW = Date.parse("2026-10-15T12:00:00.000Z");
export const DEADLINE = "2026-10-15T12:05:00.000Z";
export const SETTINGS = Object.freeze({
  version: 1,
  googleWebClientId: "synthetic-qa-t07-web-client.apps.example.invalid",
  browserOrigin: "http://localhost:43219",
});
export const signal = () => new AbortController().signal;
export const bytes = (record) => Buffer.from(JSON.stringify(record), "utf8");
export const record = (value) => JSON.parse(Buffer.from(value).toString("utf8"));

export function binding(origin, accountUuid = null, sessionGeneration = 0) {
  return { origin, accountUuid, sessionGeneration, profileGenerationId: PROFILE };
}

export function grant(overrides = {}) {
  return {
    accountUuid: ACCOUNT,
    accessToken: "synthetic-qa-t07-access.before",
    accessExpiresAt: "2026-10-15T12:10:00.000Z",
    refreshToken: "synthetic-qa-t07-refresh.before",
    refreshExpiresAt: "2026-11-15T12:00:00.000Z",
    ...overrides,
  };
}

export function serviceGrant(accountUuid = ACCOUNT) {
  return {
    account: { id: accountUuid, displayName: null },
    accessToken: "synthetic-qa-t07-access.installed",
    // Expired access/live refresh is explicitly permitted at installation.
    accessExpiresAt: "2026-10-14T12:00:00.000000Z",
    refreshToken: "synthetic-qa-t07-refresh.installed",
    refreshExpiresAt: "2026-11-15T12:00:00.000000Z",
  };
}

export function pendingRefresh(prior) {
  return {
    predecessor: { ...prior },
    refreshToken: prior.refreshToken,
    bodyBase64: bytes({ refreshToken: prior.refreshToken }).toString("base64"),
    authKey: AUTH_KEY,
  };
}

export function preparedVault(source, prior = Buffer.alloc(0), changes = {}) {
  return bytes({
    version: 4,
    binding: source,
    priorVaultBase64: Buffer.from(prior).toString("base64"),
    exchange: {
      attemptId: ATTEMPT,
      challengeId: CHALLENGE,
      challengeExpiresAt: DEADLINE,
      googleWebClientId: SETTINGS.googleWebClientId,
      browserOrigin: SETTINGS.browserOrigin,
      authKey: AUTH_KEY,
      bodyBase64: bytes({ challengeId: CHALLENGE, idToken: "synthetic-qa-t07-google" }).toString(
        "base64",
      ),
      sendsReserved: 1,
      retryNotBeforeMs: null,
      ...changes,
    },
  });
}

// A small trusted capability, not a storage substitute: exact-byte/order/failure
// tests only. Root acceptance separately exercises actual protected persistence.
export function memoryProfile(source, initial = Buffer.alloc(0)) {
  const state = {
    binding: { ...source },
    vault: Buffer.from(initial),
    events: [],
    commits: [],
    closes: 0,
    operationReads: 0,
    beforeCommit: null,
    beforeTransition: null,
  };
  const owner = {
    get binding() {
      return { ...source };
    },
    async readVaultBytes() {
      return Buffer.from(state.vault);
    },
    async readOperationStoreBytes() {
      state.operationReads++;
      throw new Error("operations must remain opaque");
    },
    async commit(update) {
      if (Object.hasOwn(update, "operationBytes")) throw new Error("operation mutation forbidden");
      if (state.beforeCommit) await state.beforeCommit(update);
      if (update.vaultBytes !== undefined) state.vault = Buffer.from(update.vaultBytes);
      state.commits.push(Buffer.from(state.vault));
      state.events.push("commit");
    },
    async bindAccount(accountUuid, vault) {
      if (state.beforeTransition) await state.beforeTransition();
      state.binding = { ...source, accountUuid, sessionGeneration: 1 };
      state.vault = Buffer.from(vault);
      state.events.push("transition");
      return { ...state.binding };
    },
    async advanceSessionGeneration(vault) {
      if (state.beforeTransition) await state.beforeTransition();
      state.binding = { ...source, sessionGeneration: source.sessionGeneration + 1 };
      state.vault = Buffer.from(vault);
      state.events.push("transition");
      return { ...state.binding };
    },
    async keyedIntentDigest() {
      throw new Error("unneeded digest");
    },
    async close() {
      state.closes++;
    },
  };
  return { owner, state };
}

export function memoryMetadata(source, events = []) {
  const state = { descriptor: { ...source }, receipt: null, failPublish: false };
  const metadata = {
    config: {
      canonicalOrigin: source.origin,
      profileRoot: "/synthetic-qa-t07/profile",
      anchorRoot: "/synthetic-qa-t07/anchor",
      secretServiceBusAddress: "unix:path=/synthetic-qa-t07/bus",
      timeoutMs: undefined,
      descriptorPath: "/synthetic-qa-t07/metadata/binding.json",
      writesEnabled: false,
      maxToolResultBytes: 1048576,
      budgets: undefined,
    },
    async readDescriptor() {
      return state.descriptor;
    },
    async readReceipt() {
      return state.receipt;
    },
    async prepareReceipt(receipt) {
      if (state.receipt) throw new Error("unexpected pending transition");
      state.receipt = structuredClone(receipt);
      events.push("receipt");
    },
    async publishDescriptor(expected, target) {
      if (JSON.stringify(expected) !== JSON.stringify(state.descriptor))
        throw new Error("descriptor changed");
      if (state.failPublish) throw new Error("synthetic publication ambiguity");
      state.descriptor = structuredClone(target);
      events.push("descriptor");
    },
    async removeReceipt(receipt) {
      if (JSON.stringify(receipt) !== JSON.stringify(state.receipt))
        throw new Error("receipt changed");
      state.receipt = null;
      events.push("receipt-removed");
    },
  };
  return { metadata, state };
}

export async function backend(exchange, challengeChanges = {}) {
  const certPem = Buffer.from(readFixture("test-only-loopback-cert.pem"));
  const keyPem = Buffer.from(readFixture("test-only-loopback-key.pem"));
  const fixture = await startLoopbackHttps(
    { keyPem, certPem, label: "synthetic-qa-t07" },
    (req, res, request) => {
      if (request.url === "/v1/auth/google/challenge") {
        jsonResponse(res, 200, {
          challengeId: CHALLENGE,
          nonce: "synthetic-qa-t07-nonce",
          expiresAt: DEADLINE,
          ...challengeChanges,
        });
      } else if (request.url === "/v1/auth/google") {
        exchange(req, res, request);
      } else {
        throw new Error("unexpected isolated login route");
      }
    },
  );
  return {
    ...fixture,
    config: {
      origin: fixture.origin,
      testCaPem: certPem,
      budgets: { maxAttempts: 1, perAttemptTimeoutMs: 1000, totalDeadlineMs: 2000 },
    },
    close: () => closeServer(fixture.server),
  };
}

export { jsonResponse };

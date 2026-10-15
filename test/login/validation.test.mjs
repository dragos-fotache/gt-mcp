import { describe, it, expect } from "vitest";
import { openLoginTransaction, isLoginError } from "../../dist/login/index.js";
import { openLifecycleSessionState, isSessionError } from "../../dist/auth/index.js";
import {
  ACCOUNT,
  SETTINGS,
  NOW,
  DEADLINE,
  binding,
  bytes,
  record,
  preparedVault,
  memoryProfile,
  memoryMetadata,
  backend,
  signal,
} from "./helpers.mjs";

describe("T07-S1 strict private state and settings", () => {
  it.each([
    ["wrong version", { ...SETTINGS, version: "1" }],
    ["unknown field", { ...SETTINGS, extra: true }],
    ["origin trailing slash", { ...SETTINGS, browserOrigin: "http://localhost:43219/" }],
    ["noncanonical port", { ...SETTINGS, browserOrigin: "http://localhost:043219" }],
    ["numeric IP origin", { ...SETTINGS, browserOrigin: "http://127.0.0.1:43219" }],
    ["privileged port", { ...SETTINGS, browserOrigin: "http://localhost:80" }],
    ["client control character", { ...SETTINGS, googleWebClientId: "synthetic\nclient" }],
  ])("rejects %s before network or storage mutation", async (name, settings) => {
    const source = binding("https://synthetic-qa-t07.example.invalid");
    const profile = memoryProfile(source);
    const metadata = memoryMetadata(source);
    const result = await openLoginTransaction({
      profile: profile.owner,
      transportConfig: { origin: source.origin },
      metadata: metadata.metadata,
      settings,
      clock: { nowMs: () => NOW },
    }).catch((error) => error);
    expect(isLoginError(result)).toBe(true);
    expect(result.code).toBe("configuration_required");
    expect(profile.state.commits).toHaveLength(0);
  });

  it.each([
    [
      "noncanonical base64",
      (v) => {
        v.priorVaultBase64 = "YQ";
      },
    ],
    [
      "nested version4",
      (v) => {
        v.priorVaultBase64 = preparedVault(v.binding).toString("base64");
      },
    ],
    [
      "foreign binding",
      (v) => {
        v.binding.accountUuid = ACCOUNT;
      },
    ],
    [
      "mismatched captured body challenge",
      (v) => {
        v.exchange.bodyBase64 = bytes({
          challengeId: "78888888-8888-4888-8888-888888888888",
          idToken: "synthetic-token",
        }).toString("base64");
      },
    ],
    [
      "unknown exchange field",
      (v) => {
        v.exchange.extra = 1;
      },
    ],
    [
      "too many reserved sends",
      (v) => {
        v.exchange.sendsReserved = 3;
      },
    ],
    [
      "fractional retry instant",
      (v) => {
        v.exchange.retryNotBeforeMs = NOW + 0.5;
      },
    ],
    [
      "unrepresentable deadline precision",
      (v) => {
        v.exchange.challengeExpiresAt = "2026-10-15T12:05:00.0001Z";
      },
    ],
    [
      "empty exchange token",
      (v) => {
        v.exchange.bodyBase64 = bytes({
          challengeId: v.exchange.challengeId,
          idToken: "",
        }).toString("base64");
      },
    ],
  ])("fails closed on %s without erasing evidence", async (name, mutate) => {
    const source = binding("https://synthetic-qa-t07.example.invalid");
    const value = record(preparedVault(source));
    mutate(value);
    const initial = bytes(value);
    const profile = memoryProfile(source, initial);
    const metadata = memoryMetadata(source);
    const error = await openLoginTransaction({
      profile: profile.owner,
      transportConfig: { origin: source.origin },
      metadata: metadata.metadata,
      settings: SETTINGS,
      clock: { nowMs: () => NOW },
    }).catch((value) => value);
    expect(isLoginError(error)).toBe(true);
    expect(error.code).toBe(
      name === "nested version4" ? "state_version_unsupported" : "state_corrupt",
    );
    expect(profile.state.vault).toEqual(initial);
    expect(profile.state.commits).toHaveLength(0);
  });

  it("rejects duplicate JSON keys and malformed UTF-8, preserving the original bytes", async () => {
    const source = binding("https://synthetic-qa-t07.example.invalid");
    const original = preparedVault(source).toString("utf8");
    for (const initial of [
      Buffer.from(original.replace('"version":4', '"version":4,"version":4')),
      Buffer.from([0xc3, 0x28]),
    ]) {
      const profile = memoryProfile(source, initial);
      const metadata = memoryMetadata(source);
      const error = await openLoginTransaction({
        profile: profile.owner,
        transportConfig: { origin: source.origin },
        metadata: metadata.metadata,
        settings: SETTINGS,
        clock: { nowMs: () => NOW },
      }).catch((value) => value);
      expect(isLoginError(error)).toBe(true);
      expect(error.code).toBe("state_corrupt");
      expect(profile.state.vault).toEqual(initial);
    }
  });

  it("accepted T06 startup refuses v4 instead of authenticating the embedded predecessor", async () => {
    const source = binding("https://synthetic-qa-t07.example.invalid", ACCOUNT, 1);
    const profile = memoryProfile(source, preparedVault(source));
    const error = await openLifecycleSessionState({
      profile: profile.owner,
      transportConfig: { origin: source.origin },
      clock: { nowMs: () => NOW },
    }).catch((value) => value);
    expect(isSessionError(error)).toBe(true);
    expect(error.code).toBe("state_version_unsupported");
    expect(profile.state.commits).toHaveLength(0);
  });

  it("challenge deadline at exact equality is expired and submilliseconds never round", async () => {
    for (const expiresAt of ["2026-10-15T12:00:00.000Z", "2026-10-15T12:05:00.0001Z"]) {
      const fixture = await backend(
        () => {
          throw new Error("invalid challenge exchanged");
        },
        { expiresAt },
      );
      try {
        const source = binding(fixture.origin);
        const profile = memoryProfile(source);
        const metadata = memoryMetadata(source);
        const transaction = await openLoginTransaction({
          profile: profile.owner,
          transportConfig: fixture.config,
          metadata: metadata.metadata,
          settings: SETTINGS,
          clock: { nowMs: () => NOW },
        });
        const result = await transaction.start(signal()).catch((value) => value);
        expect(isLoginError(result)).toBe(true);
        expect(fixture.requests).toHaveLength(1);
        expect(profile.state.commits).toHaveLength(0);
        await transaction.close();
      } finally {
        await fixture.close();
      }
    }
    expect(Date.parse(DEADLINE)).toBe(NOW + 300000);
  });
});

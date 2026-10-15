// QA-owned private-bus helpers for the relay-supplied isolated provider.
// Direct argv only, bounded timeouts, synthetic fixture secrets, full
// cleanup in callers. Every command pins the relay bus address; no ambient
// bus discovery and never the personal bus.
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const LOGIN_COLLECTION = "/org/freedesktop/secrets/collection/login";
export const FIXED_LABEL = "GymTracka MCP profile key";

export function requireProviderEnv() {
  const bus = process.env.T04_PROVIDER_BUS;
  const parent = process.env.T04_PROVIDER_PARENT;
  if (typeof bus !== "string" || !bus.startsWith("unix:path=")) {
    throw new Error("blocked: relay must supply T04_PROVIDER_BUS (private-bus unix:path address)");
  }
  if (typeof parent !== "string" || parent.length === 0) {
    throw new Error(
      "blocked: relay must supply T04_PROVIDER_PARENT (verified ext4 fixture parent)",
    );
  }
  return { bus, parent };
}

function findMount(root) {
  const table = readFileSync("/proc/self/mountinfo", "utf8");
  let best = null;
  for (const line of table.split("\n")) {
    const parts = line.split(" ");
    const separator = parts.indexOf("-");
    if (separator < 0 || parts.length < separator + 4) continue;
    const mountPoint = parts[4].replace(/\\([0-7]{3})/g, (_, oct) =>
      String.fromCharCode(parseInt(oct, 8)),
    );
    if (
      root !== mountPoint &&
      !root.startsWith(mountPoint.endsWith("/") ? mountPoint : `${mountPoint}/`)
    )
      continue;
    if (best === null || mountPoint.length > best.mountPoint.length) {
      best = { mountPoint, fsType: parts[separator + 1] };
    }
  }
  return best;
}

export function assertExt4Parent(parent) {
  const match = findMount(parent);
  if (match === null) throw new Error(`blocked: no mountinfo entry for relay parent ${parent}`);
  if (match.fsType !== "ext4") {
    throw new Error(`blocked: relay parent fstype is ${match.fsType}, verified ext4 required`);
  }
  return match;
}

export function makeRoots(parent, prefix) {
  const base = mkdtempSync(join(parent, prefix));
  const profileRoot = join(base, "profile");
  const anchorRoot = join(base, "anchor");
  mkdirSync(profileRoot, { recursive: true });
  mkdirSync(anchorRoot, { recursive: true });
  chmodSync(base, 0o700);
  chmodSync(profileRoot, 0o700);
  chmodSync(anchorRoot, 0o700);
  return { base, profileRoot, anchorRoot };
}

function runBin(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    input: options.input,
    encoding: "utf8",
    timeout: 15000,
    env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", ...(options.extraEnv ?? {}) },
  });
  if (result.error) throw new Error(`blocked: ${cmd} failed to spawn`);
  return result;
}

// Every helper command runs with explicitly relayed disposable HOME/XDG
// (never an absent HOME with real-passwd fallback) plus the private bus.
function withFixtureEnv(bus, fn) {
  const home = mkdtempSync(join(tmpdir(), "t04-qa-home-"));
  const xdgData = join(home, "xdg-data");
  const xdgConfig = join(home, "xdg-config");
  const xdgCache = join(home, "xdg-cache");
  const xdgRuntime = join(home, "xdg-runtime");
  mkdirSync(xdgData, { recursive: true });
  mkdirSync(xdgConfig, { recursive: true });
  mkdirSync(xdgCache, { recursive: true });
  mkdirSync(xdgRuntime, { recursive: true, mode: 0o700 });
  try {
    return fn({
      HOME: home,
      XDG_DATA_HOME: xdgData,
      XDG_CONFIG_HOME: xdgConfig,
      XDG_CACHE_HOME: xdgCache,
      XDG_RUNTIME_DIR: xdgRuntime,
      DBUS_SESSION_BUS_ADDRESS: bus,
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function hasBin(cmd) {
  const probe = spawnSync(cmd, ["--help"], {
    encoding: "utf8",
    timeout: 10000,
    env: { PATH: "/usr/bin:/bin" },
  });
  return probe.error === undefined;
}

export function busctlLock(bus) {
  if (!hasBin("busctl"))
    throw new Error("blocked: busctl unavailable at relay for collection locking");
  withFixtureEnv(bus, (env) => {
    const result = runBin(
      "busctl",
      [
        `--address=${bus}`,
        "call",
        "org.freedesktop.secrets",
        "/org/freedesktop/secrets",
        "org.freedesktop.Secret.Service",
        "Lock",
        "ao",
        "1",
        LOGIN_COLLECTION,
      ],
      { extraEnv: env },
    );
    if (result.status !== 0) throw new Error("blocked: busctl Lock call failed");
    assertCollectionLocked(bus, env, true);
  });
}

export function busctlUnlockNote() {
  return "busctl Unlock is NOT a qualified restoration: it may report status 0 while a prompt stays pending and the collection stays locked. Helpers must never use it.";
}

function collectionLocked(bus, env) {
  const result = runBin(
    "busctl",
    [
      `--address=${bus}`,
      "get-property",
      "org.freedesktop.secrets",
      LOGIN_COLLECTION,
      "org.freedesktop.Secret.Collection",
      "Locked",
    ],
    { extraEnv: env },
  );
  if (result.status !== 0) throw new Error("blocked: busctl Locked property read failed");
  const token = result.stdout.trim().split(/\s+/).at(-1);
  if (token !== "true" && token !== "false")
    throw new Error("blocked: busctl Locked property unparsable");
  return token === "true";
}

// status 0 alone may hide a pending GUI prompt: verify the Locked property
// (polling briefly for prompt completion) instead of trusting the call.
function assertCollectionLocked(bus, env, expected) {
  const deadline = Date.now() + 5000;
  for (;;) {
    if (collectionLocked(bus, env) === expected) return;
    if (Date.now() > deadline) {
      throw new Error(
        `blocked: collection Locked property did not reach ${expected} (prompt may be pending; fixture needs attention)`,
      );
    }
    const wait = spawnSync("/bin/sleep", ["0.2"], { timeout: 5000 });
    void wait;
  }
}

export function secretToolStoreDuplicate(bus, profileGenerationId) {
  if (!hasBin("secret-tool"))
    throw new Error("blocked: secret-tool unavailable at relay for duplicate injection");
  withFixtureEnv(bus, (env) => {
    const secret = `t04-qa-fixture-secret:${profileGenerationId}`;
    const result = runBin(
      "secret-tool",
      [
        "store",
        `--label=${FIXED_LABEL}`,
        "x-gymtracka-profile",
        profileGenerationId,
        "x-gymtracka-key-v",
        "1",
        "x-gymtracka-role",
        "master",
        "x-gymtracka-qa-dup",
        "1",
      ],
      { input: secret, extraEnv: env },
    );
    if (result.status !== 0) {
      throw new Error("blocked: secret-tool store failed (relay: confirm noninteractive store)");
    }
  });
}

export function secretToolClearDuplicate(bus) {
  if (!hasBin("secret-tool"))
    throw new Error("blocked: secret-tool unavailable at relay for duplicate cleanup");
  withFixtureEnv(bus, (env) => {
    const result = runBin("secret-tool", ["clear", "x-gymtracka-qa-dup", "1"], { extraEnv: env });
    if (result.status !== 0) throw new Error("blocked: secret-tool clear failed");
  });
}

// Qualified fixture recovery: ONLY a coordinator-supplied absolute private
// fixture control (daemon SIGKILL/restart on the same private bus/keyring
// with the synthetic stdin password). Zero secret args/env cross this
// boundary: the command carries no bus address, password, or key material.
// Returns true when a reset ran, false when no affordance was supplied
// (caller keeps the locked negative as the isolated last case instead).
// Production code must never unlock/prompt; this is fixture lifecycle only.
export function providerReset() {
  const cmd = process.env.T04_PROVIDER_RESET_COMMAND;
  if (typeof cmd !== "string" || cmd.length === 0) return false;
  if (!cmd.startsWith("/")) throw new Error("blocked: reset command must be an absolute path");
  const result = spawnSync(cmd, [], {
    encoding: "utf8",
    timeout: 60000,
    env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8" },
  });
  if (result.error) throw new Error("blocked: reset command failed to spawn");
  if (result.status !== 0) throw new Error("blocked: reset command reported failure");
  return true;
}

// State-check after reset: the private collection reports unlocked.
// Callers additionally reopen a known-good profile to prove sentinel
// retention before trusting the bus again.
export function verifyUnlocked(bus) {
  withFixtureEnv(bus, (env) => assertCollectionLocked(bus, env, false));
}

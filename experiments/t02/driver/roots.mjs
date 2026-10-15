/**
 * T02 disposable roots + environment sanitization.
 *
 * The launcher creates all roots and the allowlisted environment BEFORE any
 * Pi module is imported (callers dynamic-import Pi only after `prepare()`).
 * Inherited provider keys, tokens, auth commands, preload hooks, user agent
 * state, and personal settings never enter the experiment environment.
 */

import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STRIP_PATTERN =
  /API_KEY|TOKEN|SECRET|AUTH|COOKIE|SESSION|PROXY|CREDENTIAL|PRIVATE_KEY|PASSPHRASE/i;
// Explicitly refused even when the pattern above would miss them.
const STRIP_EXACT = new Set([
  "NODE_OPTIONS",
  "NODE_PATH",
  "LD_PRELOAD",
  "DYLD_INSERT_LIBRARIES",
  "PYTHONPATH",
]);
const KEEP_PREFIXES = [
  "T02_",
  "PI_CODING_AGENT_DIR",
  "PI_CODING_AGENT_SESSION_DIR",
  "PI_OFFLINE",
  "PI_SKIP_VERSION_CHECK",
  "PI_TELEMETRY",
  "PI_TUI_",
  "PI_TRUE_COLOR",
  "PI_IMAGE_PROTOCOL",
  "PI_HYPERLINKS",
];

function keepVar(name) {
  if (KEEP_PREFIXES.some((prefix) => name === prefix || name.startsWith(prefix))) return true;
  return false;
}

export function sanitizeEnv() {
  const stripped = [];
  const env = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (keepVar(name)) continue; // set explicitly below; never inherited
    if (STRIP_EXACT.has(name) || STRIP_PATTERN.test(name)) {
      stripped.push(name);
      continue;
    }
    if (
      [
        "PATH",
        "HOME",
        "USER",
        "LOGNAME",
        "SHELL",
        "TERM",
        "LANG",
        "LC_ALL",
        "LC_CTYPE",
        "TMPDIR",
        "TEMP",
        "TMP",
        "TZ",
        "NO_COLOR",
        "CI",
      ].includes(name)
    ) {
      env[name] = value;
    }
    // All other inherited variables are dropped (closed environment).
  }
  return { env, stripped };
}

export function prepareRoots() {
  const base = mkdtempSync(join(tmpdir(), "t02-run-"), { mode: 0o700 });
  const roots = {
    base,
    home: join(base, "home"),
    xdg: join(base, "xdg"),
    agent: join(base, "agent"),
    session: join(base, "session"),
    cwd: join(base, "cwd"),
    run: join(base, "run"),
    tmp: join(base, "tmp"),
  };
  for (const dir of Object.values(roots)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  return roots;
}

export function buildExperimentEnv(roots, scenarioEnv) {
  const { env, stripped } = sanitizeEnv();
  const nodeHome = process.env["T01_NODE_HOME"];
  env["PATH"] = nodeHome
    ? `${nodeHome}/bin:${env["PATH"] ?? "/usr/bin:/bin"}`
    : (env["PATH"] ?? "/usr/bin:/bin");
  env["HOME"] = roots.home;
  env["XDG_CONFIG_HOME"] = join(roots.xdg, "config");
  env["XDG_DATA_HOME"] = join(roots.xdg, "data");
  env["XDG_CACHE_HOME"] = join(roots.xdg, "cache");
  env["TMPDIR"] = roots.tmp;
  env["PI_CODING_AGENT_DIR"] = roots.agent;
  env["PI_CODING_AGENT_SESSION_DIR"] = roots.session;
  env["PI_OFFLINE"] = "1";
  env["PI_SKIP_VERSION_CHECK"] = "1";
  env["PI_TELEMETRY"] = "0";
  env["TERM"] = env["TERM"] ?? "xterm-256color";
  for (const [name, value] of Object.entries(scenarioEnv)) env[name] = value;
  mkdirSync(env["XDG_CONFIG_HOME"], { recursive: true, mode: 0o700 });
  mkdirSync(env["XDG_DATA_HOME"], { recursive: true, mode: 0o700 });
  mkdirSync(env["XDG_CACHE_HOME"], { recursive: true, mode: 0o700 });
  return { env, stripped };
}

export function cleanupRoots(roots) {
  try {
    rmSync(roots.base, { recursive: true, force: true, maxRetries: 2 });
    return true;
  } catch {
    return false;
  }
}

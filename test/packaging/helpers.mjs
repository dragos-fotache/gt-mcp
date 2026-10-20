// T18-S1 local package fixtures: public npm/tar boundaries, no source fallback.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = fileURLToPath(new URL("../../", import.meta.url));
export const PACKAGE_NAME = "gymtracka-mcp-0.0.0";
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

export function isolatedEnv(root) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name, value]) =>
        typeof value === "string" &&
        !/^npm_/i.test(name) &&
        !["NODE_OPTIONS", "NODE_PATH", "DBUS_SESSION_BUS_ADDRESS"].includes(name),
    ),
  );
  const userconfig = path.join(root, "npmrc");
  const globalconfig = path.join(root, "global-npmrc");
  fs.writeFileSync(userconfig, "", { mode: 0o600 });
  fs.writeFileSync(globalconfig, "", { mode: 0o600 });
  return {
    ...env,
    HOME: root,
    XDG_CONFIG_HOME: root,
    XDG_DATA_HOME: root,
    XDG_STATE_HOME: root,
    DBUS_SESSION_BUS_ADDRESS: "unix:path=/synthetic-unavailable-bus",
    NODE_OPTIONS: "",
    NODE_PATH: "",
    npm_config_userconfig: userconfig,
    npm_config_globalconfig: globalconfig,
    npm_config_cache: path.join(root, "npm-cache"),
    npm_config_registry: "https://registry.npmjs.org/",
    npm_config_audit: "false",
    npm_config_fund: "false",
  };
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, `${command} terminated by signal`);
  assert.equal(result.status, 0, `${command} failed: ${result.stderr}`);
  return result;
}

// Python's standard tar reader independently reports actual members/bytes,
// rather than trusting the packer's own inventory or implementing tar parsing.
export function inspectArchive(archive) {
  const script = `import hashlib, json, sys, tarfile
with tarfile.open(sys.argv[1], "r:gz") as archive:
    print(json.dumps([dict(path=m.name, mode=m.mode,
        type="file" if m.isfile() else "directory" if m.isdir() else "unsafe",
        sha256=hashlib.sha256(archive.extractfile(m).read()).hexdigest() if m.isfile() else None)
        for m in archive.getmembers()]))`;
  return JSON.parse(run("python3", ["-c", script, archive]).stdout);
}

export function assertSafeMembers(members) {
  assert(members.length > 0);
  const seen = new Set();
  for (const member of members) {
    assert(member.path.startsWith("package/"), "archive member outside package root");
    assert(!member.path.includes("\\"), "ambiguous archive path");
    assert(!member.path.split("/").includes(".."), "archive traversal");
    assert(!member.path.split("/").includes("."), "noncanonical archive path");
    assert(!seen.has(member.path), "duplicate archive member");
    seen.add(member.path);
    assert(["file", "directory"].includes(member.type), "archive link or special file");
    assert.equal(member.mode & 0o7022, 0, "unsafe archive permissions");
  }
}

export function createArtifactFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gt-t18-package-"));
  const env = isolatedEnv(root);
  const out = path.join(root, "artifact");
  fs.mkdirSync(out);
  const fixture = {
    root,
    env,
    out,
    archive: path.join(out, `${PACKAGE_NAME}.tgz`),
    inventory: path.join(out, `${PACKAGE_NAME}.inventory.json`),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
  try {
    const supplied = process.env.GT_PACKAGE_REFRESH_ARTIFACT_ROOT;
    if (supplied) {
      // Refresh verification consumes the exact retained delivery bytes. Normal
      // T18 runs keep the original fresh-pack behavior below.
      fs.copyFileSync(path.join(supplied, `${PACKAGE_NAME}.tgz`), fixture.archive);
      fs.copyFileSync(path.join(supplied, `${PACKAGE_NAME}.inventory.json`), fixture.inventory);
    } else {
      run("npm", ["run", "package:artifact", "--", "--out", out], { cwd: REPO, env });
    }
    fixture.members = inspectArchive(fixture.archive);
    // Extraction is permitted only after checking the actual archive members.
    assertSafeMembers(fixture.members);
    return fixture;
  } catch (error) {
    fixture.cleanup();
    throw error;
  }
}

export function installExtracted(fixture) {
  const destination = path.join(fixture.root, "extracted");
  fs.mkdirSync(destination);
  run("tar", ["-xzf", fixture.archive, "-C", destination, "--no-same-owner"], {
    env: fixture.env,
  });
  const app = path.join(destination, "package");
  run("npm", ["ci", "--omit=dev", "--ignore-scripts"], { cwd: app, env: fixture.env });
  return app;
}

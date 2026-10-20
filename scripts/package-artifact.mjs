// Private local application packaging. Never runs product code or resolves new versions.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");
const fail = () => {
  throw new Error(
    "Packaging inputs or output are invalid; use a clean build and empty output directory.",
  );
};

function read(relative) {
  if (path.isAbsolute(relative) || relative.split("/").some((p) => !p || p === "." || p === ".."))
    fail();
  let cursor = root;
  for (const part of relative.split("/")) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) fail();
  }
  const fd = fs.openSync(cursor, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    if (!fs.fstatSync(fd).isFile()) fail();
    return fs.readFileSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function runtimeLock(pkg, lock, manifest) {
  if (lock.lockfileVersion !== 3 || !lock.packages?.[""]) fail();
  const resolve = (owner, name) => {
    if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name)) fail();
    let parent = owner;
    for (;;) {
      const candidate = path.posix.join(parent, "node_modules", name);
      if (Object.hasOwn(lock.packages, candidate)) return candidate;
      if (!parent) return undefined;
      const next = path.posix.dirname(parent);
      parent = next === "." ? "" : next;
    }
  };
  const queue = Object.keys(pkg.dependencies).map((name) => resolve("", name));
  const selected = new Map();
  while (queue.length) {
    const location = queue.shift();
    if (!location) fail();
    if (selected.has(location)) continue;
    const record = lock.packages[location];
    if (
      record.link ||
      !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(record.version) ||
      !record.resolved?.startsWith("https://registry.npmjs.org/") ||
      !/^sha512-[A-Za-z0-9+/]+=*$/.test(record.integrity ?? "") ||
      /(?:^|\/)@earendil-works\/|companion|pi-coding-agent/.test(location)
    )
      fail();
    const copy = { ...record };
    // Root workspace peers taint dev classification; the reachable runtime graph owns it here.
    delete copy.dev;
    delete copy.devOptional;
    selected.set(location, copy);
    for (const name of Object.keys({ ...record.dependencies, ...record.optionalDependencies })) {
      const target = resolve(location, name);
      if (target) queue.push(target);
      else if (!Object.hasOwn(record.optionalDependencies ?? {}, name)) fail();
    }
    for (const name of Object.keys(record.peerDependencies ?? {})) {
      if (record.peerDependenciesMeta?.[name]?.optional === true) continue;
      queue.push(resolve(location, name));
    }
  }
  const packages = {
    "": {
      name: manifest.name,
      version: manifest.version,
      dependencies: manifest.dependencies,
      bin: manifest.bin,
      engines: manifest.engines,
    },
    ...Object.fromEntries([...selected].sort(([a], [b]) => a.localeCompare(b))),
  };
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    if (packages[resolve("", name)]?.version !== version) fail();
  }
  return {
    name: manifest.name,
    version: manifest.version,
    lockfileVersion: 3,
    requires: true,
    packages,
  };
}

function pack(output) {
  if (Number(process.versions.node.split(".")[0]) < 24) fail();
  const npm = path.resolve(
    path.dirname(process.execPath),
    "../lib/node_modules/npm/bin/npm-cli.js",
  );
  const npmMetadata = JSON.parse(fs.readFileSync(path.join(path.dirname(npm), "../package.json")));
  if (npmMetadata.version !== "11.19.0") fail();
  const pkgBytes = read("package.json");
  const lockBytes = read("package-lock.json");
  const pkg = JSON.parse(pkgBytes);
  if (
    pkg.name !== "gymtracka-mcp" ||
    pkg.version !== "0.0.0" ||
    pkg.private !== true ||
    pkg.type !== "module" ||
    pkg.packageManager !== "npm@11.19.0" ||
    pkg.engines?.node !== ">=24.0.0" ||
    Object.keys(pkg.dependencies).sort().join(",") !==
      "@homebridge/dbus-native,@modelcontextprotocol/sdk,zod" ||
    Object.values(pkg.dependencies).some((v) => !/^\d+\.\d+\.\d+$/.test(v)) ||
    pkg.bin["gymtracka-mcp"] !== "./dist/cli/main.js" ||
    pkg.bin["gymtracka-mcp-server"] !== "./dist/protocol/server.js"
  )
    fail();
  const manifest = {
    name: pkg.name,
    version: pkg.version,
    private: true,
    type: "module",
    description: "GymTracka portable MCP server and trusted local CLI (private candidate)",
    packageManager: pkg.packageManager,
    engines: pkg.engines,
    bin: pkg.bin,
    dependencies: pkg.dependencies,
    files: [
      "dist",
      "docs",
      "examples",
      "install.mjs",
      "npm-shrinkwrap.json",
      "THIRD-PARTY-NOTICES.txt",
    ],
  };
  const shrinkwrap = runtimeLock(pkg, JSON.parse(lockBytes), manifest);
  const inputs = {
    "package.json": sha256(pkgBytes),
    "package-lock.json": sha256(lockBytes),
    "scripts/package-artifact.mjs": sha256(read("scripts/package-artifact.mjs")),
  };
  const files = new Map();
  const add = (name, bytes, mode = 0o644) => {
    if (files.has(name)) fail();
    files.set(name, { bytes, mode });
  };
  const fromInput = (source, target, mode) => {
    const bytes = read(source);
    inputs[source] = sha256(bytes);
    add(target, bytes, mode);
  };
  add("package.json", json(manifest));
  add("npm-shrinkwrap.json", json(shrinkwrap));
  const runtimeListBytes = read("packaging/runtime-files.json");
  inputs["packaging/runtime-files.json"] = sha256(runtimeListBytes);
  const runtimeFiles = JSON.parse(runtimeListBytes);
  if (!Array.isArray(runtimeFiles) || runtimeFiles.length === 0) fail();
  for (const name of runtimeFiles) {
    if (
      typeof name !== "string" ||
      !/^dist\/(?:auth|cli|creation|domain|http|lifecycle|login|protocol|runtime|storage(?:\/credential)?)\/[A-Za-z][A-Za-z0-9-]*\.js$/.test(
        name,
      ) ||
      /\/(?:diag-support|diag-worker|test-facility)\.js$/.test(name) ||
      name === "dist/cli/index.js"
    )
      fail();
    fromInput(name, name, Object.values(pkg.bin).includes("./" + name) ? 0o755 : 0o644);
  }
  for (const entry of [...Object.values(pkg.bin), "./dist/storage/credential/worker.js"])
    if (!files.has(entry.slice(2))) fail();
  const documentsBytes = read("packaging/document-files.json");
  inputs["packaging/document-files.json"] = sha256(documentsBytes);
  for (const [source, target] of Object.entries(JSON.parse(documentsBytes))) {
    if (
      !/^(?:packaging|docs)\/[A-Za-z0-9/.-]+\.(?:md|json)$/.test(source) ||
      !/^(?:README\.md|(?:docs|examples)\/[A-Za-z0-9][A-Za-z0-9.-]*\.(?:md|json))$/.test(target)
    )
      fail();
    fromInput(source, target);
  }
  fromInput("scripts/install.mjs", "install.mjs");
  let notices = "Runtime dependency notices. Original terms follow unchanged.\n";
  const dependencies = [];
  for (const [location, record] of Object.entries(shrinkwrap.packages)) {
    if (!location) continue;
    const metadataBytes = read(location + "/package.json");
    inputs[location + "/package.json"] = sha256(metadataBytes);
    const metadata = JSON.parse(metadataBytes);
    if (metadata.version !== record.version) fail();
    const names = fs
      .readdirSync(path.join(root, location))
      .filter((n) => /^(?:licen[cs]e|copying|notice)(?:[._-]|$)/i.test(n));
    if (!names.length) fail();
    for (const name of names.sort()) {
      const relative = location + "/" + name;
      const bytes = read(relative);
      inputs[relative] = sha256(bytes);
      notices +=
        `\n===== ${metadata.name}@${record.version}: ${name} =====\n` +
        bytes.toString("utf8") +
        "\n";
    }
    dependencies.push({
      name: metadata.name,
      path: location,
      version: record.version,
      integrity: record.integrity,
    });
  }
  add("THIRD-PARTY-NOTICES.txt", Buffer.from(notices));
  const stage = fs.mkdtempSync(path.join(output, ".stage-"));
  const npmScope = fs.mkdtempSync(path.join(os.tmpdir(), "gt-t18-pack-npm-"));
  const createdOutputs = [];
  try {
    for (const [name, { bytes, mode }] of files) {
      const target = path.join(stage, name);
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
      fs.writeFileSync(target, bytes, { mode, flag: "wx" });
      fs.chmodSync(target, mode);
    }
    const userConfig = path.join(npmScope, "user.npmrc");
    const globalConfig = path.join(npmScope, "global.npmrc");
    fs.writeFileSync(userConfig, "");
    fs.writeFileSync(globalConfig, "");
    const result = spawnSync(
      process.execPath,
      [npm, "pack", "--ignore-scripts", "--json", "--pack-destination", stage],
      {
        cwd: stage,
        env: {
          PATH: path.dirname(process.execPath) + ":/usr/bin:/bin",
          HOME: npmScope,
          NPM_CONFIG_USERCONFIG: userConfig,
          NPM_CONFIG_GLOBALCONFIG: globalConfig,
          NPM_CONFIG_CACHE: path.join(npmScope, "cache"),
        },
        encoding: "utf8",
        timeout: 30000,
      },
    );
    if (result.status !== 0) fail();
    const [packed] = JSON.parse(result.stdout);
    const name = `${manifest.name}-${manifest.version}.tgz`;
    if (packed.filename !== name || packed.files.length !== files.size) fail();
    for (const entry of packed.files) {
      const expected = files.get(entry.path);
      if (!expected || entry.mode !== expected.mode || entry.size !== expected.bytes.length) fail();
    }
    const report = {
      version: 1,
      node: process.versions.node,
      npm: npmMetadata.version,
      archive: { name, sha256: sha256(fs.readFileSync(path.join(stage, name))) },
      files: [...files]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => ({
          path: name,
          sha256: sha256(value.bytes),
          mode: value.mode,
        })),
      runtimeDependencies: dependencies,
      inputs,
    };
    const inventoryName = `${manifest.name}-${manifest.version}.inventory.json`;
    fs.writeFileSync(path.join(stage, inventoryName), json(report), { flag: "wx", mode: 0o644 });
    for (const filename of [name, inventoryName]) {
      const target = path.join(output, filename);
      fs.copyFileSync(path.join(stage, filename), target, fs.constants.COPYFILE_EXCL);
      createdOutputs.push(target);
    }
    process.stdout.write(
      `Created ${name}; ${files.size} package files, ${dependencies.length} locked runtime dependencies.\n`,
    );
  } catch (error) {
    for (const target of createdOutputs) fs.unlinkSync(target);
    throw error;
  } finally {
    fs.rmSync(stage, { recursive: true });
    fs.rmSync(npmScope, { recursive: true });
  }
}

try {
  const [flag, output, ...rest] = process.argv.slice(2);
  if (
    flag !== "--out" ||
    !output ||
    rest.length ||
    !path.isAbsolute(output) ||
    path.normalize(output) !== output
  )
    fail();
  if (
    fs.realpathSync(output) !== output ||
    !fs.lstatSync(output).isDirectory() ||
    fs.readdirSync(output).length
  )
    fail();
  pack(output);
} catch {
  process.stderr.write(
    "GymTracka package creation failed; verify pinned tooling, clean inputs and an empty output directory.\n",
  );
  process.exitCode = 1;
}

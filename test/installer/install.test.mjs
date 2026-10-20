import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createArtifactFixture, isolatedEnv, run } from "../packaging/helpers.mjs";

describe("interactive extracted-package installer", () => {
  let artifact;
  let source;
  beforeAll(() => {
    artifact = createArtifactFixture();
    const extraction = path.join(artifact.root, "source");
    fs.mkdirSync(extraction);
    run("tar", ["-xzf", artifact.archive, "-C", extraction, "--no-same-owner"]);
    source = path.join(extraction, "package");
    fs.writeFileSync(path.join(source, ".env"), "SYNTHETIC-PRIVATE-CANARY");
  });
  afterAll(() => artifact?.cleanup());

  function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gt-installer-"));
    const env = isolatedEnv(root);
    const home = path.join(root, "home");
    fs.mkdirSync(home, { mode: 0o700 });
    env.HOME = home;
    env.HERMES_HOME = path.join(home, ".hermes");
    const app = path.join(home, "application");
    const config = path.join(home, "settings");
    return {
      root,
      env,
      home,
      app,
      config,
      execute(lines, args = []) {
        return spawnSync(process.execPath, [path.join(source, "install.mjs"), ...args], {
          cwd: root,
          env,
          input: lines.join("\n") + "\n",
          encoding: "utf8",
          timeout: 120000,
        });
      },
      answers(writes = "", setup = "n") {
        return [
          app,
          config,
          "https://synthetic-installer.example.invalid",
          "synthetic-installer-client.apps.googleusercontent.com",
          "8765",
          path.join(root, "unavailable-bus"),
          writes,
          "y",
          setup,
        ];
      },
      close() {
        fs.rmSync(root, { recursive: true, force: true });
      },
    };
  }

  function image(root) {
    const files = {};
    function visit(name) {
      const stat = fs.lstatSync(name);
      const relative = path.relative(root, name);
      if (stat.isSymbolicLink()) files[relative] = { link: fs.readlinkSync(name) };
      else if (stat.isDirectory()) {
        files[relative] = { mode: stat.mode & 0o777 };
        for (const child of fs.readdirSync(name).sort()) visit(path.join(name, child));
      } else
        files[relative] = {
          mode: stat.mode & 0o777,
          sha256: createHash("sha256").update(fs.readFileSync(name)).digest("hex"),
        };
    }
    visit(root);
    return files;
  }

  function installed(f) {
    expect(f.execute(f.answers()).status).toBe(0);
    return path.join(f.config, "config.json");
  }

  it("updates at the same application path with real locked dependencies, retains the old app and preserves private state", () => {
    const f = fixture();
    try {
      const config = installed(f);
      const profile = path.join(f.config, "profile");
      const enabled = JSON.parse(fs.readFileSync(config));
      fs.writeFileSync(config, JSON.stringify({ ...enabled, writesEnabled: true }));
      fs.mkdirSync(profile, { mode: 0o700 });
      fs.writeFileSync(path.join(profile, "credentials.enc"), "SYNTHETIC-UNCHANGED-RECORD", {
        mode: 0o600,
      });
      fs.mkdirSync(f.env.HERMES_HOME, { mode: 0o700 });
      fs.writeFileSync(path.join(f.env.HERMES_HOME, "config.yaml"), "SYNTHETIC-HOST-CONFIG", {
        mode: 0o600,
      });
      fs.writeFileSync(path.join(f.app, "README.md"), "SYNTHETIC-OLD-APP");
      fs.writeFileSync(path.join(f.app, "dist/runtime/obsolete.js"), "SYNTHETIC-OBSOLETE");
      const privateBefore = image(f.config);
      const hermesBefore = image(f.env.HERMES_HOME);
      const old = image(f.app);
      const result = f.execute([f.app, config, "y", "y"], ["--update"]);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Application updated at the existing path");
      expect(result.stdout).not.toContain("Create the profile");
      expect(result.stdout + result.stderr).not.toContain(f.home);
      expect(image(f.config)).toEqual(privateBefore);
      expect(image(f.env.HERMES_HOME)).toEqual(hermesBefore);
      expect(fs.existsSync(path.join(f.app, "dist/runtime/obsolete.js"))).toBe(false);
      expect(fs.readFileSync(path.join(f.app, "README.md"))).toEqual(
        fs.readFileSync(path.join(source, "README.md")),
      );
      const backups = fs
        .readdirSync(f.home)
        .filter((name) => name.startsWith("application.backup-"));
      expect(backups).toHaveLength(1);
      expect(image(path.join(f.home, backups[0], "application"))).toEqual(old);
      expect(fs.existsSync(f.app + ".update")).toBe(false);
      run(process.execPath, [path.join(f.app, "dist/cli/main.js"), "--help"], {
        cwd: f.root,
        env: f.env,
      });
      // A second update works without deleting or reusing the first backup.
      expect(f.execute([f.app, config, "y", "y"], ["--update"]).status).toBe(0);
      expect(
        fs.readdirSync(f.home).filter((name) => name.startsWith("application.backup-")),
      ).toHaveLength(2);
      expect(image(f.config)).toEqual(privateBefore);
    } finally {
      f.close();
    }
  }, 120000);

  it("cancels update on unconfirmed shutdown, declined replacement or EOF without changing the existing app", () => {
    const f = fixture();
    try {
      const config = installed(f);
      const before = image(f.home);
      for (const answers of [
        [f.app, config, "n"],
        [f.app, config, "y", "n"],
        [f.app, config],
      ]) {
        const result = f.execute(answers, ["--update"]);
        expect(result.status).toBe(answers.length === 2 ? 1 : 0);
        expect(image(f.home)).toEqual(before);
      }
    } finally {
      f.close();
    }
  }, 120000);

  it("leaves the old app and config intact when real offline dependency preparation fails", () => {
    const f = fixture();
    try {
      const config = installed(f);
      const before = image(f.home);
      f.env.npm_config_cache = path.join(f.root, "empty-offline-cache");
      f.env.npm_config_offline = "true";
      const result = f.execute([f.app, config, "y", "y"], ["--update"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Update preparation failed");
      expect(image(f.home)).toEqual(before);
    } finally {
      f.close();
    }
  }, 120000);

  it("refuses unsafe/unrelated targets, embedded config/profile and unresolved update directories", () => {
    const f = fixture();
    try {
      const config = installed(f);
      const unrelated = path.join(f.home, "unrelated");
      fs.mkdirSync(unrelated, { mode: 0o700 });
      fs.writeFileSync(path.join(unrelated, "keep"), "SYNTHETIC-KEEP");
      const link = path.join(f.home, "link");
      fs.symlinkSync(f.app, link);
      const embedded = path.join(f.app, "docs/config.json");
      fs.copyFileSync(config, embedded);
      fs.chmodSync(embedded, 0o600);
      const marker = f.app + ".update";
      fs.mkdirSync(marker, { mode: 0o700 });
      fs.writeFileSync(path.join(marker, "keep"), "SYNTHETIC-UNRESOLVED");
      const before = image(f.home);
      const result = f.execute(
        [unrelated, link, source, f.app, embedded, config, "y", "y"],
        ["--update"],
      );
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("unrecognized files");
      expect(result.stdout).toContain("unsafe ancestor");
      expect(result.stdout).toContain("outside the application being updated");
      expect(result.stdout).toContain("configuration outside");
      expect(result.stderr).toContain("update directory already exists");
      expect(image(f.home)).toEqual(before);
      fs.rmSync(marker, { recursive: true });
      const record = JSON.parse(fs.readFileSync(config));
      fs.writeFileSync(
        config,
        JSON.stringify({
          ...record,
          storage: { ...record.storage, profileRoot: path.join(f.app, "profile") },
        }),
      );
      const embeddedProfileBefore = image(f.home);
      const refused = f.execute([f.app, config, "y", "y"], ["--update"]);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain("credential profile separate");
      expect(image(f.home)).toEqual(embeddedProfileBefore);
    } finally {
      f.close();
    }
  }, 120000);

  it("installs real locked dependencies, writes protected disabled configs and leaves setup/registration opt-in", () => {
    const f = fixture();
    try {
      const result = f.execute(f.answers());
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const config = JSON.parse(fs.readFileSync(path.join(f.config, "config.json")));
      const login = JSON.parse(fs.readFileSync(path.join(f.config, "login.json")));
      expect(config).toEqual({
        version: 2,
        serviceOrigin: "https://synthetic-installer.example.invalid",
        storage: {
          profileRoot: path.join(f.config, "profile"),
          secretServiceBusAddress: "unix:path=" + path.join(f.root, "unavailable-bus"),
        },
        writesEnabled: false,
      });
      expect(login).toEqual({
        version: 1,
        googleWebClientId: "synthetic-installer-client.apps.googleusercontent.com",
        browserOrigin: "http://localhost:8765",
      });
      for (const name of ["config.json", "login.json", "hermes-mcp.yaml", "next-steps.txt"])
        expect(fs.statSync(path.join(f.config, name)).mode & 0o777).toBe(0o600);
      for (const dir of [f.app, f.config]) expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
      const lock = JSON.parse(fs.readFileSync(path.join(f.app, "npm-shrinkwrap.json")));
      for (const [location, entry] of Object.entries(lock.packages)) {
        if (!location) continue;
        expect(
          JSON.parse(fs.readFileSync(path.join(f.app, location, "package.json"))).version,
        ).toBe(entry.version);
      }
      expect(fs.existsSync(path.join(f.app, ".env"))).toBe(false);
      expect(fs.existsSync(config.storage.profileRoot)).toBe(false);
      expect(fs.existsSync(f.env.HERMES_HOME)).toBe(false);
      expect(fs.readFileSync(path.join(f.config, "hermes-mcp.yaml"), "utf8")).toContain(
        "command: node",
      );
      for (const value of [
        f.home,
        config.serviceOrigin,
        login.googleWebClientId,
        "SYNTHETIC-PRIVATE-CANARY",
      ])
        expect(result.stdout + result.stderr).not.toContain(value);
    } finally {
      f.close();
    }
  }, 120000);

  it("requires an explicit yes to enable writes and handles real setup failure without retry or Hermes edits", () => {
    const f = fixture();
    try {
      const result = f.execute(f.answers("y", "y"));
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(JSON.parse(fs.readFileSync(path.join(f.config, "config.json"))).writesEnabled).toBe(
        true,
      );
      expect(result.stdout).toContain("Profile setup did not finish");
      expect(result.stdout).not.toContain("Open Google sign-in");
      expect(fs.existsSync(path.join(f.config, "profile", "credentials.enc"))).toBe(false);
      expect(fs.existsSync(f.env.HERMES_HOME)).toBe(false);
    } finally {
      f.close();
    }
  }, 120000);

  it("cancels before mutation, reprompts invalid origins and refuses existing or symlinked destinations", () => {
    const f = fixture();
    try {
      const occupied = path.join(f.home, "existing");
      fs.mkdirSync(occupied);
      const marker = path.join(occupied, "keep");
      fs.writeFileSync(marker, "preserve");
      const link = path.join(f.home, "link");
      fs.symlinkSync(occupied, link);
      const answers = f.answers();
      answers.splice(0, 1, occupied, link, path.join(link, "new-app"), f.app);
      answers.splice(5, 0, "http://synthetic-insecure.example.invalid");
      answers[answers.length - 2] = "n";
      const result = f.execute(answers);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("That directory already exists");
      expect(result.stdout).toContain("unsafe ancestor");
      expect(result.stdout).toContain("canonical HTTPS origin");
      expect(result.stdout).toContain("no files were created");
      expect(fs.readFileSync(marker, "utf8")).toBe("preserve");
      expect(fs.existsSync(f.app)).toBe(false);
      expect(fs.existsSync(f.config)).toBe(false);
    } finally {
      f.close();
    }
  });

  it("treats EOF as cancellation and prints standalone help without touching HOME", () => {
    const f = fixture();
    try {
      const cancelled = f.execute([]);
      expect(cancelled.status).toBe(1);
      expect(cancelled.stderr).toContain("Installation cancelled");
      const help = f.execute([], ["--help"]);
      expect(help.status).toBe(0);
      expect(help.stdout).toContain("Usage: node install.mjs");
      expect(fs.readdirSync(f.home)).toEqual([]);
    } finally {
      f.close();
    }
  });
});

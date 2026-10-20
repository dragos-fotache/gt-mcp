// Interactive install/update from an extracted private package. No install hooks.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

const PACKAGE_FILES = [
  "dist",
  "docs",
  "examples",
  "README.md",
  "package.json",
  "npm-shrinkwrap.json",
  "THIRD-PARTY-NOTICES.txt",
  "install.mjs",
];

class InstallError extends Error {}
const refuse = (message) => {
  throw new InstallError(message);
};
const exists = (name) => {
  try {
    fs.lstatSync(name);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

function absolute(value) {
  const expanded = value.startsWith("~/") ? path.join(os.homedir(), value.slice(2)) : value;
  if (
    !path.isAbsolute(expanded) ||
    path.normalize(expanded) !== expanded ||
    expanded === "/" ||
    [...expanded].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    refuse("Use an absolute normalized path without symlinks or control characters.");
  return expanded;
}

function ancestors(selected) {
  const entries = [];
  for (let current = selected; ; current = path.dirname(current)) {
    if (exists(current)) {
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink() || ![0, process.getuid()].includes(stat.uid))
        refuse("A selected path has an unsafe ancestor. Choose a private user-owned directory.");
      entries.push({ name: current, stat });
    }
    if (current === "/") break;
  }
  for (const { name, stat } of entries) {
    if ((stat.mode & 0o022) === 0) continue;
    if (
      stat.uid !== 0 ||
      !(stat.mode & 0o1000) ||
      !entries.some(
        (entry) =>
          entry.name !== name &&
          inside(name, entry.name) &&
          entry.stat.uid === process.getuid() &&
          (entry.stat.mode & 0o777) === 0o700,
      )
    )
      refuse("A selected path has a writable ancestor. Choose a private directory.");
  }
}

function fresh(value) {
  const selected = absolute(value);
  if (exists(selected)) refuse("That directory already exists. Choose a new directory.");
  ancestors(path.dirname(selected));
  return selected;
}

function protectedRegularFile(selected) {
  ancestors(path.dirname(selected));
  const stat = fs.lstatSync(selected);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== process.getuid() ||
    stat.nlink !== 1 ||
    stat.mode & 0o022
  )
    refuse("Select a safe user-owned regular file without writable permissions for others.");
  return stat;
}

function existingApplication(value, source) {
  const selected = absolute(value);
  ancestors(selected);
  const stat = fs.lstatSync(selected);
  if (stat.uid !== process.getuid()) refuse("Select your existing application directory.");
  if (inside(source, selected) || inside(selected, source))
    refuse("Extract the new archive outside the application being updated.");
  const allowed = new Set([...PACKAGE_FILES, "node_modules", "package-lock.json"]);
  if (fs.readdirSync(selected).some((name) => !allowed.has(name)))
    refuse(
      "The application contains unrecognized files. Preserve them outside it before updating.",
    );
  const manifest = path.join(selected, "package.json");
  if (protectedRegularFile(manifest).size > 65536) refuse("Invalid installed package metadata.");
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
  } catch {
    refuse("Select an installed GymTracka MCP application.");
  }
  if (
    pkg.name !== "gymtracka-mcp" ||
    pkg.private !== true ||
    pkg.type !== "module" ||
    pkg.bin?.["gymtracka-mcp-server"] !== "./dist/protocol/server.js" ||
    pkg.bin?.["gymtracka-mcp"] !== "./dist/cli/main.js"
  )
    refuse("Select an installed GymTracka MCP application.");
  for (const name of ["dist/protocol/server.js", "dist/cli/main.js", "npm-shrinkwrap.json"])
    protectedRegularFile(path.join(selected, name));
  return { path: selected, dev: stat.dev, ino: stat.ino };
}

async function updateApplication({ source, ask, yes, say, signal }) {
  say("GymTracka MCP application update using your installed Node and npm.");
  say("External configuration, profiles, credentials and Hermes registration will be retained.");
  const selected = await ask(
    "Existing application directory",
    "~/.local/share/gymtracka-mcp/app",
    (value) => existingApplication(value, source),
  );
  const app = selected.path;
  const config = await ask(
    "Existing protected server config file",
    "~/.config/gymtracka-mcp/config.json",
    (value) => {
      const file = absolute(value);
      if (inside(app, file) || inside(source, file))
        refuse("Keep the existing configuration outside both application directories.");
      const stat = protectedRegularFile(file);
      if ((stat.mode & 0o777) !== 0o600 && (stat.mode & 0o777) !== 0o400)
        refuse("The existing server config must have mode0400 or0600.");
      return file;
    },
  );
  say("Stop every MCP server using this application/profile, including surviving Hermes backends.");
  say(
    "The installer cannot prove those processes have stopped. Closing a UI alone may leave them running.",
  );
  if (!(await yes("Have all those MCP processes stopped"))) {
    say("Update cancelled; the existing application is unchanged.");
    return;
  }
  say(
    "Will prepare locked dependencies, replace the application at the same path and retain a backup.",
  );
  if (!(await yes("Proceed with this application update"))) {
    say("Update cancelled; the existing application is unchanged.");
    return;
  }
  if (signal.aborted) refuse("Update cancelled.");
  const transaction = app + ".update";
  try {
    fs.mkdirSync(transaction, { mode: 0o700 });
  } catch (error) {
    if (error.code === "EEXIST")
      refuse(
        "An update directory already exists. Follow the bundled interrupted-update recovery instructions.",
      );
    throw error;
  }
  const replacement = path.join(transaction, "replacement");
  const previous = path.join(transaction, "previous");
  let moved = false;
  let activated = false;
  try {
    fs.mkdirSync(replacement, { mode: 0o700 });
    for (const name of PACKAGE_FILES)
      copyDelivered(path.join(source, name), path.join(replacement, name));
    say("Preparing locked runtime dependencies; the existing application is unchanged.");
    if (
      !(await child("npm", ["ci", "--omit=dev", "--ignore-scripts"], {
        cwd: replacement,
        signal,
      }))
    )
      refuse(
        "Update preparation failed or was interrupted. The existing application is unchanged.",
      );
    const { loadLoginConfiguration } = await import(
      pathToFileURL(path.join(replacement, "dist/login/configuration.js"))
    );
    let validated;
    try {
      validated = await loadLoginConfiguration(config);
    } catch {
      refuse(
        "The existing server config is invalid or unsafe. Update refused without changing it.",
      );
    }
    for (const root of [app, source, transaction]) {
      if (inside(root, validated.profileRoot) || inside(validated.profileRoot, root))
        refuse("Keep the credential profile separate from application and update directories.");
    }
    const current = existingApplication(app, source);
    if (current.dev !== selected.dev || current.ino !== selected.ino)
      refuse("The selected application changed during preparation. Update refused.");
    if (signal.aborted) refuse("Update cancelled; the existing application is unchanged.");
    fs.renameSync(app, previous);
    moved = true;
    try {
      fs.renameSync(replacement, app);
      activated = true;
    } catch {
      try {
        fs.renameSync(previous, app);
        moved = false;
      } catch {
        refuse(
          "Activation and restoration failed. Preserve the sibling .update directory and follow recovery instructions.",
        );
      }
      refuse("Update activation failed; the previous application was restored.");
    }
    // Never delete the previous executable as part of an update.
    const backup = fs.mkdtempSync(app + ".backup-");
    fs.renameSync(previous, path.join(backup, "application"));
    moved = false;
    say(
      "Application updated at the existing path. The previous application is retained in a sibling .backup-* directory.",
    );
    say(
      "Config, login settings, credentials and Hermes entries were not changed. Restart the MCP backends and request a read.",
    );
  } finally {
    // An unrestored original, or an installed app awaiting backup finalization,
    // must remain recoverable. Never recursively remove that transaction.
    if (!moved) fs.rmSync(transaction, { recursive: true });
    else if (activated)
      say(
        "The new application is installed; its previous version remains in .update/previous. Preserve that directory and follow recovery instructions.",
      );
  }
}

function copyDelivered(source, destination) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()))
    refuse("Package content contains an unsafe file. Extract a verified archive again.");
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { mode: 0o700 });
    for (const name of fs.readdirSync(source))
      copyDelivered(path.join(source, name), path.join(destination, name));
  } else {
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(destination, stat.mode & 0o111 ? 0o700 : 0o600);
  }
}

function privateFile(name, text) {
  const fd = fs.openSync(name, "wx", 0o600);
  try {
    fs.writeFileSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

const shellQuote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";

function hermesSnippet(app, config) {
  return (
    "mcp_servers:\n  gymtracka:\n    command: node\n    args:\n" +
    [path.join(app, "dist/protocol/server.js"), "--config", config]
      .map((value) => "      - " + JSON.stringify(value) + "\n")
      .join("") +
    "    enabled: true\n"
  );
}

async function child(command, args, { cwd, inherit = false, signal } = {}) {
  const running = spawn(command, args, {
    cwd,
    env: process.env,
    shell: false,
    stdio: inherit ? "inherit" : "ignore",
  });
  const stop = () => running.kill("SIGINT");
  signal?.addEventListener("abort", stop, { once: true });
  try {
    return await new Promise((resolve) => {
      running.once("error", () => resolve(false));
      running.once("close", (code) => resolve(code === 0));
      if (signal?.aborted) stop();
    });
  } finally {
    signal?.removeEventListener("abort", stop);
  }
}

export async function install({
  source = fileURLToPath(new URL("./", import.meta.url)),
  input = process.stdin,
  output = process.stdout,
  update = false,
} = {}) {
  source = path.resolve(source);
  if (process.platform !== "linux" || process.arch !== "x64")
    refuse("This installer requires Linux x64.");
  if (Number(process.versions.node.split(".")[0]) < 24)
    refuse("Install Node24 or later first, then run this installer with node.");
  if (process.getuid() === 0) refuse("Run the installer as your desktop user, without sudo.");
  if (spawnSync("npm", ["--version"], { stdio: "ignore" }).status !== 0)
    refuse("npm is missing from PATH. Install npm before continuing.");
  if (spawnSync("flock", ["--version"], { stdio: "ignore" }).status !== 0)
    refuse("flock is missing. Install your distribution's util-linux package first.");
  for (const name of PACKAGE_FILES)
    if (!exists(path.join(source, name)))
      refuse("Run install.mjs from a verified extracted application archive.");

  const prompts = createInterface({
    input,
    output,
    terminal: Boolean(input.isTTY && output.isTTY),
  });
  const lines = prompts[Symbol.asyncIterator]();
  const controller = new globalThis.AbortController();
  const stop = () => {
    controller.abort();
    prompts.close();
  };
  prompts.on("SIGINT", stop);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  const say = (text) => output.write(text + "\n");
  const ask = async (label, fallback, validate = (value) => value) => {
    for (;;) {
      output.write(label + (fallback ? " [" + fallback + "]" : "") + ": ");
      const line = await lines.next();
      if (line.done || controller.signal.aborted) refuse("Installation cancelled.");
      try {
        return validate(line.value.trim() || fallback || "");
      } catch (error) {
        if (!(error instanceof InstallError)) throw error;
        say(error.message);
      }
    }
  };
  const yes = (label) =>
    ask(label + " (y/N)", "n", (value) => {
      if (/^(?:y|yes)$/iu.test(value)) return true;
      if (/^(?:n|no)$/iu.test(value)) return false;
      refuse("Answer yes or no.");
    });
  try {
    if (update) {
      await updateApplication({ source, ask, yes, say, signal: controller.signal });
      return;
    }
    say("GymTracka MCP fresh installation using your installed Node and npm.");
    say("Existing applications, profiles and credentials will not be replaced.");
    const app = await ask("New application directory", "~/.local/share/gymtracka-mcp/app", fresh);
    const configDir = await ask(
      "New private configuration directory",
      "~/.config/gymtracka-mcp",
      (value) => {
        const selected = fresh(value);
        if (inside(app, selected) || inside(selected, app))
          refuse("Keep application and configuration directories separate.");
        return selected;
      },
    );
    if (inside(source, app) || inside(source, configDir))
      refuse("Choose installation directories outside the extracted archive.");
    const origin = await ask("Backend HTTPS origin", "", (value) => {
      try {
        const url = new URL(value);
        if (url.protocol === "https:" && url.origin === value) return value;
      } catch {
        // Never echo user input or native URL errors.
      }
      refuse("Enter a canonical HTTPS origin with no path, trailing slash, credentials or query.");
    });
    const clientId = await ask("Matching Google web client ID", "", (value) => {
      if (!/^[\x21-\x7e]{1,4096}$/u.test(value)) refuse("Enter the public Google web client ID.");
      return value;
    });
    say("The Google client must authorize http://localhost:<port> exactly.");
    const port = await ask("Registered localhost login port", "8765", (value) => {
      if (!/^[1-9][0-9]*$/u.test(value) || Number(value) < 1024 || Number(value) > 65535)
        refuse("Use the registered fixed port between1024 and65535.");
      return Number(value);
    });
    say("An unlocked default Secret Service keyring named login is required for profile setup.");
    const socket = await ask(
      "Secret Service Unix socket path",
      `/run/user/${process.getuid()}/bus`,
      (value) => {
        const selected = absolute(value);
        if (/[%,;=]/u.test(selected)) refuse("Use a plain Unix socket path.");
        return selected;
      },
    );
    say(
      "Enabling creation lets any connected client create routines without per-routine confirmation.",
    );
    const writesEnabled = await yes("Enable routine creation");
    say(
      "Will copy the packaged application, install locked dependencies and create protected config files.",
    );
    say(
      writesEnabled
        ? "Routine creation will be enabled."
        : "Routine creation will remain disabled.",
    );
    if (!(await yes("Proceed with this fresh installation"))) {
      say("Installation cancelled; no files were created.");
      return;
    }
    if (controller.signal.aborted) refuse("Installation cancelled.");
    fresh(app);
    fresh(configDir);
    fs.mkdirSync(app, { recursive: true, mode: 0o700 });
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
    for (const name of PACKAGE_FILES) copyDelivered(path.join(source, name), path.join(app, name));
    say("Installing locked runtime dependencies; install scripts are disabled.");
    if (
      !(await child("npm", ["ci", "--omit=dev", "--ignore-scripts"], {
        cwd: app,
        signal: controller.signal,
      }))
    )
      refuse(
        "Dependency installation did not finish. No profile was created; inspect the new application directory locally.",
      );
    const config = path.join(configDir, "config.json");
    const login = path.join(configDir, "login.json");
    privateFile(
      config,
      JSON.stringify(
        {
          version: 2,
          serviceOrigin: origin,
          storage: {
            profileRoot: path.join(configDir, "profile"),
            secretServiceBusAddress: "unix:path=" + socket,
          },
          writesEnabled,
        },
        null,
        2,
      ) + "\n",
    );
    privateFile(
      login,
      JSON.stringify(
        { version: 1, googleWebClientId: clientId, browserOrigin: "http://localhost:" + port },
        null,
        2,
      ) + "\n",
    );
    const { loadLoginConfiguration } = await import(
      pathToFileURL(path.join(app, "dist/login/configuration.js"))
    );
    await loadLoginConfiguration(config);
    privateFile(path.join(configDir, "hermes-mcp.yaml"), hermesSnippet(app, config));
    const cli = path.join(app, "dist/cli/main.js");
    const cliArgs = (name) => [cli, name, "--config", config];
    const addArgs = [
      "mcp",
      "add",
      "gymtracka",
      "--command",
      "node",
      "--args",
      path.join(app, "dist/protocol/server.js"),
      "--config",
      config,
    ];
    privateFile(
      path.join(configDir, "next-steps.txt"),
      [
        "Use an unlocked default login keyring. Run setup once, with profileRoot nonexistent.",
        ["node", ...cliArgs("setup")].map(shellQuote).join(" "),
        ["node", ...cliArgs("login"), "--login-config", login].map(shellQuote).join(" "),
        "Register using Hermes's interactive add command (preserve existing server entries):",
        ["hermes", ...addArgs].map(shellQuote).join(" "),
        "Alternatively merge hermes-mcp.yaml into Hermes config. Reload with /reload-mcp.",
        "Stop the MCP and await ownership release before later trusted login/sign-out actions.",
      ].join("\n") + "\n",
    );
    say(
      "Application installed. Protected config.json, login.json, hermes-mcp.yaml and next-steps.txt are ready.",
    );
    if (!(await yes("Create the profile now using your unlocked login keyring"))) return;
    if (!(await child("node", cliArgs("setup"), { signal: controller.signal }))) {
      say(
        "Profile setup did not finish. Check the keyring and next-steps.txt; do not reset or delete profile state.",
      );
      return;
    }
    if (!(await yes("Open Google sign-in in your desktop browser now"))) return;
    if (
      !(await child("node", [...cliArgs("login"), "--login-config", login], {
        inherit: true,
        signal: controller.signal,
      }))
    ) {
      say(
        "Login did not finish. Follow the bundled recovery guide; no automatic retry or credential reset was performed.",
      );
      return;
    }
    if (!(await yes("Register or replace Hermes's gymtracka entry now (back up config first)")))
      return;
    const hermesHome = absolute(process.env.HERMES_HOME || path.join(os.homedir(), ".hermes"));
    ancestors(hermesHome);
    const hermesConfig = path.join(hermesHome, "config.yaml");
    if (exists(hermesConfig)) {
      const stat = fs.lstatSync(hermesConfig);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.uid !== process.getuid() ||
        stat.nlink !== 1
      )
        refuse(
          "Hermes configuration is unsafe to back up. Use the prepared YAML snippet manually.",
        );
      privateFile(path.join(configDir, "hermes-config.backup.yaml"), fs.readFileSync(hermesConfig));
    }
    say(
      "Hermes will handle its own prompts. Keep existing server entries; use a fresh name if needed.",
    );
    prompts.close();
    if (!(await child("hermes", addArgs, { inherit: true, signal: controller.signal }))) {
      say(
        "Hermes registration did not finish. The private YAML snippet and next-steps.txt remain available.",
      );
      return;
    }
    say("Hermes registration command completed. Run /reload-mcp in Hermes, then request a read.");
  } finally {
    prompts.close();
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length === 3 && process.argv[2] === "--help") {
    process.stdout.write(
      "Usage: node install.mjs [--update]\nInteractive fresh install or compatible application update using installed Node24+ and npm; no global packages.\n",
    );
  } else if (
    process.argv.length !== 2 &&
    !(process.argv.length === 3 && process.argv[2] === "--update")
  ) {
    process.stderr.write("Usage: node install.mjs [--update]\n");
    process.exitCode = 2;
  } else {
    install({ update: process.argv[2] === "--update" }).catch((error) => {
      process.stderr.write(
        (error instanceof InstallError
          ? error.message
          : "Installation/update could not finish. Preserve any sibling .update directory and follow bundled recovery instructions; external profiles were not replaced.") +
          "\n",
      );
      process.exitCode = 1;
    });
  }
}

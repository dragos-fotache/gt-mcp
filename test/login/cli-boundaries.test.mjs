import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CLI, runCli } from "./cli-helpers.mjs";
import { main } from "../../dist/cli/main.js";
import { launchBrowser } from "../../dist/cli/launcher.js";

describe("T07-S3 strict inert CLI and fixed launcher boundaries", () => {
  let desktop;
  beforeEach(() => {
    desktop = [process.env.DISPLAY, process.env.WAYLAND_DISPLAY];
    delete process.env.DISPLAY;
    delete process.env.WAYLAND_DISPLAY;
  });
  afterEach(() => {
    for (const [i, name] of ["DISPLAY", "WAYLAND_DISPLAY"].entries()) {
      if (desktop[i] === undefined) delete process.env[name];
      else process.env[name] = desktop[i];
    }
  });
  it("imports main without running it or registering global signal hooks", () => {
    const script = `const before = ['SIGINT', 'SIGTERM'].map(s => process.listenerCount(s));
      const m = await import(${JSON.stringify(pathToFileURL(CLI).href)});
      if (typeof m.main !== 'function' || before.some((n,i) => n !== process.listenerCount(['SIGINT','SIGTERM'][i]))) throw new Error('import side effect');`;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      timeout: 10000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("standalone help exits zero with fixed usage only on stderr", async () => {
    const first = await runCli(["--help"]);
    const second = await runCli(["--help"]);
    expect(first).toEqual(second);
    expect(first.code).toBe(0);
    expect(first.stdout).toBe("");
    expect(first.stderr).toMatch(/Usage:/);
  });

  it.each(
    [
      [],
      ["login"],
      ["setup", "--config", "relative.json"],
      ["setup", "--config", "/synthetic/../private.json"],
      ["setup", "--config", "/synthetic/private\u0085.json"],
      ["setup", "--config", "/synthetic/config.json", "--config", "/synthetic/other.json"],
      [
        "login",
        "--config",
        "/synthetic/config.json",
        "--login-config",
        "/synthetic/login.json",
        "--resume",
        "--cancel",
      ],
      ["recover", "--config", "/synthetic/config.json", "--resume"],
      ["setup", "--config", "/synthetic/config.json", "--browser", "synthetic"],
      ["--help", "setup"],
    ].map((args) => ({ args })),
  )("rejects malformed argv before launcher or signal ownership: $args", async ({ args }) => {
    const before = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")];
    let output = "";
    let launches = 0;
    const code = await main(
      args,
      {
        stderr: (text) => {
          output += text;
        },
      },
      async () => {
        launches += 1;
      },
    );
    expect(code).toBe(2);
    expect(launches).toBe(0);
    expect(output).toMatch(/Usage:/);
    expect(output).not.toContain("/synthetic");
    expect([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")]).toEqual(before);
  });

  it("rejects missing config safely through the actual compiled executable", async () => {
    const result = await runCli(["recover", "--config", "/synthetic-missing-t07/config.json"]);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("/synthetic");
    expect(result.stderr).not.toContain("ENOENT");
  });

  it("a failed diagnostic sink neither throws a native error nor falls back to stdout", async () => {
    const before = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")];
    for (const args of [
      ["--help"],
      ["recover", "--config", "/synthetic-missing-t07/config.json"],
    ]) {
      await expect(
        main(args, {
          async stderr() {
            throw new Error("synthetic-private-error");
          },
        }),
      ).resolves.toBeTypeOf("number");
      expect([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")]).toEqual(before);
    }
    const script = `const { main } = await import(${JSON.stringify(pathToFileURL(CLI).href)});
      process.exitCode = await main(['recover','--config','/synthetic-missing-t07/config.json'],
      { async stderr() { throw new Error('synthetic-private-error'); } });`;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      timeout: 10000,
    });
    expect(result.status).toBeTypeOf("number");
    expect(result.signal).toBeNull();
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it.each([
    "http://127.0.0.1:43219/",
    "http://localhost:43219/?credential=synthetic",
    "http://localhost:43219/#synthetic",
    "http://localhost:43219/credential",
    "http://synthetic@localhost:43219/",
    "https://localhost:43219/",
  ])("fixed launcher refuses unsafe URL before invoking a browser: %s", async (url) => {
    await expect(launchBrowser(url, new globalThis.AbortController().signal)).rejects.toMatchObject(
      { code: "invalid_arguments" },
    );
  });

  it("fixed launcher refuses a canonical URL when desktop facilities are absent", async () => {
    await expect(
      launchBrowser("http://localhost:43219/", new globalThis.AbortController().signal),
    ).rejects.toMatchObject({ code: "sign_in_failed" });
  });
});

// Shared cross-project gate: delivered MCP -> real backend -> Android ordinary
// pull/Room projection. Dynamic IDs come from captured submission, checked by DB;
// independent literal order/default/null/zero expectations remain explicit.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";
import { check, fixture, processSession } from "./helpers.mjs";

describe("T16-S7 actual Android ordinary sync", () => {
  it("observes the exact MCP saved graph after an established Android baseline", async () => {
    const snapshot = process.env.GT_T16_ANDROID_SNAPSHOT;
    const serial = process.env.GT_T16_ANDROID_SERIAL;
    check(snapshot && /^emulator-\d+$/.test(serial ?? ""), "Owned Android wrapper required");
    check(process.env.ANDROID_SERIAL === serial, "Android execution serial changed");
    const packageName = "com.dragosfotache.gymtracka";
    async function adb(args, input) {
      // The TLS relay lives in this event loop. A synchronous ADB command can
      // starve an actual Android request until its transport deadline expires.
      const result = await new Promise((resolve) => {
        const command = execFile(
          "adb",
          ["-s", serial, ...args],
          {
            encoding: "utf8",
            timeout: 15000,
          },
          (error, stdout, stderr) => resolve({ error, stdout, stderr }),
        );
        command.stdin.on("error", () => {
          /* The completion callback reports command failure. */
        });
        command.stdin.end(input);
      });
      if (!result.error) return result.stdout;
      // Raw subprocess failures can include private tee output. Surface fixed
      // classifications only, never the raw exception or its cause.
      const kind = ["not debuggable", "unknown package", "No such file", "Permission denied"].find(
        (item) => result.stderr.includes(item),
      );
      throw new Error(`Owned Android fixture command failed (${kind ?? "command-or-timeout"})`);
    }
    async function privateFile(name, value) {
      await adb(
        ["shell", "-T", "run-as", packageName, "tee", `files/${name}.tmp`],
        JSON.stringify(value),
      );
      await adb(["shell", "run-as", packageName, "chmod", "600", `files/${name}.tmp`]);
      await adb(["shell", "run-as", packageName, "mv", `files/${name}.tmp`, `files/${name}`]);
    }
    const f = await fixture({ customCount: 2 });
    let session, child, closed;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t16-s7-native-"));
    fs.chmodSync(dir, 0o700);
    const output = path.join(dir, "native.json");
    const port = new URL(f.origin).port;
    try {
      await adb(["reverse", `tcp:${port}`, `tcp:${port}`]);
      await adb(["shell", "run-as", packageName, "mkdir", "-p", "files"]);
      // Android is a separate client, not a second owner of MCP's dedicated
      // rotating session. Real same-account refresh creates an independent family.
      const androidGrant = await f.newSession();
      check(
        androidGrant.account.id === f.grant.account.id &&
          androidGrant.accessToken !== f.grant.accessToken,
        "Android did not receive a separate same-account service session",
      );
      const setup = {
        port: Number(port),
        certificate: new X509Certificate(
          fs.readFileSync(process.env.GT_S1_FIXTURE_CERT_FILE),
        ).raw.toString("base64"),
        accountId: androidGrant.account.id,
        accessToken: androidGrant.accessToken,
      };
      child = spawn(
        "python3",
        ["test/backend-interoperability/instrument-android.py", snapshot, output],
        {
          env: process.env,
          stdio: "ignore",
        },
      );
      closed = new Promise((resolve) => {
        child.once("error", () => resolve(-1));
        child.once("close", resolve);
      });
      const deadline = Date.now() + 180000;
      let setupSent = false;
      for (;;) {
        check(
          child.exitCode === null && Date.now() < deadline,
          "Android did not establish its baseline",
        );
        try {
          if (
            !setupSent &&
            (await adb(["exec-out", "run-as", packageName, "cat", "files/t16-started"])).trim() ===
              "started"
          ) {
            await privateFile("t16-setup.json", setup);
            setupSent = true;
          }
          if (
            (await adb(["exec-out", "run-as", packageName, "cat", "files/t16-ready"])).trim() ===
            "ready"
          )
            break;
        } catch {
          // A missing handoff marker is expected until native setup completes.
        }
        await delay(300);
      }
      session = await processSession(f.configPath);
      const intent = f.intent();
      intent.name = " T16 Android ordinary sync ";
      intent.exercises[1].exerciseId = f.customs[1];
      const result = (await session.client.callTool({ name: "create_routine", arguments: intent }))
        .structuredContent;
      check(result.ok && result.data.status === "saved", "MCP did not confirm saved creation");
      const observed = f.observe(result.data.routineId);
      const submitted = JSON.parse(f.mutations.find((item) => item.method === "PUT").body);
      check(
        observed.roots === 1 &&
          observed.entries === 3 &&
          observed.sets === 3 &&
          observed.revision === 3 &&
          observed.replays === 3 &&
          observed.batches === 3 &&
          observed.draft === false &&
          observed.name === intent.name &&
          isDeepStrictEqual(observed.children, submitted.exercises),
        "Independent database/submission graph differs from the creation contract",
      );
      check(
        submitted.exercises.every(
          (entry, index) =>
            entry.position === index && entry.exerciseId === intent.exercises[index].exerciseId,
        ),
        "Submitted reference/order changed",
      );
      check(
        isDeepStrictEqual(
          submitted.exercises.map((entry) => entry.sets.length),
          [2, 1, 0],
        ),
        "Submitted set counts changed",
      );
      check(
        isDeepStrictEqual(
          submitted.exercises[0].sets.map(({ repetitions, weightKg }) => [repetitions, weightKg]),
          [
            [null, null],
            [0, 0],
          ],
        ),
        "Submitted null/zero defaults changed",
      );
      await privateFile("t16-expected.json", submitted);
      check((await closed) === 0, "Android ordinary-sync native check failed");
      const native = JSON.parse(fs.readFileSync(output));
      check(
        native.status === "PASS" && native.cases.length === 1,
        "Native execution evidence missing",
      );
      check(
        isDeepStrictEqual(f.observe(result.data.routineId), observed),
        "Android sync changed backend creation effects",
      );
      check(
        !f.requests.some((request) => request.route === "/v1/sync/push"),
        "Read-only Android sync sent domain mutations",
      );
      fs.writeFileSync(process.env.GT_T16_ANDROID_RESULT, JSON.stringify(native, null, 2) + "\n");
    } finally {
      await session?.close();
      if (child && child.exitCode === null) {
        child.kill("SIGTERM");
        await closed;
      }
      // Preserve sanitized failure/native counts, never raw fixture or logs.
      if (fs.existsSync(output)) fs.copyFileSync(output, process.env.GT_T16_ANDROID_RESULT);
      // Native finally deletes its inputs. Gradle independently uninstalls the
      // target; do not race that teardown with post-run ADB. The owning wrapper
      // verifies emulator exit/detachment and erases all storage/reverse mappings.
      await f.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 360000);
});

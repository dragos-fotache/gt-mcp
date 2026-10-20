/* global AbortController */
// Real private Secret Service + real filesystem IO. S1, not legacy storage, is the oracle.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import * as storage from "../../../dist/storage/credential/index.js";
import { launch } from "../../../dist/storage/credential/client.js";
import { acquireProfile } from "../../../dist/storage/credential/acquire.js";
import {
  busctlLock,
  secretToolStoreDuplicate,
  secretToolClearDuplicate,
} from "../t04/provider-helpers.mjs";
import { MAX_RECORD_BYTES } from "../../../dist/storage/credential/format.js";
import { QA_ORIGIN, QA_ORIGIN_OTHER, ACCOUNT_A, ACCOUNT_B } from "../../unit/t04/helpers.mjs";
const worker = fileURLToPath(new URL("./worker.mjs", import.meta.url));
const data = (value) => Buffer.from(value);
const contents = (session) =>
  session.readVaultBytes().then((value) => Buffer.from(value).toString());
function provider(args, input) {
  const result = spawnSync("secret-tool", args, {
    input,
    env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: process.env.GT_S3_TEST_BUS },
    timeout: 5000,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  return result;
}
async function fixture(run, { provision = true, diagnostic = false } = {}) {
  if (
    process.env.GT_S3_ISOLATION_CONFIRMED !== "t08-s3-isolated" ||
    !process.env.T04_PROVIDER_PARENT ||
    !process.env.GT_S3_TEST_BUS
  )
    throw new Error("Private provider/root qualification required");
  const base = fs.mkdtempSync(path.join(process.env.T04_PROVIDER_PARENT, "t21-credential-"));
  fs.chmodSync(base, 0o700);
  const request = {
    profileRoot: path.join(base, "profile"),
    secretServiceBusAddress: process.env.GT_S3_TEST_BUS,
    origin: QA_ORIGIN,
    timeoutMs: 10000,
  };
  const sessions = [];
  const track = (session) => {
    sessions.push(session);
    return session;
  };
  const control = path.join(base, "fault.json");
  process.env.T21_TEST_CONTROL = control;
  const open = async (changed = {}) =>
    track(
      await (diagnostic
        ? launch({ ...request, ...changed }, "open", worker)
        : storage.openProfile({ ...request, ...changed })),
    );
  const arm = (point, action = "throw") =>
    fs.writeFileSync(control, JSON.stringify({ point, action }), { mode: 0o600 });
  try {
    const session = provision
      ? track(
          await (diagnostic
            ? launch(request, "provision", worker)
            : storage.provisionProfile(request)),
        )
      : null;
    await run({
      request,
      session,
      open,
      track,
      arm,
      base,
      record: path.join(request.profileRoot, "credentials.enc"),
    });
  } finally {
    for (const session of sessions) await session.close();
    delete process.env.T21_TEST_CONTROL;
    fs.rmSync(base, { recursive: true });
  }
}

describe("T21 credential store with a real isolated provider", () => {
  it("sets up, serializes captured updates, atomically binds/advances and reopens without a descriptor", async () =>
    fixture(async ({ request, session, open, record }) => {
      expect(session.binding).toMatchObject({
        origin: QA_ORIGIN,
        accountUuid: null,
        sessionGeneration: 0,
      });
      expect(Object.isFrozen(session.binding)).toBe(true);
      expect(await contents(session)).toBe("");
      const first = data("synthetic-first");
      const pending = session.commit({ vaultBytes: first });
      first.fill(0);
      await pending;
      expect(await contents(session)).toBe("synthetic-first");
      await Promise.all([
        session.commit({ vaultBytes: data("a") }),
        session.commit({ vaultBytes: data("b") }),
      ]);
      expect(await contents(session)).toBe("b");
      const initial = session.binding;
      const bound = await session.bindAccount(ACCOUNT_A, data("synthetic-bound"));
      expect(bound).toEqual({ ...initial, accountUuid: ACCOUNT_A, sessionGeneration: 1 });
      expect(session.binding).toEqual(bound);
      expect(await contents(session)).toBe("synthetic-bound");
      await session.bindAccount(ACCOUNT_A, data("synthetic-same-account"));
      expect(session.binding.sessionGeneration).toBe(1);
      await expect(session.bindAccount(ACCOUNT_B, data("foreign"))).rejects.toMatchObject({
        code: "binding_mismatch",
      });
      const next = await session.advanceSessionGeneration(data("synthetic-generation2"));
      expect(next.sessionGeneration).toBe(2);
      expect(await contents(session)).toBe("synthetic-generation2");
      expect(fs.readdirSync(request.profileRoot).sort()).toEqual(["credentials.enc", "owner.lock"]);
      expect(fs.statSync(request.profileRoot).mode & 0o777).toBe(0o700);
      for (const name of ["credentials.enc", "owner.lock"])
        expect(fs.statSync(path.join(request.profileRoot, name)).mode & 0o777).toBe(0o600);
      const text = fs.readFileSync(record, "utf8");
      expect(text).not.toContain(ACCOUNT_A);
      expect(text).not.toContain("synthetic-generation2");
      await session.close();
      const reopened = await open();
      expect(reopened.binding).toEqual(next);
      expect(await contents(reopened)).toBe("synthetic-generation2");
    }));

  it("rejects malformed updates and vault overflow before mutation; no getter execution", async () =>
    fixture(async ({ session, record }) => {
      const before = fs.readFileSync(record);
      let getterCalled = false;
      const bad = {
        get vaultBytes() {
          getterCalled = true;
          return data("forbidden");
        },
      };
      await expect(session.commit(bad)).rejects.toMatchObject({ code: "invalid_argument" });
      await expect(
        session.commit({ vaultBytes: data("forbidden"), operationBytes: data("retired") }),
      ).rejects.toMatchObject({ code: "invalid_argument" });
      await expect(
        session.commit({ vaultBytes: new Uint8Array(storage.MAX_STORE_BYTES + 1) }),
      ).rejects.toMatchObject({ code: "resource_exhausted" });
      await expect(session.advanceSessionGeneration(data("forbidden"))).rejects.toMatchObject({
        code: "binding_mismatch",
      });
      expect(getterCalled).toBe(false);
      expect(fs.readFileSync(record)).toEqual(before);
    }));

  it("refuses a second owner, including while a removed profile still holds its lock inode", async () =>
    fixture(async ({ request, session, open }) => {
      const lock = path.join(request.profileRoot, "owner.lock");
      const inode = fs.statSync(lock).ino;
      await expect(open()).rejects.toMatchObject({ code: "locked_by_other_owner" });
      await session.removeProfile();
      expect(fs.statSync(lock).ino).toBe(inode);
      await expect(open()).rejects.toMatchObject({ code: "locked_by_other_owner" });
      await expect(session.readVaultBytes()).rejects.toMatchObject({ code: "commit_ambiguous" });
      await session.close();
      await expect(storage.removeProfile(request)).resolves.toBeUndefined();
      await expect(open()).rejects.toMatchObject({ code: "store_missing" });
      await expect(storage.provisionProfile(request)).rejects.toMatchObject({
        code: "already_provisioned",
      });
    }));

  it("acquisition waits for release, opens fresh committed state and transfers ownership", async () =>
    fixture(async ({ request, session, track }) => {
      const controller = new AbortController();
      let settled = false;
      const selected = { ...request };
      const pending = acquireProfile(selected, { signal: controller.signal });
      selected.origin = QA_ORIGIN_OTHER;
      void pending.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        },
      );
      try {
        await delay(100);
        expect(settled).toBe(false);
        await session.bindAccount(ACCOUNT_A, data("synthetic-latest-while-waiting"));
        await session.close();
        const acquired = track(await pending);
        expect(acquired.binding).toEqual(session.binding);
        expect(await contents(acquired)).toBe("synthetic-latest-while-waiting");
        // Once delivered, the acquisition signal cannot revoke this owner.
        controller.abort("synthetic-private-reason");
        await acquired.commit({ vaultBytes: data("synthetic-after-delivery") });
        expect(await contents(acquired)).toBe("synthetic-after-delivery");
      } finally {
        controller.abort();
        await pending.then(
          (acquired) => acquired.close(),
          () => {},
        );
      }
    }));

  it.each(["interrupted", "timed_out"])(
    "acquisition %s during contention leaves no late owner",
    async (code) =>
      fixture(async ({ request, session, open, record }) => {
        const controller = new AbortController();
        const before = fs.readFileSync(record);
        const pending = acquireProfile(request, {
          signal: controller.signal,
          waitMs: code === "timed_out" ? 150 : 5000,
        });
        const rejected = expect(pending).rejects.toMatchObject({
          name: "ProfileAcquisitionError",
          code,
        });
        try {
          if (code === "interrupted") {
            await delay(100);
            controller.abort("synthetic-private-reason");
          }
          await rejected;
          expect(fs.readFileSync(record)).toEqual(before);
          expect(await contents(session)).toBe("");
          await session.close();
          await delay(300);
          expect(await contents(await open())).toBe("");
        } finally {
          controller.abort();
          await pending.then(
            (acquired) => acquired.close(),
            () => {},
          );
        }
      }),
  );

  it.each(["interrupted", "timed_out"])(
    "acquisition %s reaps a worker stalled opening the owned private provider",
    async (code) =>
      fixture(async ({ request, session, open }) => {
        const providerPid = Number(process.env.GT_S3_PROVIDER_PID);
        expect(Number.isSafeInteger(providerPid) && providerPid > 1).toBe(true);
        await session.close();
        const controller = new AbortController();
        let pending;
        process.kill(providerPid, "SIGSTOP");
        try {
          pending = acquireProfile(request, {
            signal: controller.signal,
            waitMs: code === "timed_out" ? 1500 : 5000,
          });
          const rejected = expect(pending).rejects.toMatchObject({
            name: "ProfileAcquisitionError",
            code,
          });
          // Observe an actual kernel owner, rather than assuming a timer means
          // the worker reached its read-only provider operation.
          const lock = path.join(request.profileRoot, "owner.lock");
          const lockStatus = () =>
            spawnSync("flock", ["--nonblock", "--conflict-exit-code", "73", lock, "true"], {
              timeout: 1000,
            }).status;
          const until = Date.now() + 1000;
          while (lockStatus() !== 73 && Date.now() < until) await delay(10);
          expect(lockStatus()).toBe(73);
          if (code === "interrupted") controller.abort("synthetic-private-reason");
          await rejected;
          expect(lockStatus()).toBe(0);
        } finally {
          controller.abort();
          process.kill(providerPid, "SIGCONT");
          await pending?.then(
            (acquired) => acquired.close(),
            () => {},
          );
        }
        expect(await contents(await open())).toBe("");
      }),
  );

  it("acquisition does not retry a non-contention binding failure or alter the record", async () =>
    fixture(async ({ request, session, record, open }) => {
      await session.close();
      const before = fs.readFileSync(record);
      await expect(
        acquireProfile(
          { ...request, origin: QA_ORIGIN_OTHER },
          {
            signal: new AbortController().signal,
            waitMs: 5000,
          },
        ),
      ).rejects.toMatchObject({ name: "StorageError", code: "binding_mismatch" });
      expect(fs.readFileSync(record)).toEqual(before);
      expect(await contents(await open())).toBe("");
    }));

  it("refuses existing roots/legacy contents and invalid new request fields without changing them", async () =>
    fixture(
      async ({ request }) => {
        fs.mkdirSync(request.profileRoot, { mode: 0o700 });
        for (const name of [null, "owner.lock", "vault.enc"]) {
          if (name)
            fs.writeFileSync(path.join(request.profileRoot, name), "synthetic-legacy", {
              mode: 0o600,
            });
          const before = fs.readdirSync(request.profileRoot);
          await expect(storage.provisionProfile(request)).rejects.toMatchObject({
            code: "already_provisioned",
          });
          expect(fs.readdirSync(request.profileRoot)).toEqual(before);
        }
        await expect(
          storage.provisionProfile({ ...request, anchorRoot: "/synthetic-unused" }),
        ).rejects.toMatchObject({ code: "invalid_argument" });
        await expect(
          storage.openProfile({ ...request, expectedBinding: {} }),
        ).rejects.toMatchObject({ code: "invalid_argument" });
      },
      { provision: false },
    ));

  it("does not leak/provision/repair foreign, corrupt, oversized or missing records, and ignores temps", async () =>
    fixture(async ({ request, session, open, record }) => {
      await session.commit({ vaultBytes: data("synthetic-protected") });
      await session.close();
      const original = fs.readFileSync(record);
      await expect(open({ origin: QA_ORIGIN_OTHER })).rejects.toMatchObject({
        code: "binding_mismatch",
      });
      expect(fs.readFileSync(record)).toEqual(original);
      const env = JSON.parse(original);
      env.tagBase64 = Buffer.alloc(16).toString("base64");
      fs.writeFileSync(record, JSON.stringify(env));
      await expect(open()).rejects.toMatchObject({ code: "store_corrupt" });
      fs.writeFileSync(record, original);
      fs.truncateSync(record, MAX_RECORD_BYTES + 1);
      await expect(open()).rejects.toMatchObject({ code: "store_corrupt" });
      fs.writeFileSync(
        path.join(request.profileRoot, ".credentials.enc.1.1.abcdef01.tmp"),
        original,
        { mode: 0o600 },
      );
      fs.unlinkSync(record);
      await expect(open()).rejects.toMatchObject({ code: "store_missing" });
      expect(fs.existsSync(record)).toBe(false);
      fs.writeFileSync(record, original, { mode: 0o600 });
      expect(await contents(await open())).toBe("synthetic-protected");
    }));

  it("rejects unsafe file modes, symlinks, hardlinks and unexpected contents before destructive cleanup", async () =>
    fixture(async ({ request, session, open, record, base }) => {
      await session.close();
      const original = fs.readFileSync(record);
      fs.chmodSync(record, 0o644);
      await expect(open()).rejects.toMatchObject({ code: "io_failure" });
      fs.chmodSync(record, 0o600);
      const outside = path.join(base, "outside.enc");
      fs.renameSync(record, outside);
      fs.symlinkSync(outside, record);
      await expect(open()).rejects.toMatchObject({ code: "io_failure" });
      fs.unlinkSync(record);
      fs.linkSync(outside, record);
      await expect(open()).rejects.toMatchObject({ code: "io_failure" });
      fs.unlinkSync(record);
      fs.renameSync(outside, record);
      const unknown = path.join(request.profileRoot, "do-not-delete");
      fs.writeFileSync(unknown, "synthetic-canary", { mode: 0o600 });
      await expect(storage.removeProfile(request)).rejects.toMatchObject({ code: "io_failure" });
      expect(fs.readFileSync(record)).toEqual(original);
      expect(fs.readFileSync(unknown, "utf8")).toBe("synthetic-canary");
      fs.unlinkSync(unknown);
      expect(await contents(await open())).toBe("");
    }));

  it("requires a currently available key, never recreates a missing key and permits explicit keyless cleanup", async () =>
    fixture(async ({ request, session, open, record }) => {
      const id = session.binding.profileGenerationId;
      const original = fs.readFileSync(record);
      expect(provider(["clear", "x-gymtracka-profile", id]).status).toBe(0);
      await expect(session.readVaultBytes()).rejects.toMatchObject({ code: "key_not_found" });
      await session.close();
      await expect(open()).rejects.toMatchObject({ code: "key_not_found" });
      expect(fs.readFileSync(record)).toEqual(original);
      expect(provider(["lookup", "x-gymtracka-profile", id]).status).toBe(1);
      await storage.removeProfile(request);
      expect(fs.readdirSync(request.profileRoot)).toEqual(["owner.lock"]);
    }));

  it("rechecks provider uniqueness on every call without a cached-key fallback", async () =>
    fixture(async ({ session }) => {
      const bus = process.env.GT_S3_TEST_BUS;
      secretToolStoreDuplicate(bus, session.binding.profileGenerationId);
      try {
        await expect(session.readVaultBytes()).rejects.toMatchObject({ code: "key_ambiguous" });
        await expect(session.commit({ vaultBytes: data("forbidden") })).rejects.toMatchObject({
          code: "key_ambiguous",
        });
      } finally {
        secretToolClearDuplicate(bus);
      }
      expect(await contents(session)).toBe("");
    }));

  it("refuses a replaced immutable master key on reads and owned cleanup", async () =>
    fixture(async ({ session, record }) => {
      const before = fs.readFileSync(record);
      const changed = provider(
        [
          "store",
          "--label=synthetic-t21-changed-key",
          "x-gymtracka-profile",
          session.binding.profileGenerationId,
          "x-gymtracka-key-v",
          "1",
          "x-gymtracka-role",
          "master",
        ],
        "K".repeat(32),
      );
      expect(changed.status).toBe(0);
      await expect(session.readVaultBytes()).rejects.toMatchObject({ code: "provider_failure" });
      await expect(session.removeProfile()).rejects.toMatchObject({ code: "provider_failure" });
      expect(fs.readFileSync(record)).toEqual(before);
    }));

  it("authenticates a foreign record before deleting any present key", async () =>
    fixture(async ({ request, session, open, record }) => {
      const original = fs.readFileSync(record);
      await session.close();
      await expect(
        storage.removeProfile({ ...request, origin: QA_ORIGIN_OTHER }),
      ).rejects.toMatchObject({ code: "binding_mismatch" });
      expect(fs.readFileSync(record)).toEqual(original);
      expect(await contents(await open())).toBe("");
    }));

  it.each([
    ["replace.before.rename", "throw", "io_failure", "old"],
    ["replace.after.rename", "throw", "commit_ambiguous", "new"],
    ["replace.before.rename", "kill", "commit_ambiguous", "old"],
    ["replace.after.rename", "kill", "commit_ambiguous", "new"],
  ])("handles %s / %s with truthful state and fencing", async (point, action, code, expected) =>
    fixture(
      async ({ session, open, arm, record }) => {
        await session.commit({ vaultBytes: data("old") });
        const oldBinding = session.binding;
        const oldRecord = fs.readFileSync(record);
        arm(point, action);
        await expect(session.bindAccount(ACCOUNT_A, data("new"))).rejects.toMatchObject({ code });
        expect(session.binding).toEqual(oldBinding);
        if (code === "io_failure") {
          expect(fs.readFileSync(record)).toEqual(oldRecord);
          expect(await contents(session)).toBe("old");
        } else {
          await expect(session.readVaultBytes()).rejects.toMatchObject({
            code: "commit_ambiguous",
          });
          await expect(session.commit({ vaultBytes: data("forbidden") })).rejects.toMatchObject({
            code: "commit_ambiguous",
          });
        }
        await session.close();
        const reopened = await open();
        expect(await contents(reopened)).toBe(expected);
        expect(reopened.binding.accountUuid).toBe(expected === "new" ? ACCOUNT_A : null);
      },
      { diagnostic: true },
    ),
  );

  it("retries explicit removal after process death following key deletion; normal open still fails", async () =>
    fixture(
      async ({ request, session, open, arm, record }) => {
        arm("remove.key.deleted", "kill");
        await expect(session.removeProfile()).rejects.toMatchObject({ code: "commit_ambiguous" });
        await session.close();
        expect(fs.existsSync(record)).toBe(true);
        await expect(open()).rejects.toMatchObject({ code: "key_not_found" });
        await storage.removeProfile(request);
        expect(fs.readdirSync(request.profileRoot)).toEqual(["owner.lock"]);
      },
      { diagnostic: true },
    ));
  it("denies a now-locked real provider (terminal isolated case)", async () =>
    fixture(async ({ session, open }) => {
      busctlLock(process.env.GT_S3_TEST_BUS);
      await expect(session.readVaultBytes()).rejects.toMatchObject({ code: "key_locked" });
      await expect(session.commit({ vaultBytes: data("forbidden") })).rejects.toMatchObject({
        code: "key_locked",
      });
      await session.close();
      await expect(open()).rejects.toMatchObject({ code: "key_locked" });
    }));
});

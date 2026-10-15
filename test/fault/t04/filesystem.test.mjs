// Filesystem posture: mountinfo-identified ext4 for production (tmpfs only
// via diagnostics), restrictive modes/ownership, unsafe-container rejection.
// Approved spec sections 1 and 5. No personal paths; disposable roots only.
import { describe, it, expect } from "vitest";
import {
  chmodSync,
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { provisionProfile } from "../../../dist/storage/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  QA_ORIGIN,
  PGID_A,
  canaryBytes,
  expectCode,
  tempRoot,
  removeRoot,
} from "../../unit/t04/helpers.mjs";
import { makeFifo } from "./helpers.mjs";

// Mirrors the spec's mount identification: decode octal escapes in
// /proc/self/mountinfo and take the longest component-boundary mount match.
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

describe("production filesystem gates as separate fixture prerequisites", () => {
  it("requires a tmpfs fixture parent and denies tmpfs-backed production roots", async () => {
    const root = tempRoot();
    try {
      const match = findMount(root);
      if (match === null || match.fsType !== "tmpfs") {
        throw new Error(
          `blocked: tmpfs-deny test needs a tmpfs fixture parent (found ${match === null ? "none" : match.fsType})`,
        );
      }
      await expectCode(
        provisionProfile({
          profileRoot: join(root, "profile"),
          anchorRoot: join(root, "anchor"),
          origin: QA_ORIGIN,
          profileGenerationId: PGID_A,
          secretServiceBusAddress: "unix:path=/tmp/t04-qa-nonexistent.sock",
        }),
        "unsupported_platform",
      );
    } finally {
      removeRoot(root);
    }
  }, 30000);

  it("requires a verified ext4 fixture parent; production then reaches the key facility", async () => {
    const parent = process.env.T04_PROVIDER_PARENT;
    if (typeof parent !== "string" || parent.length === 0) {
      throw new Error(
        "blocked: ext4-gate test needs relay T04_PROVIDER_PARENT (verified ext4 fixture parent)",
      );
    }
    const match = findMount(parent);
    if (match === null || match.fsType !== "ext4") {
      throw new Error(
        `blocked: relay parent fstype is ${match === null ? "unknown" : match.fsType}, need ext4`,
      );
    }
    const root = join(parent, `t04-qa-fsgate-${Date.now()}-${process.pid}`);
    mkdirSync(root, { recursive: true, mode: 0o700 });
    try {
      // ext4 passes the filesystem gate and reaches the key facility,
      // which is absent here by construction.
      await expectCode(
        provisionProfile({
          profileRoot: join(root, "profile"),
          anchorRoot: join(root, "anchor"),
          origin: QA_ORIGIN,
          profileGenerationId: PGID_A,
          secretServiceBusAddress: "unix:path=/tmp/t04-qa-nonexistent.sock",
        }),
        "key_unavailable",
      );
    } finally {
      removeRoot(root);
    }
  }, 30000);
});

describe("restrictive modes and unsafe containers", () => {
  it("creates 0700 roots and 0600 euid-owned files with nlink 1", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        await session.commit({ vaultBytes: canaryBytes("mode-vault") });
      } finally {
        await session.close();
      }
      const euid =
        typeof process.geteuid === "function"
          ? process.geteuid()
          : statSync(facility.ticket.root).uid;
      for (const dir of [facility.locations.profileRoot, facility.locations.anchorRoot]) {
        const st = statSync(dir);
        expect(st.isDirectory()).toBe(true);
        expect(st.mode & 0o777).toBe(0o700);
        expect(st.uid).toBe(euid);
      }
      for (const file of ["vault.bin", "operations.bin"]) {
        const st = statSync(join(facility.locations.profileRoot, file));
        expect(st.isFile()).toBe(true);
        expect(st.mode & 0o777).toBe(0o600);
        expect(st.uid).toBe(euid);
        expect(st.nlink).toBe(1);
      }
      for (const file of ["owner.lock", "anchor.bin"]) {
        const st = statSync(join(facility.locations.anchorRoot, file));
        expect(st.isFile()).toBe(true);
        expect(st.mode & 0o777).toBe(0o600);
        expect(st.uid).toBe(euid);
        expect(st.nlink).toBe(1);
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("rejects group-readable stores without repair (io_failure)", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      await session.close();
      const vault = join(facility.locations.profileRoot, "vault.bin");
      chmodSync(vault, 0o640);
      await expectCode(
        facility.open({
          origin: QA_ORIGIN,
          accountUuid: null,
          sessionGeneration: 0,
          profileGenerationId: facility.profileGenerationId,
        }),
        "io_failure",
      );
    } finally {
      await facility.cleanup();
    }
  });

  it("rejects symlinked, hardlinked and nonregular stores (io_failure)", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      try {
        await session.commit({ vaultBytes: canaryBytes("link-vault") });
      } finally {
        await session.close();
      }
      const binding = {
        origin: QA_ORIGIN,
        accountUuid: null,
        sessionGeneration: 0,
        profileGenerationId: facility.profileGenerationId,
      };
      const vault = join(facility.locations.profileRoot, "vault.bin");
      const spare = join(tmpdir(), `t04-qa-spare-${Date.now()}-${process.pid}.bin`);
      linkSync(vault, spare);
      try {
        await expectCode(facility.open(binding), "io_failure");
      } finally {
        unlinkSync(spare);
      }
      const ops = join(facility.locations.profileRoot, "operations.bin");
      const realOps = join(facility.locations.profileRoot, "operations.real");
      renameSync(ops, realOps);
      const linkOps = ops;
      symlinkSync(realOps, linkOps);
      try {
        await expectCode(facility.open(binding), "io_failure");
      } finally {
        unlinkSync(linkOps);
        renameSync(realOps, ops);
      }
    } finally {
      await facility.cleanup();
    }
  });

  it("rejects a FIFO in place of a store file (io_failure)", async () => {
    const facility = await createStorageTestFacility();
    try {
      const session = await facility.provision(QA_ORIGIN);
      await session.close();
      const ops = join(facility.locations.profileRoot, "operations.bin");
      const backup = join(facility.locations.profileRoot, "operations.backup");
      renameSync(ops, backup);
      try {
        makeFifo(ops);
        await expectCode(
          facility.open({
            origin: QA_ORIGIN,
            accountUuid: null,
            sessionGeneration: 0,
            profileGenerationId: facility.profileGenerationId,
          }),
          "io_failure",
        );
      } finally {
        unlinkSync(ops);
        renameSync(backup, ops);
      }
    } finally {
      await facility.cleanup();
    }
  });
});

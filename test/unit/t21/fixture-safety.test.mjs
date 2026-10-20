import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  createStorageTestFacility,
  attachStorageTestFacility,
} from "../../../dist/storage/test-facility.js";
import { openProfile } from "../../../dist/storage/index.js";
const origin = "https://storage-qa.example.invalid";
describe("issued diagnostics and production path safety", () => {
  it("rejects forged tickets and refuses to clean a same-path replacement fixture", async () => {
    const f = await createStorageTestFacility(),
      original = f.ticket.root,
      moved = original + "-owned-backup";
    try {
      await expect(
        attachStorageTestFacility({ ...f.ticket, capability: "0".repeat(64) }),
      ).rejects.toMatchObject({ code: "invalid_argument" });
      const attached = await attachStorageTestFacility(f.ticket);
      expect(attached.locations).toEqual(f.locations);
      fs.renameSync(original, moved);
      fs.mkdirSync(original, { mode: 0o700 });
      for (const name of ["facility.json", "synthetic.key", "controls.json"])
        fs.copyFileSync(path.join(moved, name), path.join(original, name));
      await expect(f.cleanup()).rejects.toMatchObject({ code: "invalid_argument" });
      expect(fs.existsSync(path.join(original, "synthetic.key"))).toBe(true);
    } finally {
      if (fs.existsSync(moved)) {
        fs.rmSync(original, { recursive: true });
        fs.renameSync(moved, original);
      }
      await f.cleanup();
    }
  });
  it("production refuses symlinked or permissive profile paths before provider lookup", async () => {
    const f = await createStorageTestFacility();
    let session;
    const moved = f.ticket.root + "-private-profile";
    try {
      session = await f.provision(origin);
      await session.close();
      const request = {
        profileRoot: f.locations.profileRoot,
        origin,
        secretServiceBusAddress: "unix:path=/synthetic-unused-provider.sock",
      };
      fs.chmodSync(f.locations.profileRoot, 0o755);
      await expect(openProfile(request)).rejects.toMatchObject({ code: "io_failure" });
      fs.chmodSync(f.locations.profileRoot, 0o700);
      fs.renameSync(f.locations.profileRoot, moved);
      fs.symlinkSync(moved, f.locations.profileRoot);
      await expect(openProfile(request)).rejects.toMatchObject({ code: "io_failure" });
    } finally {
      await session?.close();
      if (fs.existsSync(moved)) {
        fs.unlinkSync(f.locations.profileRoot);
        fs.renameSync(moved, f.locations.profileRoot);
      }
      await f.cleanup();
    }
  });
});

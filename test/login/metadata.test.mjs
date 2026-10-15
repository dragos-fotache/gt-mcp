import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  stat,
  rm,
  symlink,
  link,
  rename,
  chmod,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { openLoginMetadata } from "../../dist/login/metadata.js";
import { isLoginError } from "../../dist/login/index.js";
import { ACCOUNT, PROFILE, AUTH_KEY, binding, bytes, record } from "./helpers.mjs";

const ORIGIN = "https://synthetic-qa-t07.example.invalid";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "synthetic-qa-t07-metadata-"));
  const parent = join(root, "metadata");
  await mkdir(parent, { mode: 0o700 });
  const configPath = join(parent, "config.json");
  const descriptorPath = join(parent, "binding.json");
  const config = {
    version: 1,
    serviceOrigin: ORIGIN,
    storage: {
      profileRoot: join(root, "profile"),
      anchorRoot: join(root, "anchor"),
      secretServiceBusAddress: `unix:path=${join(root, "synthetic-bus")}`,
    },
    bindingDescriptorPath: descriptorPath,
  };
  await writeFile(configPath, bytes(config), { mode: 0o600, flag: "wx" });
  return {
    root,
    parent,
    config,
    configPath,
    descriptorPath,
    pendingPath: `${descriptorPath}.pending`,
    close: () => rm(root, { recursive: true, force: true }),
  };
}

function receipt(from, to) {
  return {
    version: 1,
    kind: from === null ? "provision" : "install",
    transitionId: AUTH_KEY,
    from,
    to,
  };
}

async function safeRejected(promise) {
  const error = await promise.catch((value) => value);
  expect(isLoginError(error)).toBe(true);
  if (Object.hasOwn(error, "stack")) {
    expect(error.stack).toBe(`LoginError: Login failure: ${error.code}.`);
  }
  expect(JSON.stringify(error)).not.toMatch(/synthetic-qa|profileRoot|refreshToken|idToken/);
}

describe("T07-S1 protected binding publication metadata", () => {
  it("creates a private exclusive receipt, publishes descriptor, then durably removes receipt", async () => {
    const selected = await fixture();
    try {
      const metadata = await openLoginMetadata(selected.configPath);
      expect(await metadata.readDescriptor()).toBeNull();
      expect(await metadata.readReceipt()).toBeNull();
      const target = binding(ORIGIN);
      const prepared = receipt(null, target);
      await metadata.prepareReceipt(prepared);
      expect(record(await readFile(selected.pendingPath))).toEqual(prepared);
      expect((await stat(selected.pendingPath)).mode & 0o777).toBe(0o600);
      await metadata.publishDescriptor(null, target);
      expect(record(await readFile(selected.descriptorPath))).toEqual({
        version: 1,
        binding: target,
      });
      expect((await stat(selected.descriptorPath)).mode & 0o777).toBe(0o600);
      await metadata.removeReceipt(prepared);
      expect(await metadata.readReceipt()).toBeNull();
      const reopened = await openLoginMetadata(selected.configPath);
      expect(await reopened.readDescriptor()).toEqual(target);
    } finally {
      await selected.close();
    }
  });

  it("refuses duplicate preparation and a wrong descriptor expectation without overwriting metadata", async () => {
    const selected = await fixture();
    try {
      const source = binding(ORIGIN);
      await writeFile(selected.descriptorPath, bytes({ version: 1, binding: source }), {
        mode: 0o600,
        flag: "wx",
      });
      const metadata = await openLoginMetadata(selected.configPath);
      const target = binding(ORIGIN, ACCOUNT, 1);
      const prepared = receipt(source, target);
      await metadata.prepareReceipt(prepared);
      const before = await readFile(selected.pendingPath);
      await safeRejected(metadata.prepareReceipt({ ...prepared, transitionId: PROFILE }));
      expect(await readFile(selected.pendingPath)).toEqual(before);
      const reopened = await openLoginMetadata(selected.configPath);
      await safeRejected(reopened.publishDescriptor(target, target));
      expect(record(await readFile(selected.descriptorPath)).binding).toEqual(source);
      expect(await readFile(selected.pendingPath)).toEqual(before);
    } finally {
      await selected.close();
    }
  });

  it("confirms an already published target before clearing the receipt", async () => {
    const selected = await fixture();
    try {
      const source = binding(ORIGIN);
      const target = binding(ORIGIN, ACCOUNT, 1);
      await writeFile(selected.descriptorPath, bytes({ version: 1, binding: source }), {
        mode: 0o600,
        flag: "wx",
      });
      const metadata = await openLoginMetadata(selected.configPath);
      const prepared = receipt(source, target);
      await metadata.prepareReceipt(prepared);
      await metadata.publishDescriptor(source, target);
      const reopened = await openLoginMetadata(selected.configPath);
      await reopened.publishDescriptor(target, target);
      await reopened.removeReceipt(prepared);
      expect(await reopened.readDescriptor()).toEqual(target);
      expect(await reopened.readReceipt()).toBeNull();
    } finally {
      await selected.close();
    }
  });

  it("confirms the unchanged source after an acknowledged abandoned transition", async () => {
    const selected = await fixture();
    try {
      const source = binding(ORIGIN);
      const target = binding(ORIGIN, ACCOUNT, 1);
      await writeFile(selected.descriptorPath, bytes({ version: 1, binding: source }), {
        mode: 0o600,
        flag: "wx",
      });
      const metadata = await openLoginMetadata(selected.configPath);
      const prepared = receipt(source, target);
      await metadata.prepareReceipt(prepared);
      const reopened = await openLoginMetadata(selected.configPath);
      await reopened.publishDescriptor(source, source);
      await reopened.removeReceipt(prepared);
      expect(await reopened.readDescriptor()).toEqual(source);
      expect(await reopened.readReceipt()).toBeNull();
    } finally {
      await selected.close();
    }
  });

  it("rejects links for existing private metadata instead of following them", async () => {
    for (const kind of ["symlink", "hardlink"]) {
      const selected = await fixture();
      try {
        const donor = join(selected.parent, "donor.json");
        const original = bytes({ version: 1, binding: binding(ORIGIN) });
        await writeFile(donor, original, { mode: 0o600, flag: "wx" });
        if (kind === "symlink") await symlink(donor, selected.descriptorPath);
        else await link(donor, selected.descriptorPath);
        await safeRejected(openLoginMetadata(selected.configPath));
        expect(await readFile(donor)).toEqual(original);
      } finally {
        await selected.close();
      }
    }
  });

  it("detects descriptor identity replacement between read and publish", async () => {
    const selected = await fixture();
    try {
      const source = binding(ORIGIN);
      const target = binding(ORIGIN, ACCOUNT, 1);
      const original = bytes({ version: 1, binding: source });
      await writeFile(selected.descriptorPath, original, { mode: 0o600, flag: "wx" });
      const metadata = await openLoginMetadata(selected.configPath);
      await metadata.readDescriptor();
      const prepared = receipt(source, target);
      await metadata.prepareReceipt(prepared);
      const replacement = join(selected.parent, "replacement.json");
      await writeFile(replacement, original, { mode: 0o600, flag: "wx" });
      await rename(replacement, selected.descriptorPath);
      await safeRejected(metadata.publishDescriptor(source, target));
      expect(await readFile(selected.descriptorPath)).toEqual(original);
      expect(record(await readFile(selected.pendingPath))).toEqual(prepared);
    } finally {
      await selected.close();
    }
  });

  it("fails closed on duplicate keys, oversized receipt and foreign transition candidates", async () => {
    const source = binding(ORIGIN);
    const target = binding(ORIGIN, ACCOUNT, 1);
    for (const content of [
      bytes(
        receipt(source, { ...target, profileGenerationId: "79999999-9999-4999-8999-999999999999" }),
      ),
      bytes(receipt(source, { ...target, sessionGeneration: 2 })),
      bytes(receipt(null, target)),
      Buffer.from(
        JSON.stringify(receipt(source, target)).replace('"version":1', '"version":1,"version":1'),
      ),
      Buffer.from(" ".repeat(4097)),
    ]) {
      const selected = await fixture();
      try {
        await writeFile(selected.descriptorPath, bytes({ version: 1, binding: source }), {
          mode: 0o600,
          flag: "wx",
        });
        await writeFile(selected.pendingPath, content, { mode: 0o600, flag: "wx" });
        await safeRejected(
          openLoginMetadata(selected.configPath).then((metadata) => metadata.readReceipt()),
        );
        expect(await readFile(selected.pendingPath)).toEqual(content);
      } finally {
        await selected.close();
      }
    }
  });

  it("requires private metadata files and a private descriptor parent", async () => {
    for (const unsafe of ["file", "parent"]) {
      const selected = await fixture();
      try {
        await writeFile(selected.descriptorPath, bytes({ version: 1, binding: binding(ORIGIN) }), {
          mode: 0o600,
          flag: "wx",
        });
        await chmod(
          unsafe === "file" ? selected.descriptorPath : selected.parent,
          unsafe === "file" ? 0o644 : 0o755,
        );
        await safeRejected(openLoginMetadata(selected.configPath));
      } finally {
        await selected.close();
      }
    }
  });
});

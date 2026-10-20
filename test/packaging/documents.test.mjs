// T18-S2 document oracles come from accepted schemas/specs, not runtime implementation text.
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { validateConfigRecord } from "../../dist/runtime/config.js";
import { validateSettings } from "../../dist/login/records.js";
import { createArtifactFixture, readJson, run } from "./helpers.mjs";

let fixture;
let texts;
beforeAll(() => {
  fixture = createArtifactFixture();
  const destination = path.join(fixture.root, "documents");
  fs.mkdirSync(destination);
  run("tar", ["-xzf", fixture.archive, "-C", destination, "--no-same-owner"], { env: fixture.env });
  fixture.app = path.join(destination, "package");
  texts = Object.fromEntries(
    [
      "README.md",
      "docs/installation.md",
      "docs/login.md",
      "docs/stdio-server.md",
      "docs/recovery.md",
    ].map((name) => [name, fs.readFileSync(path.join(fixture.app, name), "utf8")]),
  );
}, 60000);
afterAll(() => fixture?.cleanup());

it("ships the complete standalone guide/link closure with installed entry commands and one supported install route", () => {
  for (const [name, text] of Object.entries(texts)) {
    // Only these five shipped documents are inspected; no general-purpose crawler.
    for (const [, target] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^[a-z]+:/i.test(target)) continue;
      const [relative, fragment] = target.split("#");
      const resolved = relative
        ? path.posix.normalize(path.posix.join(path.posix.dirname(name), relative))
        : name;
      expect(resolved).not.toMatch(/^(?:\.\.\/|\/)/);
      expect(fs.existsSync(path.join(fixture.app, resolved))).toBe(true);
      if (fragment) {
        const content = fs.readFileSync(path.join(fixture.app, resolved), "utf8");
        const headings = [...content.matchAll(/^#{1,6} (.+)$/gm)].map(([, title]) =>
          title
            .toLowerCase()
            .replace(/[^\w -]/g, "")
            .replace(/ /g, "-"),
        );
        expect(headings).toContain(fragment);
      }
    }
    expect(text).not.toMatch(/\]\((?:decisions|evidence|tasks|\.\.\/shared-docs)\//);
    expect(text).not.toMatch(/npm run build/);
  }
  expect(texts["docs/installation.md"]).toMatch(
    /npm(?:\s+--prefix\s+"[^"\n]+")?\s+ci --omit=dev --ignore-scripts/,
  );
  expect(texts["docs/installation.md"].replace(/\s+/g, " ")).toContain(
    "sole supported install route",
  );
  expect(texts["docs/login.md"]).toContain(
    'node "<absolute application directory>/dist/cli/main.js" --help',
  );
  expect(texts["docs/stdio-server.md"]).toContain(
    'node "<absolute application directory>/dist/protocol/server.js"',
  );
});

it("keeps packaged and inline templates strict, nonsecret and disabled using synthetic schema substitution only", () => {
  const server = readJson(path.join(fixture.app, "examples/config.template.json"));
  const login = readJson(path.join(fixture.app, "examples/login.template.json"));
  const inline = [...texts["docs/login.md"].matchAll(/```json\n([\s\S]*?)\n```/g)].map(([, json]) =>
    JSON.parse(json),
  );
  expect(inline).toHaveLength(2);
  const substitute = (record) => {
    if (Object.hasOwn(record, "serviceOrigin"))
      return {
        ...record,
        serviceOrigin: "https://synthetic-documentation.invalid",
        storage: {
          ...record.storage,
          profileRoot: "/synthetic-documentation/profile",
          secretServiceBusAddress: "unix:path=/synthetic-documentation/bus",
        },
      };
    return {
      ...record,
      googleWebClientId: "synthetic-documentation-client.invalid",
      browserOrigin: "http://localhost:43219",
    };
  };
  for (const record of [server, ...inline.filter((r) => Object.hasOwn(r, "serviceOrigin"))]) {
    expect(record.version).toBe(2);
    expect(record.storage).not.toHaveProperty("anchorRoot");
    expect(record).not.toHaveProperty("bindingDescriptorPath");
    expect(record.writesEnabled).toBe(false);
    expect(record.serviceOrigin).toMatch(/^<[^>]+>$/);
    expect(validateConfigRecord(substitute(record)).writesEnabled).toBe(false);
    const omitted = substitute(record);
    delete omitted.writesEnabled;
    expect(validateConfigRecord(omitted).writesEnabled).toBe(false);
    expect(() => validateConfigRecord({ ...omitted, writesEnabled: "true" })).toThrow();
  }
  for (const record of [login, ...inline.filter((r) => Object.hasOwn(r, "googleWebClientId"))]) {
    expect(record.googleWebClientId).toMatch(/^<[^>]+>$/);
    expect(record.browserOrigin).toBe("http://localhost:<registered fixed port>");
    expect(validateSettings(substitute(record)).version).toBe(1);
  }
  for (const text of Object.values(texts))
    for (const [, json] of text.matchAll(/```json\n([\s\S]*?)\n```/g))
      expect(JSON.parse(json).writesEnabled).not.toBe(true);
});

it("documents approved budget defaults/ranges and the essential recovery/privacy boundaries", () => {
  const table = (text) =>
    Object.fromEntries(
      [...text.matchAll(/^\|\s*(\w+(?:\.\w+)?)\s*\|\s*(\d+)\s*\|\s*(\d+)\.\.(\d+)\s*\|/gm)].map(
        ([, field, value, min, max]) => [field, [Number(value), Number(min), Number(max)]],
      ),
    );
  // Approved transport-budget contract; independent of the operator guide under test.
  const expected = {
    maxRequestBytes: [262144, 64, 16777216],
    maxRequestTargetBytes: [4096, 64, 65536],
    maxResponseBytes: [1048576, 64, 16777216],
    maxProjectedResultBytes: [1048576, 64, 16777216],
    maxHeadBytes: [32768, 4096, 131072],
    maxHeaderCount: [100, 10, 1000],
    perAttemptTimeoutMs: [10000, 50, 120000],
    totalDeadlineMs: [60000, 100, 600000],
    maxAttempts: [3, 1, 5],
    baseRetryDelayMs: [500, 0, 10000],
    maxRetryDelayMs: [5000, 0, 60000],
  };
  expect(Object.keys(expected)).toHaveLength(11);
  expect(table(texts["docs/stdio-server.md"])).toEqual({
    ...expected,
    "storage.timeoutMs": [5000, 1, 15000],
    "protocol.maxToolResultBytes": [4194304, 4096, 67108864],
  });
  const operations = texts["docs/stdio-server.md"];
  expect(operations).toMatch(/baseRetryDelayMs.*must not\s+exceed.*maxRetryDelayMs/s);
  expect(operations).toMatch(/(?:loaded once at startup|startup snapshot.*fixed)/s);
  expect(operations).toMatch(
    /(?:file edit\s+alone does not disable|editing config does not (?:enable|disable))/,
  );
  const recovery = texts["docs/recovery.md"].replace(/\s+/g, " ");
  for (const boundary of [
    /(?:repeat|new call|new attempt).*duplicate/i,
    /(?:no|cannot|does not).*resum.*creation|creation.*(?:cannot|no).*resum/i,
    /(?:no creation content|never persist|no.*creation.*(?:journal|receipt))/i,
    /pending refresh.*(?:exact|original)|exact.*refresh.*(?:body|key|token)/i,
    /(?:not migrated|no automatic.*migration|no.*format migration)/i,
    /(?:rollback|older valid encrypted).*not.*detect|no.*rollback detection/i,
    /(?:never model-facing|trusted local)/i,
    /(?:transcripts|host).*retain|hosts.*retai/i,
    /(?:removal|remove).*not.*(?:remote|backup|transcript)/i,
    /(?:same.format|same format).*qualif.*exact candidate/i,
    /(?:old|future).*migration support/i,
    /archive digest.*does not certify real deployments.*release readiness/i,
  ])
    expect(recovery).toMatch(boundary);
});

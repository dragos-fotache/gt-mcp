// T01 QA: package/scripts/peer/ignore/compatibility contract checks
// (approved spec §§1, 4–7).
//
// Scope is strictly nonsecret package/config metadata, file inventories, real
// git-ignore matching against the allowed .gitignore metadata, and doc
// metadata assertions — never production sources or generated implementation
// contents (spec §6). Source/secret and implementation-side scope audits, and
// companion emitted-JS bundle proof beyond metadata, remain coordinator-owned;
// the boundary is documented in docs/evidence/t01-qa-calibration.md, not in a
// placeholder check.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DIST, REPO_ROOT } from "./harness.mjs";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

const EXACT_ROOT_DEPS = {
  "@modelcontextprotocol/sdk": "1.32.1",
  zod: "4.5.4",
};

const EXACT_ROOT_DEV_DEPS = {
  typescript: "5.9.3",
  vitest: "4.1.11",
  "@types/node": "24.19.2",
  eslint: "10.12.0",
  "@eslint/js": "10.0.1",
  "typescript-eslint": "8.71.1",
  prettier: "3.9.10",
  "@earendil-works/pi-coding-agent": "1.1.0",
};

// Full host-package names for dependency/peer exclusion checks (spec §5:
// the host supplies pi-ai/agent-core/coding-agent/tui/typebox).
const HOST_PKGS = [
  "@earendil-works/pi-ai",
  "@earendil-works/pi-agent-core",
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-tui",
  "@sinclair/typebox",
  "typebox",
];

function assertExactPinned(deps, label) {
  for (const [name, version] of Object.entries(deps ?? {})) {
    // Exact pins only: no ^, ~, ranges, tags, or "*" (the companion peer "*"
    // policy is asserted separately and lives only in peerDependencies).
    expect(version, `${label} dependency ${name} must be exact-pinned`).toMatch(/^\d+\.\d+\.\d+$/);
  }
}

describe("T01 package identity and toolchain pins (approved spec §1)", () => {
  it("root package is private ESM 0.0.0 with npm workspaces including companion", () => {
    const pkg = readJson("package.json");
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe("module");
    expect(pkg.version).toBe("0.0.0");
    expect(pkg.workspaces).toContain("companion");
    expect(pkg.packageManager).toBe("npm@11.19.0");
    // User's 2026-10-18 minimum-only policy supersedes the original Node24 upper bound.
    expect(pkg.engines?.node).toBe(">=24.0.0");
    expect(readJson("companion/package.json").engines?.node).toBe(">=24.0.0");
    const lock = readJson("package-lock.json");
    expect(lock.packages[""].engines?.node).toBe(">=24.0.0");
    expect(lock.packages.companion.engines?.node).toBe(">=24.0.0");
  });

  it("runtime and development dependencies match the approved exact pins", () => {
    const pkg = readJson("package.json");
    for (const [name, version] of Object.entries(EXACT_ROOT_DEPS)) {
      expect(pkg.dependencies?.[name]).toBe(version);
    }
    for (const [name, version] of Object.entries(EXACT_ROOT_DEV_DEPS)) {
      expect(pkg.devDependencies?.[name]).toBe(version);
    }
    assertExactPinned(pkg.dependencies, "runtime");
    assertExactPinned(pkg.devDependencies, "dev");
  });

  it("host packages stay out of root dependencies (dev pin excepted)", () => {
    const pkg = readJson("package.json");
    // The Pi development package is a devDependency only, never a runtime dep.
    expect(pkg.dependencies?.["@earendil-works/pi-coding-agent"]).toBeUndefined();
    for (const host of HOST_PKGS) {
      expect(
        pkg.dependencies?.[host],
        `root runtime dependency ${host} must be absent`,
      ).toBeUndefined();
      if (host !== "@earendil-works/pi-coding-agent") {
        expect(
          pkg.devDependencies?.[host],
          `root devDependency ${host} must be absent`,
        ).toBeUndefined();
      }
    }
  });

  it("Node pin files record the selected runtime and a lockfile exists", () => {
    expect(readText(".node-version").trim()).toBe("24.21.0");
    expect(readText(".nvmrc").trim()).toBe("24.21.0");
    expect(exists("package-lock.json")).toBe(true);
  });

  it("root package declares no write-enabled MCP registration surface", () => {
    const pkg = readJson("package.json");
    expect(pkg.mcpServers).toBeUndefined();
    expect(pkg.mcp).toBeUndefined();
  });
});

describe("T01 scripts contract (approved spec §4)", () => {
  it("required scripts exist with their observable purposes", () => {
    const scripts = readJson("package.json").scripts ?? {};
    for (const name of [
      "typecheck",
      "lint:production",
      "lint",
      "format:check:production",
      "format:check",
      "build",
      "test",
      "smoke",
      "check",
    ]) {
      expect(typeof scripts[name], `script ${name} must exist`).toBe("string");
    }
    // Smoke targets the foundation suite; no masking anywhere.
    expect(scripts.smoke).toContain("vitest run test/foundation");
    for (const [name, body] of Object.entries(scripts)) {
      expect(String(body), `script ${name} must not mask failures`).not.toContain("|| true");
      expect(String(body), `script ${name} must not enable pass-with-no-tests`).not.toMatch(
        /passWithNoTests/i,
      );
    }
  });

  it("test discovery is restricted to test/**/*.test.mjs (script or Vitest config)", () => {
    const scripts = readJson("package.json").scripts ?? {};
    const scriptRestricts =
      /vitest run/.test(String(scripts.test ?? "")) &&
      /test\/\*\*\/\*\.test\.mjs/.test(String(scripts.test ?? ""));
    // The restriction may live in Developer-owned Vitest config instead of the
    // script (spec §4 assigns config ownership to Developer); inspect the
    // allowed config metadata and accept either valid implementation.
    const configCandidates = [
      "vitest.config.ts",
      "vitest.config.js",
      "vitest.config.mts",
      "vitest.config.mjs",
    ];
    const present = configCandidates.filter((candidate) => exists(candidate));
    let configRestricts = false;
    let configText = "";
    for (const candidate of present) {
      configText += `\n${readText(candidate)}`;
    }
    if (/test\/\*\*\/\*\.test\.mjs/.test(configText)) configRestricts = true;
    expect(
      scriptRestricts || configRestricts,
      "discovery restriction to test/**/*.test.mjs must be evidenced in the test script or Vitest config",
    ).toBe(true);
    if (present.length > 0) {
      expect(configText, "Vitest config must use the node environment").toMatch(
        /environment\s*:\s*['"]node['"]/,
      );
      expect(configText, "Vitest config must not enable pass-with-no-tests").not.toMatch(
        /passWithNoTests\s*:\s*true/,
      );
    }
  });

  it("check runs the required commands in sequence, not mere membership", () => {
    const scripts = readJson("package.json").scripts ?? {};
    const steps = String(scripts.check ?? "")
      .split("&&")
      .map((part) =>
        part
          .trim()
          .replace(/^npm\s+run\s+/, "")
          .replace(/^npm\s+/, ""),
      );
    const required = ["typecheck", "lint", "format:check", "build", "test"];
    let cursor = -1;
    for (const step of required) {
      const at = steps.findIndex((candidate, index) => index > cursor && candidate === step);
      expect(
        at,
        `check sequence must run ${step} after ${cursor >= 0 ? steps[cursor] : "start"}: ${JSON.stringify(steps)}`,
      ).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("no script performs an unlocked install", () => {
    const scripts = readJson("package.json").scripts ?? {};
    for (const [name, body] of Object.entries(scripts)) {
      if (/npm\s+(install|i)\b/.test(String(body)) && !/npm\s+ci\b/.test(String(body))) {
        expect(`script ${name} performs an unlocked npm install`).toBe(
          "no unlocked install allowed",
        );
      }
    }
  });
});

describe("T01 companion peer/external contract, metadata half (approved spec §5)", () => {
  it("companion is private 0.0.0 ESM with the inert extension entry", () => {
    const pkg = readJson("companion/package.json");
    expect(pkg.private).toBe(true);
    expect(pkg.version).toBe("0.0.0");
    expect(pkg.type).toBe("module");
    const extensions = pkg.pi?.extensions ?? pkg["pi.extensions"];
    expect(extensions, "companion must declare its pi.extensions entry").toBeDefined();
    expect(extensions).toContain("./dist/index.js");
  });

  it('host packages are "*" peers at most, never runtime dependencies', () => {
    const pkg = readJson("companion/package.json");
    expect(pkg.peerDependencies?.["@earendil-works/pi-coding-agent"]).toBe("*");
    for (const host of HOST_PKGS) {
      expect(
        pkg.dependencies?.[host],
        `companion runtime dependency ${host} must be absent`,
      ).toBeUndefined();
      if (pkg.peerDependencies?.[host] !== undefined) {
        expect(
          pkg.peerDependencies[host],
          `companion peer ${host} must be "*" (host-supplied)`,
        ).toBe("*");
      }
    }
  });
});

describe("T01 ignore rules verified by real git matching (approved spec §6)", () => {
  let repoDir = "";
  let emptyExcludes = "";

  beforeAll(() => {
    // Isolated temporary git repo seeded with the allowed .gitignore metadata
    // only: proves patterns actually match, not just that substrings exist.
    // A blank global excludes file keeps the local git identity from leaking
    // extra ignores into the verdict.
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "gt-mcp-t01-qa-ignore-"));
    emptyExcludes = path.join(repoDir, "empty-excludes");
    fs.writeFileSync(emptyExcludes, "");
    const init = git(["init", "-q"]);
    if (init.status !== 0) throw new Error(`git init failed: ${init.stderr}`);
    fs.writeFileSync(path.join(repoDir, ".gitignore"), readText(".gitignore"));
    // Directory-only patterns (e.g. `/shared-docs/`) match only when git can
    // see a directory at that path, so materialize the dir-shaped probes.
    fs.mkdirSync(path.join(repoDir, "shared-docs"), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  function git(args, options = {}) {
    return spawnSync("git", ["-c", `core.excludesFile=${emptyExcludes}`, ...args], {
      cwd: repoDir,
      encoding: "utf8",
      ...options,
    });
  }

  function isIgnored(relativePath) {
    const result = git(["check-ignore", "-q", relativePath]);
    if (result.error) throw new Error(`git check-ignore unavailable: ${result.error}`);
    return result.status === 0;
  }

  const MUST_IGNORE = [
    "node_modules/some-pkg/index.js",
    "dist/index.js",
    "companion/dist/index.js",
    "coverage/lcov.info",
    "service.tsbuildinfo",
    ".pi/mcp-adapter.json",
    ".env",
    ".env.local",
    ".private/vault.json",
    "profiles/alice/vault.json",
    "vault/key.json",
    "journals/op.json",
    "receipts/r.json",
    "tls-key.pem",
    "session.key",
    "credentials.json",
    "credentials-backup.json",
    "auth.json",
    "shared-docs",
    "shared-docs/docs/mcp-contract/README.md",
  ];

  const MUST_TRACK = [
    "src/index.ts",
    "src/contracts/index.ts",
    "companion/src/index.ts",
    "test/foundation/cli-inert.test.mjs",
    "package.json",
    "companion/package.json",
    "docs/evidence/t01-qa-plan.md",
    "AGENTS.md",
  ];

  it.each(MUST_IGNORE)("ignore pattern matches %s", (relativePath) => {
    expect(isIgnored(relativePath), `${relativePath} must be git-ignored`).toBe(true);
  });

  it.each(MUST_TRACK)("working-tree source is not ignored: %s", (relativePath) => {
    expect(isIgnored(relativePath), `${relativePath} must NOT be git-ignored`).toBe(false);
  });
});

describe("T01 typecheck strictness boundary (approved spec §2, coordinator relay)", () => {
  it("root production config keeps full checking (no skipLibCheck)", () => {
    // Text-level metadata assertion (robust to JSONC comments): the relayed
    // allowance is companion-only skipLibCheck=true; root must check fully.
    expect(readText("tsconfig.json"), "root tsconfig must not relax with skipLibCheck").not.toMatch(
      /"skipLibCheck"\s*:\s*true/,
    );
  });

  it("companion config uses at most the allowed skipLibCheck=true exception", () => {
    const text = readText("companion/tsconfig.json");
    const match = text.match(/"skipLibCheck"\s*:\s*(true|false)/);
    if (match) {
      expect(match[1], "companion skipLibCheck exception must be exactly true").toBe("true");
    }
  });
});

describe("T01 artifact inventory and compatibility matrix (approved spec §§2, 7)", () => {
  it("approved build artifact inventory exists (existence only, contents unread)", () => {
    for (const artifact of [DIST.barrel, DIST.contracts, DIST.server, DIST.cli, DIST.companion]) {
      expect(fs.existsSync(artifact), `missing build artifact ${artifact}`).toBe(true);
    }
    expect(exists("dist/index.d.ts")).toBe(true);
    expect(exists("companion/dist/index.d.ts")).toBe(true);
  });

  it("compatibility matrix matches the current approved policy structure (doc metadata only)", () => {
    // Current authoritative docs/compatibility.md: 17 component rows, five
    // columns; 16 product rows unverified and the single retired companion
    // row "not in current delivery" (user-approved config-only policy).
    // Component names are exact public metadata: presence, uniqueness and
    // no-substitution are enforced so missing components fail (spec section7).
    const EXPECTED_COMPONENTS = [
      "Node.js",
      "npm",
      "TypeScript",
      "Official MCP SDK",
      "MCP protocol",
      "Zod",
      "Vitest",
      "Node types",
      "ESLint / JS / TS ESLint / Prettier",
      "Pi runtime",
      "Config-file routine-creation guard",
      "Pi companion / approval ordering",
      "OS / secret facility",
      "Backend / OpenAPI / shared docs",
      "Google / helper origin",
      "Android sync observation",
      "Credential/config format transitions",
    ];
    expect(exists("docs/compatibility.md")).toBe(true);
    const text = readText("docs/compatibility.md");
    const rows = text
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim()),
      );
    const isSeparator = (cells) =>
      cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    const data = rows.filter((cells) => !isSeparator(cells)).slice(1); // drop header row
    expect(data.length, "matrix must currently have 17 data rows").toBe(17);
    let unverified = 0;
    let retired = 0;
    for (const cells of data) {
      expect(cells.length, `row must have 5 cells: ${JSON.stringify(cells)}`).toBe(5);
      const status = cells[3].toLowerCase();
      if (status === "unverified") {
        unverified += 1;
      } else if (status === "not in current delivery") {
        retired += 1;
        expect(
          cells[0].toLowerCase(),
          `retired row must be the companion scope: ${JSON.stringify(cells)}`,
        ).toContain("companion");
      } else {
        expect(
          `unexpected Status "${cells[3]}" on "${cells[0]}": no false compatibility claim allowed`,
        ).toBe("unverified or not in current delivery");
      }
    }
    expect(unverified, "16 product rows must be unverified").toBe(16);
    expect(retired, "single retired companion row must be present").toBe(1);
    const actualComponents = data.map((cells) => cells[0]);
    expect([...actualComponents].sort()).toEqual([...EXPECTED_COMPONENTS].sort());
    expect(new Set(actualComponents).size, "component names must be unique").toBe(
      EXPECTED_COMPONENTS.length,
    );
    expect(text, "matrix must record the selected Node pin").toContain("24.21.0");
  });
});

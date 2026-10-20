// Fixed isolated acceptance execution; preparation reuses the accepted T08 fixture.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createHeldFixture,
  prepareS1RelayFixtures,
  s1RelayResponder,
  SYNTHETIC_UUIDS,
} from "../read-runtime/fixtures.mjs";

const [selectionPath, output] = process.argv.slice(2);
const selection = JSON.parse(fs.readFileSync(selectionPath));
if (
  !Array.isArray(selection) ||
  selection.length === 0 ||
  selection.some((p) => typeof p !== "string" || !/^test\/[\w/-]+\.test\.mjs$/.test(p))
)
  throw new Error("Exact active test selection required");

export function hashes() {
  const result = {};
  function visit(p) {
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).isDirectory()) {
      for (const name of fs.readdirSync(p).sort()) visit(path.join(p, name));
    } else result[p] = createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  }
  for (const p of [
    "src",
    "test",
    "companion/src",
    "companion/dist",
    "dist",
    "experiments/t02",
    "scripts",
    "packaging",
    ".github",
    "AGENTS.md",
    "package.json",
    "package-lock.json",
    "companion/package.json",
    "tsconfig.json",
    "companion/tsconfig.json",
    "eslint.config.mjs",
    "vitest.config.ts",
    ".gitignore",
    ".prettierignore",
    ".prettierrc.json",
    ".node-version",
    ".nvmrc",
    "docs/compatibility.md",
    "docs/decisions/t01-implementation-adr.md",
    "docs/installation.md",
    "docs/login.md",
    "docs/stdio-server.md",
    "docs/recovery.md",
  ])
    visit(p);
  return result;
}

const backend = createHeldFixture({
  key: fs.readFileSync(process.env.GT_S1_FIXTURE_KEY_FILE),
  cert: fs.readFileSync(process.env.GT_S1_FIXTURE_CERT_FILE),
});
const before = hashes();
let code;
try {
  const origin = await backend.listen();
  backend.setResponder(s1RelayResponder);
  const grant = {
    account: { id: SYNTHETIC_UUIDS.account, displayName: null },
    accessToken: "synthetic-t15-s3-access",
    refreshToken: "synthetic-t15-s3-refresh",
    accessExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const liveGrantBytes = Buffer.from(JSON.stringify(grant));
  const expiredGrantBytes = Buffer.from(
    JSON.stringify({
      ...grant,
      accessExpiresAt: new Date(Date.now() - 1000).toISOString(),
    }),
  );
  const manifest = await prepareS1RelayFixtures({
    base: process.env.GT_S3_PRIVATE_ROOT,
    busAddress: process.env.GT_S3_TEST_BUS,
    origin,
    liveGrantBytes,
    expiredGrantBytes,
  });
  const live = path.join(process.env.GT_S3_PRIVATE_ROOT, "live-grant.json");
  const expired = path.join(process.env.GT_S3_PRIVATE_ROOT, "expired-grant.json");
  fs.writeFileSync(live, liveGrantBytes, { mode: 0o600 });
  fs.writeFileSync(expired, expiredGrantBytes, { mode: 0o600 });
  const child = spawn(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      ...selection,
      "--no-file-parallelism",
      "--reporter=default",
      "--reporter=json",
      `--outputFile=${output}.vitest.json`,
    ],
    {
      env: {
        ...process.env,
        ...manifest,
        GT_S1_GRANT_BYTES_FILE: live,
        GT_S1_EXPIRED_GRANT_BYTES_FILE: expired,
      },
      stdio: "inherit",
    },
  );
  code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
} finally {
  await backend.close();
}
const after = hashes();
const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
  (p) => before[p] !== after[p],
);
const report = JSON.parse(fs.readFileSync(output + ".vitest.json"));
fs.writeFileSync(
  output + ".inventory.json",
  JSON.stringify(
    {
      exitCode: code,
      success: report.success,
      passed: report.numPassedTests,
      failed: report.numFailedTests,
      pending: report.numPendingTests,
      todo: report.numTodoTests,
      stable: changed.length === 0,
      changed,
      hashCount: Object.keys(before).length,
      selection,
      results: report.testResults.map((r) => ({
        file: path.relative(process.cwd(), r.name),
        status: r.status,
        passed: r.assertionResults.filter((a) => a.status === "passed").length,
        failed: r.assertionResults.filter((a) => a.status === "failed").length,
        other: r.assertionResults.filter((a) => a.status !== "passed" && a.status !== "failed")
          .length,
      })),
      hashes: before,
    },
    null,
    2,
  ) + "\n",
);
process.exitCode = changed.length === 0 ? code : 1;

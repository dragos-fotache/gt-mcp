// T01 QA calibration cases: deliberate QA-owned synthetic probes that MUST trip
// the interception preload. Shared by the plain-node runner (executable now —
// these are QA fixture probes, not production targets) and the vitest mirror
// (runs with the suite post-relay). Each case states the expected exit and the
// violation substrings that must appear in the intercept report.
//
// Conventions: `TMP` expands to the child's synthetic tmp root
// (process.env.QA_SYNTHETIC_TMP); `FIXTURE` expands to this repo's QA-owned
// synthetic vectors file URL. No production paths appear here.

import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_URL = pathToFileURL(path.join(HERE, "..", "fixtures", "synthetic-vectors.mjs")).href;

const EVAL_TMP = "process.env.QA_SYNTHETIC_TMP";

export const CASES = [
  {
    name: "fetch attempt is detected and fails the child",
    code: `await globalThis.fetch('http://127.0.0.1:9/qa-probe');`,
    expectExitNonZero: true,
    expectViolations: ["fetch x1"],
  },
  {
    name: "net listen attempt is detected and fails the child",
    code: `const net = await import('node:net'); const server = net.createServer(); server.listen(0, '127.0.0.1');`,
    expectExitNonZero: true,
    expectViolations: ["listen x1"],
  },
  {
    name: "child_process spawn attempt is detected and fails the child",
    code: `const cp = await import('node:child_process'); cp.spawn('qa-probe', []);`,
    expectExitNonZero: true,
    expectViolations: ["child-process"],
  },
  {
    name: "process handler subscription is recorded without failing the child",
    code: `process.on('SIGTERM', () => {});`,
    expectExit: 0,
    expectViolations: ["handler:on:SIGTERM"],
  },
  {
    name: "timer creation is recorded without failing the child",
    code: `setTimeout(() => {}, 5);`,
    expectExit: 0,
    expectViolations: ["timers x1"],
  },
  {
    name: "sync private-state read is detected and fails the child",
    code: `const fs = await import('node:fs'); fs.readFileSync(${EVAL_TMP} + '/vault/seed.json', 'utf8');`,
    expectExitNonZero: true,
    expectViolations: ["readFileSync:read:private:"],
  },
  {
    name: "sync write outside the report path is detected and fails the child",
    code: `const fs = await import('node:fs'); fs.writeFileSync(${EVAL_TMP} + '/note.txt', 'x');`,
    expectExitNonZero: true,
    expectViolations: ["writeFileSync:write:other:"],
  },
  {
    name: "fs.promises private-state read is detected and fails the child",
    code: `const fsp = await import('node:fs/promises'); await fsp.readFile(${EVAL_TMP} + '/profiles/a.json', 'utf8');`,
    expectExitNonZero: true,
    expectViolations: ["readFile:read:private:"],
  },
  {
    name: "callback private-state read is detected and fails the child",
    code: `const fs = await import('node:fs'); fs.readFile(${EVAL_TMP} + '/journals/j.json', () => {});`,
    expectExitNonZero: true,
    expectViolations: ["readFile:read:private:"],
  },
  {
    name: "URL-object private-state read is detected after normalization",
    code: `const fs = await import('node:fs'); const { pathToFileURL } = await import('node:url'); fs.readFileSync(pathToFileURL(${EVAL_TMP} + '/receipts/r.json'));`,
    expectExitNonZero: true,
    expectViolations: ["readFileSync:read:private:"],
  },
  {
    name: "relative private-state read is detected after resolution",
    code: `const fs = await import('node:fs'); fs.readFileSync('vault/relative-seed.json', 'utf8');`,
    expectExitNonZero: true,
    expectViolations: ["readFileSync:read:private:"],
  },
  {
    name: "stdin.read attempt is detected and fails the child",
    code: `process.stdin.read();`,
    expectExitNonZero: true,
    expectViolations: ["stdin:read"],
  },
  {
    name: "stdin subscription is detected (machinery reads are blocked too)",
    code: `process.stdin.once('readable', () => {});`,
    expectExitNonZero: true,
    expectViolations: ["stdin:sub:once:readable", "stdin:read"],
  },
  {
    name: "stdin data subscription is detected (flow machinery read is blocked)",
    code: `process.stdin.on('data', () => {});`,
    expectExitNonZero: true,
    expectViolations: ["stdin:sub:on:data", "stdin:read"],
  },
  {
    name: "clean control: importing a QA-owned fixture is silent",
    code: `await import(${JSON.stringify(FIXTURE_URL)});`,
    expectExit: 0,
    expectClean: true,
  },
  {
    name: "clean control: own stdout passes through with a clean report",
    code: `console.log('probe-ok');`,
    expectExit: 0,
    expectOut: "probe-ok\n",
    expectClean: true,
  },
];

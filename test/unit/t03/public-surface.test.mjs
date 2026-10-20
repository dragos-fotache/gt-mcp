// T03 QA: required public declaration and export surface (spec section 2).
//
// The ten required exports are a MINIMUM surface, not an exclusive namespace:
// additional pure constants/types are permitted. Checks assert required names
// and kinds only (subset, never exact namespace equality).
//
// The domain import-observable test uses the shared artifact-free runner; it
// executes only at the final relay. dist/domain/index.d.ts is checked for
// existence as metadata only: its declarations/implementation contents are
// never read. Synthetic data only.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as domain from "../../../dist/domain/index.js";
import { expectZodVendorGlobals, withScope } from "./import-probe-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOMAIN_JS = path.resolve(HERE, "../../../dist/domain/index.js");
const DOMAIN_DTS = path.resolve(HERE, "../../../dist/domain/index.d.ts");
const DENY_SETUP_JS = path.resolve(HERE, "import-deny-setup.mjs");

const REQUIRED_EXPORTS = [
  "TOOL_NAMES",
  "toolSchemas",
  "CodecError",
  "parseArguments",
  "normalizeIntent",
  "intentIdentityMaterial",
  "projectRevision",
  "decodeBackendResponse",
  "buildRoutineInput",
  "makeToolResult",
];

describe("T03 public export surface (spec section 2)", () => {
  it("exposes at least the ten required runtime exports", () => {
    for (const name of REQUIRED_EXPORTS) {
      expect(name in domain, `missing required export ${name}`).toBe(true);
    }
  });

  it("required exports have the required kinds", () => {
    expect(Array.isArray(domain.TOOL_NAMES)).toBe(true);
    expect(domain.TOOL_NAMES).toHaveLength(7);
    expect(domain.toolSchemas !== null && typeof domain.toolSchemas === "object").toBe(true);
    expect(typeof domain.CodecError).toBe("function");
    for (const name of REQUIRED_EXPORTS.slice(3)) {
      expect(typeof domain[name], `${name} must be a function`).toBe("function");
    }
  });

  it("dist/domain/index.d.ts exists (existence only, contents unread)", () => {
    expect(fs.existsSync(DOMAIN_DTS)).toBe(true);
  });

  it("domain entry imports cleanly under arbitrary argv (verified vendor globals only)", () => {
    // Adjudicated test correction
    // (the pinned-Zod import contract): the domain entry may
    // show only the verified pinned-dependency addition set — exactly the
    // two named own data properties — with all other channels clean. No
    // wildcard/prefix ignores; any other global addition fails.
    withScope(
      pathToFileURL(DOMAIN_JS).href,
      pathToFileURL(DENY_SETUP_JS).href,
      expectZodVendorGlobals,
      "domain",
    );
  });
});

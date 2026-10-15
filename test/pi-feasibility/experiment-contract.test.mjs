// T02 QA: spec-contract self-checks (no driver execution, layer logic-control).
//
// These assertions run without any experiment artifact: they verify QA's own
// independent digest implementation and registry mirror against the approved
// spec. They prove nothing about the pipeline; pipeline evidence comes from
// the scenario tests. Experimental-metadata declaration checks (relative
// entries, versions, layer profiles, scenario registry, resource aliases per
// spec §4) are deferred until the coordinator names the exact metadata file.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertPinnedVersion } from "./helpers/report-checks.mjs";
import {
  ALL_SCENARIOS,
  EXPECTED_SEED_SHA,
  FIXTURE_TOOLS,
  REFUSAL,
  SCENARIOS,
  SEED,
  canonicalDigest,
  seedDigest,
} from "../fixtures/t02/synthetic-seed.mjs";

describe("T02 independent canonical digest (spec §5, logic-control only)", () => {
  it("helper reproduces the fixed public seed SHA (spec §5 calibration)", () => {
    expect(seedDigest()).toBe(EXPECTED_SEED_SHA);
  });

  it("seed digest is stable and hex SHA256", () => {
    const first = seedDigest();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(seedDigest()).toBe(first);
  });

  it("omitted rest and set fields take documented defaults only", () => {
    const explicit = canonicalDigest({
      operationId: SEED.operationId,
      name: SEED.name,
      exercises: [
        {
          exerciseId: SEED.exerciseId,
          restDurationSeconds: 30,
          sets: [
            { repetitions: 0, weightKg: 0 },
            { repetitions: null, weightKg: null },
          ],
        },
      ],
    });
    expect(explicit).toBe(seedDigest());
  });

  it("array order and repeated references change the digest", () => {
    const reordered = canonicalDigest({
      operationId: SEED.operationId,
      name: SEED.name,
      exercises: [
        {
          exerciseId: SEED.exerciseId,
          sets: [{}, { repetitions: 0, weightKg: 0 }],
        },
      ],
    });
    expect(reordered).not.toBe(seedDigest());
  });

  it("unknown properties and coercion-prone values throw, never guess", () => {
    expect(() =>
      canonicalDigest({ ...SEED.input, confirmed: true }),
    ).toThrow();
    expect(() =>
      canonicalDigest({
        ...SEED.input,
        exercises: [{ exerciseId: SEED.exerciseId, sets: [{ repetitions: "8" }] }],
      }),
    ).toThrow();
    expect(() =>
      canonicalDigest({ ...SEED.input, operationId: "not-a-uuid" }),
    ).toThrow();
  });
});

describe("T02 registry and vocabulary mirror the approved spec (§§5,7)", () => {
  it("scenario registry covers every spec row exactly once", () => {
    expect(ALL_SCENARIOS.length).toBe(41);
    expect(new Set(ALL_SCENARIOS).size).toBe(41);
    expect(SCENARIOS.ptyApprove.length).toBe(4);
    expect(SCENARIOS.ptyReject.length).toBe(4);
    expect(SCENARIOS.sdkReadonly.length).toBe(4);
    expect(SCENARIOS.calibration.length).toBe(2);
  });

  it("seven fixture tools with creation as the single write analogue", () => {
    expect(FIXTURE_TOOLS.length).toBe(7);
    expect(FIXTURE_TOOLS).toContain("create_routine");
  });

  it("refusal vocabulary matches spec §5 codes", () => {
    expect(Object.values(REFUSAL)).toEqual([
      "write_approval_required",
      "invalid_arguments",
      "input_integrity_mismatch",
      "binding_unavailable",
    ]);
  });
});

describe("T02 experimental metadata declares the public contract (spec §8)", () => {
  const METADATA = "experiments/t02/metadata.json";

  function loadMetadata() {
    let raw;
    try {
      raw = readFileSync(METADATA, "utf8");
    } catch {
      throw new Error(
        `public metadata ${METADATA} unavailable: execution remains blocked until the coordinator artifact-ready relay`,
      );
    }
    return JSON.parse(raw);
  }

  it("metadata names synthetic scope, schema version, and runtime pins", () => {
    const metadata = loadMetadata();
    expect(metadata.synthetic).toBe(true);
    expect(metadata.schemaVersion).toBe(1);
    for (const [key, pin] of Object.entries({
      node: "24.21.0",
      npm: "11.19.0",
      pi: "1.1.0",
      sdk: "1.32.1",
    })) {
      assertPinnedVersion(metadata.runtime?.[key], pin, `metadata runtime.${key}`);
    }
  });

  it("metadata declares relative entries, layers, and aliases", () => {
    const metadata = loadMetadata();
    for (const entry of Object.values(metadata.entries ?? {})) {
      expect(entry, "relative entry path").toMatch(/^(?:[\w.-]+\/)*[\w.-]+\.m?js$/);
      expect(entry.startsWith("/"), "no absolute entry path").toBe(false);
    }
    expect(metadata.layers, "layer profiles declared").toBeTypeOf("object");
    expect(metadata.resourceAliases, "resource aliases declared").toBeTypeOf("object");
  });

  it("metadata scenario registry covers every spec §7 row with harnesses", () => {
    const metadata = loadMetadata();
    expect(Array.isArray(metadata.scenarios)).toBe(true);
    const names = metadata.scenarios.map((s) => s.name);
    for (const scenario of ALL_SCENARIOS) {
      expect(names.includes(scenario), `registry covers ${scenario}`).toBe(true);
    }
    for (const entry of metadata.scenarios) {
      expect(
        Array.isArray(entry.harnesses) && entry.harnesses.length > 0,
        `supported harnesses for ${entry.name}`,
      ).toBe(true);
      for (const harness of entry.harnesses) {
        expect(["sdk", "pty"].includes(harness)).toBe(true);
      }
    }
  });
});

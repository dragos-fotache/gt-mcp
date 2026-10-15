// T08-S1 QA: trusted selection/schema/access (spec section 1 + §2 clarification).
// Caller factory shape/field/path failures => invalid_arguments (exact);
// malformed/unsafe/incompatible selected metadata => configuration_required
// (exact). Missing selected file stays unconfigured. Real representative
// metadata/file-safety fixtures below; NOT RUN now.
/* global AbortController */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { expectReadRuntimeErrorKinds, requiredEnv } from "./helpers.mjs";
import { makeIsolatedScratch } from "./fixtures.mjs";
import { openReadRuntime } from "../../dist/runtime/index.js";

function validConfigText(
  dir,
  descriptorPath,
  origin,
  bus = "unix:path=/run/user/1000/synthetic-bus",
) {
  return JSON.stringify({
    version: 1,
    serviceOrigin: origin,
    storage: {
      profileRoot: path.join(dir, "profile"),
      anchorRoot: path.join(dir, "anchor"),
      secretServiceBusAddress: bus,
    },
    bindingDescriptorPath: descriptorPath,
  });
}

function validDescriptorText(origin) {
  return JSON.stringify({
    version: 1,
    binding: {
      origin,
      accountUuid: null,
      sessionGeneration: 0,
      profileGenerationId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    },
  });
}

describe("S1 startup config selection", () => {
  it("exports the exact runtime surface", async () => {
    const mod = await import("../../dist/runtime/index.js");
    expectReadRuntimeErrorKinds(mod);
  });

  it("openReadRuntime({}) returns an unconfigured runtime without IO", async () => {
    const rt = await openReadRuntime({});
    try {
      expect(typeof rt.close).toBe("function");
      expect(typeof rt.searchExercises).toBe("function");
      expect(typeof rt.getExercise).toBe("function");
      expect(typeof rt.listWorkouts).toBe("function");
      expect(typeof rt.getWorkout).toBe("function");
      expect(typeof rt.listRoutines).toBe("function");
      expect(typeof rt.getRoutine).toBe("function");
    } finally {
      await rt.close();
    }
  });

  it("invalid caller shape/fields/path syntax fails invalid_arguments exactly", async () => {
    for (const options of [
      { configPath: "" },
      { configPath: "relative/path.json" },
      { configPath: 42 },
      { configPath: "/absent.json", unknownField: true },
    ]) {
      await expect(openReadRuntime(options)).rejects.toMatchObject({
        name: "ReadRuntimeError",
        code: "invalid_arguments",
      });
    }
    await expect(openReadRuntime(null)).rejects.toMatchObject({
      name: "ReadRuntimeError",
      code: "invalid_arguments",
    });
  });

  it("treats a genuinely absent selected config file as unconfigured, not fatal", async () => {
    const dir = makeIsolatedScratch();
    try {
      // Absent file inside an existing private subtree (S1 sticky-parent rule).
      const missing = path.join(dir, "missing-config.json");
      expect(fs.existsSync(missing)).toBe(false);
      const rt = await openReadRuntime({ configPath: missing });
      try {
        const res = await rt.searchExercises({}, new AbortController().signal);
        expect(res).toMatchObject({ ok: false, error: { code: "configuration_required" } });
      } finally {
        await rt.close();
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("valid metadata passes file validation: unprovisioned owner fails closed", async () => {
    // Positive control for the negative cases above: an internally valid
    // pair must never fail configuration_required, and factory success is
    // forbidden (it would conceal a blocked-but-running fallback). The temp
    // roots were never provisioned, so storage opening MUST fail closed.
    const origin = "https://synthetic-qa.invalid";
    const dir = makeIsolatedScratch();
    try {
      const desc = path.join(dir, "synthetic-descriptor.json");
      const configPath = path.join(dir, "synthetic-config.json");
      fs.writeFileSync(
        configPath,
        validConfigText(dir, desc, origin, requiredEnv("GT_S1_TEST_BUS")),
      );
      fs.chmodSync(configPath, 0o600);
      fs.writeFileSync(desc, validDescriptorText(origin));
      fs.chmodSync(desc, 0o600);
      await expect(openReadRuntime({ configPath })).rejects.toMatchObject({
        name: "ReadRuntimeError",
        code: "recovery_unavailable",
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("unconfigured reads never dispatch: all six report configuration_required", async () => {
    const rt = await openReadRuntime({});
    try {
      const signal = new AbortController().signal;
      const id = "cccccccc-cccc-cccc-cccc-cccccccccccc";
      const results = await Promise.all([
        rt.searchExercises({}, signal),
        rt.getExercise({ exerciseId: id }, signal),
        rt.listWorkouts({}, signal),
        rt.getWorkout({ workoutId: id }, signal),
        rt.listRoutines({}, signal),
        rt.getRoutine({ routineId: id }, signal),
      ]);
      for (const r of results) {
        expect(r).toMatchObject({ ok: false, error: { code: "configuration_required" } });
      }
    } finally {
      await rt.close();
    }
  });

  it("representative malformed/unsafe metadata fails configuration_required exactly", async () => {
    const origin = "https://synthetic-qa.invalid";
    // Shared otherwise-valid bus metadata with the positive control below,
    // so an invalid common field cannot explain every failure.
    const bus = requiredEnv("GT_S1_TEST_BUS");
    const cases = {
      "duplicate JSON keys": (dir, desc) => [
        `{"version":1,"version":1,"serviceOrigin":${JSON.stringify(origin)},` +
          `"storage":{"profileRoot":${JSON.stringify(path.join(dir, "profile"))},` +
          `"anchorRoot":${JSON.stringify(path.join(dir, "anchor"))},` +
          `"secretServiceBusAddress":${JSON.stringify(bus)},` +
          `"bindingDescriptorPath":${JSON.stringify(desc)}}`,
        validDescriptorText(origin),
      ],
      "unknown config field": (dir, desc) => [
        validConfigText(dir, desc, origin, bus).replace(/}$/, `,"syntheticExtra":true}`),
        validDescriptorText(origin),
      ],
      "unsupported version": (dir, desc) => [
        validConfigText(dir, desc, origin, bus).replace(`"version":1`, `"version":2`),
        validDescriptorText(origin),
      ],
      "oversize config": (dir, desc) => [
        validConfigText(dir, desc, origin, bus).padEnd(65537, " "),
        validDescriptorText(origin),
      ],
      "descriptor origin mismatch": (dir, desc) => [
        validConfigText(dir, desc, origin, bus),
        validDescriptorText("https://other-synthetic.invalid"),
      ],
      "unsafe file permissions": (dir, desc) => [
        validConfigText(dir, desc, origin, bus),
        validDescriptorText(origin),
        0o644,
      ],
    };
    for (const [label, build] of Object.entries(cases)) {
      const dir = makeIsolatedScratch();
      try {
        const desc = path.join(dir, "synthetic-descriptor.json");
        const [configText, descriptorText, mode = 0o600] = build(dir, desc);
        const configPath = path.join(dir, "synthetic-config.json");
        // Explicit modes independent of umask; the unsafe case MUST assert
        // the established 0644 before the factory runs.
        fs.writeFileSync(configPath, configText);
        fs.chmodSync(configPath, mode);
        expect(fs.statSync(configPath).mode & 0o777).toBe(mode);
        fs.writeFileSync(desc, descriptorText);
        fs.chmodSync(desc, 0o600);
        expect(fs.statSync(desc).mode & 0o777).toBe(0o600);
        await expect(openReadRuntime({ configPath }), label).rejects.toMatchObject({
          name: "ReadRuntimeError",
          code: "configuration_required",
        });
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("symlinked selected file fails configuration_required, never followed", async () => {
    const dir = makeIsolatedScratch();
    try {
      const origin = "https://synthetic-qa.invalid";
      const desc = path.join(dir, "synthetic-descriptor.json");
      const real = path.join(dir, "real-config.json");
      fs.writeFileSync(real, validConfigText(dir, desc, origin, requiredEnv("GT_S1_TEST_BUS")));
      fs.chmodSync(real, 0o600);
      fs.writeFileSync(desc, validDescriptorText(origin));
      fs.chmodSync(desc, 0o600);
      const link = path.join(dir, "link-config.json");
      fs.symlinkSync(real, link);
      await expect(openReadRuntime({ configPath: link })).rejects.toMatchObject({
        name: "ReadRuntimeError",
        code: "configuration_required",
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

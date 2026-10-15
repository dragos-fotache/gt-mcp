import { describe, expect, it } from "vitest";
import { EXERCISE, ID, runtimeFixture } from "./fixtures.mjs";
import {
  connectFixture,
  expectEnvelope,
  expectError,
  expectedResult,
  rawCall,
  resultBytes,
} from "./helpers.mjs";

describe("S2 inclusive entire-result UTF-8 policy", () => {
  it("accepts equality and rejects exactly one byte over, including Unicode and escaped duplicated text", async () => {
    const envelope = {
      ok: true,
      data: { ...EXERCISE, name: 'Synthetic é🙂 "quoted" \\ slash\n'.repeat(100) },
    };
    const bytes = resultBytes(envelope);
    const serialized = JSON.stringify(expectedResult(envelope));
    expect(bytes).toBeGreaterThanOrEqual(4096);
    expect(bytes).toBeGreaterThan(serialized.length);
    expect(bytes).toBeGreaterThan(Buffer.byteLength(JSON.stringify(envelope), "utf8"));
    for (const budget of [bytes, bytes - 1]) {
      const fixture = runtimeFixture({ getExercise: async () => envelope });
      const session = await connectFixture(fixture, { maxToolResultBytes: budget });
      try {
        const result = await session.client.callTool({
          name: "get_exercise",
          arguments: { exerciseId: ID },
        });
        if (budget === bytes) {
          expectEnvelope(result, envelope);
          expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBe(budget);
        } else {
          expectError(result, "result_too_large", false);
          expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThanOrEqual(budget);
        }
      } finally {
        await session.close();
      }
    }
  });

  it("budgets safe error results too, replacing rather than shortening their metadata", async () => {
    const envelope = {
      ok: false,
      error: {
        code: "backend_error",
        retryable: false,
        // T05 safe unknown code: lowercase ASCII/underscores, no long hex run
        // or captured sensitive value (this capability fixture has none).
        backendErrorCode: "synthetic_overflow_code_".repeat(600),
      },
    };
    expect(resultBytes(envelope)).toBeGreaterThan(4096);
    const fixture = runtimeFixture({ listRoutines: async () => envelope });
    const session = await connectFixture(fixture, { maxToolResultBytes: 4096 });
    try {
      const result = await rawCall(session.client, { name: "list_routines" });
      expectError(result, "result_too_large", false);
      expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThanOrEqual(4096);
    } finally {
      await session.close();
    }
  });

  it("turns non-JSON/serialization hazards into a minimal bounded internal_error without executing accessors", async () => {
    let touched = 0;
    const data = { ...EXERCISE };
    Object.defineProperty(data, "syntheticConvenience", {
      enumerable: true,
      get() {
        touched += 1;
        throw new Error("SYNTHETIC_NATIVE_DETAIL");
      },
    });
    const fixture = runtimeFixture({ getExercise: async () => ({ ok: true, data }) });
    const session = await connectFixture(fixture, { maxToolResultBytes: 4096 });
    try {
      const result = await rawCall(session.client, {
        name: "get_exercise",
        arguments: { exerciseId: ID },
      });
      expectError(result, "internal_error", true);
      expect(touched).toBe(0);
      expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThanOrEqual(4096);
    } finally {
      await session.close();
    }
  });
});

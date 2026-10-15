/* global AbortSignal */
import { describe, expect, it } from "vitest";
import { toolSchemas } from "../../dist/domain/index.js";
import { collectRefs } from "../unit/t03/helpers.mjs";
import {
  CASES,
  CREATE_ARGS,
  DESCRIPTIONS,
  ID,
  OPERATION_ID,
  ROUTINE_ID,
  TOOL_NAMES,
  runtimeFixture,
} from "./fixtures.mjs";
import { ajvValidator, connectFixture, expectEnvelope, expectError } from "./helpers.mjs";

describe("S2 official SDK catalogue and dispatch", () => {
  it("initializes with tools-only authority and lists seven fixed complete schemas", async () => {
    const fixture = runtimeFixture();
    const session = await connectFixture(fixture);
    try {
      expect(session.client.getServerVersion()).toEqual({
        name: "gymtracka-mcp",
        version: "0.0.0",
      });
      expect(session.client.getServerCapabilities()).toEqual({ tools: {} });
      const listed = await session.client.listTools();
      expect(Object.keys(listed)).toEqual(["tools"]);
      expect(listed.tools.map((tool) => tool.name)).toEqual(TOOL_NAMES);
      const validator = ajvValidator();
      for (const [index, tool] of listed.tools.entries()) {
        expect(Object.keys(tool).sort()).toEqual([
          "annotations",
          "description",
          "inputSchema",
          "name",
          "outputSchema",
        ]);
        expect(tool.description).toBe(DESCRIPTIONS[index]);
        expect(tool.annotations).toEqual(
          index < 6
            ? { readOnlyHint: true, idempotentHint: true, openWorldHint: true }
            : {
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true,
              },
        );
        expect(tool.inputSchema).toEqual(toolSchemas[tool.name].inputSchema);
        expect(tool.outputSchema).toEqual({
          ...toolSchemas[tool.name].outputSchema,
          type: "object",
        });
        for (const schema of [tool.inputSchema, tool.outputSchema]) {
          expect(collectRefs(schema).every(({ ref }) => ref.startsWith("#"))).toBe(true);
          validator.getValidator(schema);
        }
        const data =
          index < 6
            ? CASES[index].data
            : { operationId: OPERATION_ID, routineId: ROUTINE_ID, status: "saved" };
        const validate = validator.getValidator(tool.outputSchema);
        expect(validate({ ok: true, data }).valid).toBe(true);
        expect(
          validate({ ok: false, error: { code: "configuration_required", retryable: false } })
            .valid,
        ).toBe(true);
        expect(validate({ ok: true, data, error: { code: "x", retryable: false } }).valid).toBe(
          false,
        );
      }
      expect(fixture.calls).toEqual([]);
      // Also exercises SDK built-in ping, not a custom tool or background task.
      await session.client.ping();
    } finally {
      await session.close();
    }
    expect(fixture.closeCount).toBe(1);
  });

  it("dispatches all six reads once with exact effective arguments, canonical data and matching text", async () => {
    const fixture = runtimeFixture();
    const session = await connectFixture(fixture);
    try {
      await session.client.listTools(); // installs SDK output validators
      for (const row of CASES) {
        const result = await session.client.callTool({ name: row.name, arguments: row.args });
        expectEnvelope(result, { ok: true, data: row.data });
      }
      expect(fixture.calls.map(({ method, args }) => ({ method, args }))).toEqual(
        CASES.map(({ method, effective }) => ({ method, args: effective })),
      );
      for (const call of fixture.calls) {
        expect(call.signal).toBeInstanceOf(AbortSignal);
        expect(call.signal.aborted).toBe(false);
        expect(call.receiver).toBe(fixture.runtime);
      }
      const create = await session.client.callTool({
        name: "create_routine",
        arguments: CREATE_ARGS,
      });
      expectError(create, "configuration_required", false, {
        message: "Routine creation is unavailable in this build.",
      });
      expect(fixture.calls).toHaveLength(6);
      // Explicit opaque page context must survive the adapter unchanged.
      await session.client.callTool({
        name: "search_exercises",
        arguments: {
          search: " Synthetic Query ",
          limit: 1,
          pageToken: "opaque/+==",
          muscleGroupIds: [ID],
          equipmentIds: [],
        },
      });
      expect(fixture.calls.at(-1).args).toEqual({
        search: " Synthetic Query ",
        limit: 1,
        pageToken: "opaque/+==",
        muscleGroupIds: [ID],
        equipmentIds: [],
      });
    } finally {
      await session.close();
    }
  });
});

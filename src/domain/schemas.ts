/**
 * Published self-contained JSON Schemas for all seven tools (fourteen
 * schemas). Input schemas are generated from the Zod runtime source
 * (inputs.ts); output schemas are carefully aligned manual compositions for
 * projection constraints (revision range regex, exact roots). Every schema
 * uses draft 2020-12 with only local `#` references and no remote fetches.
 * Runtime refinements that JSON Schema cannot express (Unicode names,
 * calendar/identity invariants) are enforced by the codec and documented in
 * the T03 implementation ADR. Published values are frozen as immutable.
 */
import { INT32_MAX, TOOL_NAMES, UUID_PATTERN_SOURCE, type ToolName } from "./constants.js";
import { deepFreeze } from "./clone.js";
import { buildInputJsonSchema } from "./inputs.js";
import { REVISION_STRING_PATTERN_SOURCE } from "./revision.js";

const SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
const WEIGHT_MAXIMUM = 1.7976931348623157e308;

type Schema = Record<string, unknown>;

function uuidDef(): Schema {
  return { type: "string", pattern: UUID_PATTERN_SOURCE };
}

function revisionDef(): Schema {
  return { type: "string", pattern: REVISION_STRING_PATTERN_SOURCE };
}

function nullableRevisionDef(): Schema {
  return { type: ["string", "null"], pattern: REVISION_STRING_PATTERN_SOURCE };
}

function int32Def(): Schema {
  return { type: "integer", minimum: 0, maximum: INT32_MAX };
}

function nullableInt32Def(): Schema {
  return { type: ["integer", "null"], minimum: 0, maximum: INT32_MAX };
}

function weightDef(): Schema {
  return { type: ["number", "null"], minimum: 0, maximum: WEIGHT_MAXIMUM };
}

function errorDef(): Schema {
  return {
    type: "object",
    additionalProperties: false,
    required: ["code", "retryable"],
    properties: {
      code: { type: "string", minLength: 1 },
      retryable: { type: "boolean" },
      message: { type: "string" },
      backendErrorCode: { type: "string", minLength: 1 },
      retryAfterSeconds: { type: "integer", minimum: 1 },
      operationId: uuidDef(),
      routineId: uuidDef(),
      lastConfirmedStep: { type: "string", enum: ["none", "draft", "populate", "save"] },
      outcomeUnknown: { type: "boolean" },
    },
  };
}

function receiptDef(): Schema {
  return {
    type: "object",
    additionalProperties: false,
    required: ["operationId", "routineId", "status"],
    properties: {
      operationId: uuidDef(),
      routineId: uuidDef(),
      status: { const: "saved" },
    },
  };
}

function muscleRefDef(): Schema {
  return {
    type: "object",
    required: ["id", "name", "type"],
    properties: {
      id: uuidDef(),
      name: { type: "string" },
      type: { type: "string", enum: ["primary", "secondary", "tertiary"] },
    },
  };
}

function equipmentRefDef(): Schema {
  return {
    type: "object",
    required: ["id", "name"],
    properties: {
      id: uuidDef(),
      name: { type: "string" },
      numItems: nullableInt32Def(),
    },
  };
}

function exerciseDef(): Schema {
  return {
    type: "object",
    required: ["id", "name", "type", "isUserCreated", "muscleGroups", "equipment"],
    properties: {
      id: uuidDef(),
      name: { type: "string" },
      type: { type: "string" },
      category: { type: ["string", "null"] },
      difficultyLevel: { type: ["string", "null"] },
      forceType: { type: ["string", "null"] },
      mechanics: { type: ["string", "null"] },
      instructions: { type: ["array", "null"], items: { type: "string" } },
      isUserCreated: { type: "boolean" },
      revision: nullableRevisionDef(),
      muscleGroups: { type: "array", items: { $ref: "#/$defs/muscleRef" } },
      equipment: { type: "array", items: { $ref: "#/$defs/equipmentRef" } },
    },
    allOf: [
      {
        if: {
          type: "object",
          required: ["isUserCreated"],
          properties: { isUserCreated: { const: true } },
        },
        then: {
          required: ["revision"],
          properties: {
            type: { const: "reps" },
            revision: { $ref: "#/$defs/revisionString" },
            equipment: { type: "array", maxItems: 1 },
            muscleGroups: {
              type: "array",
              items: {
                allOf: [
                  { $ref: "#/$defs/muscleRef" },
                  {
                    type: "object",
                    properties: { type: { enum: ["primary", "secondary"] } },
                  },
                ],
              },
            },
          },
        },
      },
    ],
  };
}

function workoutSummaryDef(): Schema {
  return {
    type: "object",
    required: ["id", "name", "status", "startedAt", "revision"],
    properties: {
      id: uuidDef(),
      name: { type: "string" },
      status: { type: "string", enum: ["active", "finished"] },
      startedAt: { type: "string", format: "date-time" },
      finishedAt: { type: ["string", "null"], format: "date-time" },
      revision: revisionDef(),
      totalVolumeKg: { type: "number" },
    },
  };
}

function workoutSetDef(): Schema {
  return {
    type: "object",
    required: ["id", "position", "isCompleted"],
    properties: {
      id: uuidDef(),
      position: int32Def(),
      repetitions: nullableInt32Def(),
      weightKg: weightDef(),
      isCompleted: { type: "boolean" },
      restSeconds: nullableInt32Def(),
    },
  };
}

function workoutEntryDef(): Schema {
  return {
    type: "object",
    required: [
      "id",
      "exerciseId",
      "position",
      "notes",
      "restDurationSeconds",
      "sets",
      "exerciseName",
    ],
    properties: {
      id: uuidDef(),
      exerciseId: uuidDef(),
      position: int32Def(),
      notes: { type: "string" },
      restDurationSeconds: int32Def(),
      sets: { type: "array", items: { $ref: "#/$defs/workoutSet" } },
      exerciseName: { type: "string" },
    },
  };
}

function workoutDef(): Schema {
  return {
    type: "object",
    required: ["id", "name", "status", "startedAt", "revision", "exercises"],
    properties: {
      id: uuidDef(),
      name: { type: "string" },
      status: { type: "string", enum: ["active", "finished"] },
      startedAt: { type: "string", format: "date-time" },
      finishedAt: { type: ["string", "null"], format: "date-time" },
      revision: revisionDef(),
      totalVolumeKg: { type: "number" },
      exercises: { type: "array", items: { $ref: "#/$defs/workoutEntry" } },
    },
  };
}

function routineSetDef(): Schema {
  return {
    type: "object",
    required: ["id", "position"],
    properties: {
      id: uuidDef(),
      position: int32Def(),
      repetitions: nullableInt32Def(),
      weightKg: weightDef(),
    },
    not: {
      anyOf: [
        { type: "object", required: ["isCompleted"] },
        { type: "object", required: ["restSeconds"] },
      ],
    },
  };
}

function routineEntryDef(): Schema {
  return {
    type: "object",
    required: ["id", "exerciseId", "position", "restDurationSeconds", "sets", "exerciseName"],
    properties: {
      id: uuidDef(),
      exerciseId: uuidDef(),
      position: int32Def(),
      restDurationSeconds: int32Def(),
      sets: { type: "array", items: { $ref: "#/$defs/routineSet" } },
      exerciseName: { type: "string" },
    },
  };
}

function routineDef(): Schema {
  return {
    type: "object",
    required: ["id", "name", "isDraft", "revision", "exercises"],
    properties: {
      id: uuidDef(),
      name: { type: "string" },
      isDraft: { type: "boolean" },
      revision: revisionDef(),
      exercises: { type: "array", items: { $ref: "#/$defs/routineEntry" } },
    },
  };
}

function pageDef(itemSchema: Schema, withCatalogueVersion: boolean): Schema {
  const required = withCatalogueVersion
    ? ["catalogueVersion", "items", "hasMore", "nextPageToken"]
    : ["items", "hasMore", "nextPageToken"];
  const properties: Schema = withCatalogueVersion ? { catalogueVersion: { type: "string" } } : {};
  properties["items"] = { type: "array", items: itemSchema };
  properties["hasMore"] = { type: "boolean" };
  properties["nextPageToken"] = { type: ["string", "null"] };
  return {
    type: "object",
    required,
    properties,
    allOf: [
      {
        if: {
          type: "object",
          required: ["hasMore"],
          properties: { hasMore: { const: true } },
        },
        then: {
          properties: { nextPageToken: { type: "string", minLength: 1 } },
        },
        else: {
          properties: { nextPageToken: { type: "null" } },
        },
      },
    ],
  };
}

function envelopeDef(dataRef: string): Schema {
  return {
    oneOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["ok", "data"],
        properties: { ok: { const: true }, data: { $ref: dataRef } },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["ok", "error"],
        properties: { ok: { const: false }, error: { $ref: "#/$defs/error" } },
      },
    ],
  };
}

function outputSchema(defs: Schema, dataRef: string): Schema {
  return {
    $schema: SCHEMA_ID,
    $defs: { ...defs, error: errorDef(), revisionString: revisionDef() },
    ...envelopeDef(dataRef),
  };
}

function savedRoutineDef(): Schema {
  return {
    allOf: [
      { $ref: "#/$defs/routine" },
      {
        type: "object",
        required: ["isDraft"],
        properties: { isDraft: { const: false } },
      },
    ],
  };
}

function buildOutputSchema(toolName: ToolName): Schema {
  switch (toolName) {
    case "search_exercises":
      return outputSchema(
        {
          exercise: exerciseDef(),
          muscleRef: muscleRefDef(),
          equipmentRef: equipmentRefDef(),
          searchPage: pageDef({ $ref: "#/$defs/exercise" }, true),
        },
        "#/$defs/searchPage",
      );
    case "get_exercise":
      return outputSchema(
        {
          exercise: exerciseDef(),
          muscleRef: muscleRefDef(),
          equipmentRef: equipmentRefDef(),
        },
        "#/$defs/exercise",
      );
    case "list_workouts":
      return outputSchema(
        {
          workoutSummary: workoutSummaryDef(),
          workoutPage: pageDef({ $ref: "#/$defs/workoutSummary" }, false),
        },
        "#/$defs/workoutPage",
      );
    case "get_workout":
      return outputSchema(
        {
          workout: workoutDef(),
          workoutEntry: workoutEntryDef(),
          workoutSet: workoutSetDef(),
        },
        "#/$defs/workout",
      );
    case "list_routines":
      return outputSchema(
        {
          routine: routineDef(),
          routineEntry: routineEntryDef(),
          routineSet: routineSetDef(),
          savedRoutine: savedRoutineDef(),
          routinePage: pageDef({ $ref: "#/$defs/savedRoutine" }, false),
        },
        "#/$defs/routinePage",
      );
    case "get_routine":
      return outputSchema(
        {
          routine: routineDef(),
          routineEntry: routineEntryDef(),
          routineSet: routineSetDef(),
        },
        "#/$defs/routine",
      );
    case "create_routine":
      return outputSchema({ receipt: receiptDef() }, "#/$defs/receipt");
  }
}

export interface ToolSchemas {
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
}

function buildToolSchemas(): Record<ToolName, ToolSchemas> {
  const entries = TOOL_NAMES.map((toolName) => {
    const pair: ToolSchemas = deepFreeze({
      inputSchema: buildInputJsonSchema(toolName),
      outputSchema: buildOutputSchema(toolName),
    });
    return [toolName, pair] as const;
  });
  return Object.fromEntries(entries) as Record<ToolName, ToolSchemas>;
}

/** Fourteen self-contained schemas keyed by the seven frozen tool names. */
export const toolSchemas: Record<ToolName, ToolSchemas> = deepFreeze(buildToolSchemas());

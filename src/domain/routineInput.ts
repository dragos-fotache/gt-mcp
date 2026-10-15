/**
 * Routine-input whitelist projection. Validates complete create arguments
 * plus a strict caller-supplied identity object, checks count and
 * family-distinct identity constraints, and returns a fresh deterministic
 * whitelisted RoutineInput. No IDs are generated, no backend calls happen,
 * and labels/revisions/volume/notes/completion/recorded rest can never leak
 * into the write body. Failures throw invalid_arguments.
 */
import { z } from "zod";
import { sanitizeJsonValue } from "./clone.js";
import { UUID_PATTERN } from "./constants.js";
import { CodecError } from "./errors.js";
import { normalizeIntent } from "./inputs.js";

function invalidArguments(): CodecError {
  return new CodecError("invalid_arguments", "Invalid routine input.");
}

const uuidField = z.string().regex(UUID_PATTERN);

const identityEntrySchema = z.strictObject({
  id: uuidField,
  setIds: z.array(uuidField),
});

const identitySchema = z.strictObject({
  routineId: uuidField,
  exercises: z.array(identityEntrySchema),
});

export interface RoutineInputSet {
  readonly id: string;
  readonly position: number;
  readonly repetitions: number | null;
  readonly weightKg: number | null;
}

export interface RoutineInputEntry {
  readonly id: string;
  readonly exerciseId: string;
  readonly position: number;
  readonly restDurationSeconds: number;
  readonly sets: readonly RoutineInputSet[];
}

export interface RoutineInput {
  readonly id: string;
  readonly name: string;
  readonly isDraft: true;
  readonly exercises: readonly RoutineInputEntry[];
}

/**
 * Build the whitelisted routine write body from validated creation arguments
 * and an exact identity object {routineId, exercises:[{id, setIds:[...]}]}.
 */
export function buildRoutineInput(input: unknown, identities: unknown): RoutineInput {
  input = sanitizeJsonValue(input, "invalid_arguments");
  identities = sanitizeJsonValue(identities, "invalid_arguments");
  const intent = normalizeIntent(input);
  const parsed = identitySchema.safeParse(identities);
  if (!parsed.success) {
    throw invalidArguments();
  }
  const identity = parsed.data;
  if (identity.exercises.length !== intent.exercises.length) {
    throw invalidArguments();
  }
  const seen = new Set<string>([identity.routineId]);
  const entries: RoutineInputEntry[] = intent.exercises.map((entry, entryIndex) => {
    const identityEntry = identity.exercises[entryIndex];
    if (identityEntry === undefined) {
      throw invalidArguments();
    }
    if (identityEntry.setIds.length !== entry.sets.length) {
      throw invalidArguments();
    }
    if (seen.has(identityEntry.id)) {
      throw invalidArguments();
    }
    seen.add(identityEntry.id);
    const sets: RoutineInputSet[] = entry.sets.map((set, setIndex) => {
      const setId = identityEntry.setIds[setIndex];
      if (setId === undefined || seen.has(setId)) {
        throw invalidArguments();
      }
      seen.add(setId);
      return {
        id: setId,
        position: setIndex,
        repetitions: set.repetitions,
        weightKg: set.weightKg,
      };
    });
    return {
      id: identityEntry.id,
      exerciseId: entry.exerciseId,
      position: entryIndex,
      restDurationSeconds: entry.restDurationSeconds,
      sets,
    };
  });
  return {
    id: identity.routineId,
    name: intent.name,
    isDraft: true,
    exercises: entries,
  };
}

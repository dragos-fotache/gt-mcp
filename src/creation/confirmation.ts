import { decodeBackendResponse } from "../domain/index.js";
import type { RoutineInput, RoutineInputEntry, RoutineRecord } from "../domain/index.js";
import type { MutationResult } from "../http/index.js";
import type { CreationStep } from "./types.js";

/** Shared internal comparison for confirmed mutation and advisory baseline. */
export function sameDomain(
  actual: RoutineRecord,
  expected: Pick<RoutineInput, "name" | "exercises">,
): boolean {
  if (actual.name !== expected.name || actual.exercises.length !== expected.exercises.length) {
    return false;
  }
  return expected.exercises.every((entry: RoutineInputEntry, index) => {
    const received = actual.exercises[index];
    return (
      received !== undefined &&
      received.id === entry.id &&
      received.exerciseId === entry.exerciseId &&
      received.position === entry.position &&
      received.restDurationSeconds === entry.restDurationSeconds &&
      received.sets.length === entry.sets.length &&
      entry.sets.every((set, setIndex) => {
        const receivedSet = received.sets[setIndex];
        return (
          receivedSet !== undefined &&
          receivedSet.id === set.id &&
          receivedSet.position === set.position &&
          (receivedSet.repetitions ?? null) === set.repetitions &&
          (receivedSet.weightKg ?? null) === set.weightKg
        );
      })
    );
  });
}

/** Lossless confirmation from the actual response, not transport data/status alone. */
export function evaluateStepConfirmation(
  step: CreationStep,
  expected: RoutineInput,
  resourceKey: string,
  result: MutationResult,
): "confirmed" | "uncertain" | "conflict" {
  try {
    const labels = { draft: "create_draft", populate: "populate_draft", save: "save_routine" };
    if (
      result.status !== (step === "draft" ? 201 : 200) ||
      result.routeLabel !== labels[step] ||
      result.resourceKey !== resourceKey ||
      result.dispatched !== true ||
      !(result.rawBodyBytes instanceof Uint8Array)
    )
      return "uncertain";
    const raw = result.rawBodyBytes;
    if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) return "uncertain";
    const actual = decodeBackendResponse(
      "get_routine",
      new TextDecoder("utf-8", { fatal: true }).decode(raw),
      expected.id,
    );
    if (actual.isDraft !== (step !== "save")) return "uncertain";
    if (step === "draft")
      return actual.name === "" && actual.exercises.length === 0 ? "confirmed" : "uncertain";
    if (sameDomain(actual, expected)) return "confirmed";
    return step === "save" ? "conflict" : "uncertain";
  } catch {
    return "uncertain";
  }
}

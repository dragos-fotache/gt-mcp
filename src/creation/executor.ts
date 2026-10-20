import type { StorageBinding } from "../storage/index.js";
import type { CreationServiceSession } from "./types.js";
import { randomUUID } from "node:crypto";
import { buildRoutineInput, makeToolResult, parseArguments } from "../domain/index.js";
import { DEFAULT_TRANSPORT_BUDGETS, isTransportError } from "../http/index.js";
import {
  captureBinding,
  captureMethod,
  checkSignal,
  CreationFault,
  equalBinding,
  fields,
  invalid,
} from "./boundary.js";
import { evaluateStepConfirmation } from "./confirmation.js";
import { classifyCreationFailure } from "./failure.js";
import type {
  CreationContext,
  CreationOutcome,
  CreationService,
  CreationServiceOptions,
  CreationStep,
} from "./types.js";

/** Inert factory; all request identities live only inside one invocation. */
export function createCreationExecutor(options: CreationServiceOptions): CreationService {
  const data = fields(options, ["session", "writesEnabled", "maxRequestBytes"]);
  const session = data["session"] as CreationServiceSession;
  if (typeof data["writesEnabled"] !== "boolean") return invalid();
  const enabled = data["writesEnabled"] === true;
  const maximum = data["maxRequestBytes"] ?? DEFAULT_TRANSPORT_BUDGETS.maxRequestBytes;
  if (typeof maximum !== "number" || !Number.isSafeInteger(maximum) || maximum < 1)
    return invalid();
  const initial = captureBinding(session.binding);
  const visible = captureMethod(session, "getExercise");
  const methods = {
    draft: captureMethod(session, "createDraft"),
    populate: captureMethod(session, "populateDraft"),
    save: captureMethod(session, "saveRoutine"),
  };
  return Object.freeze({
    async create(
      binding: StorageBinding,
      input: unknown,
      signal: AbortSignal,
    ): Promise<CreationOutcome> {
      let context: CreationContext | undefined;
      let current = false;
      const ready = (): void => {
        current =
          equalBinding(captureBinding(binding), initial) &&
          equalBinding(captureBinding(session.binding), initial);
        if (!current) throw new CreationFault("operation_interrupted");
        checkSignal(signal);
        if (!enabled) throw new CreationFault("configuration_required");
      };
      try {
        const caller = captureBinding(binding);
        const args = parseArguments("create_routine", input);
        ready();
        for (const exerciseId of new Set(args.exercises.map((entry) => entry.exerciseId))) {
          try {
            await visible(caller, exerciseId, signal);
          } catch (error) {
            if (isTransportError(error) && error.code === "not_found")
              throw new CreationFault("invalid_reference");
            throw error;
          }
          ready();
        }
        const allocated = new Set<string>();
        const allocate = (): string => {
          const id = randomUUID();
          if (allocated.has(id)) throw new CreationFault("internal_error");
          allocated.add(id);
          return id;
        };
        const routineId = allocate();
        const expected = buildRoutineInput(args, {
          routineId,
          exercises: args.exercises.map((entry) => ({
            id: allocate(),
            setIds: entry.sets.map(() => allocate()),
          })),
        });
        const steps: CreationStep[] = ["draft", "populate", "save"];
        const bodies = [
          JSON.stringify({ id: routineId }),
          JSON.stringify(expected),
          JSON.stringify({ name: args.name }),
        ].map((body) => new TextEncoder().encode(body));
        if (bodies.some((body) => body.byteLength > maximum))
          throw new CreationFault("request_too_large");
        const keys = steps.map(() => allocate());
        let last: CreationContext["lastConfirmedStep"] = "none";
        for (const [index, step] of steps.entries()) {
          ready();
          const body = bodies[index],
            key = keys[index];
          if (!body || !key) throw new CreationFault("internal_error");
          context = { routineId, lastConfirmedStep: last, outcomeUnknown: true };
          const result = await methods[step](caller, routineId, body, key, signal);
          // Retain validated facts before cancellation/result-delivery checks.
          const decision = evaluateStepConfirmation(step, expected, key, result);
          if (decision === "uncertain") throw new CreationFault("internal_error");
          last = step;
          context = { routineId, lastConfirmedStep: last, outcomeUnknown: false };
          if (decision === "conflict") throw new CreationFault("concurrent_modification");
          ready();
        }
        const result = { ok: true as const, data: { routineId, status: "saved" as const } };
        makeToolResult("create_routine", result);
        return result;
      } catch (error) {
        try {
          current =
            equalBinding(captureBinding(binding), initial) &&
            equalBinding(captureBinding(session.binding), initial);
        } catch {
          current = false;
        }
        return {
          ok: false,
          error: classifyCreationFailure(
            current ? error : new CreationFault("operation_interrupted"),
            current ? context : undefined,
          ),
        };
      }
    },
  });
}

// Shared catalogue mapping: membership key includes muscle role. Custom rules
// remain narrower. Synthetic identities; literal independent expected outcomes.
import { describe, it } from "vitest";
import { CodecError, decodeBackendResponse } from "../../dist/domain/index.js";
import { check } from "./helpers.mjs";

const muscle = "11111111-1111-4111-8111-111111111111";
function wire(roles, custom = false) {
  return JSON.stringify({
    id: "22222222-2222-4222-8222-222222222222",
    name: "Synthetic role fixture",
    type: "reps",
    isUserCreated: custom,
    ...(custom ? { revision: 1 } : {}),
    muscleGroups: roles.map((type) => ({ id: muscle, name: "Synthetic muscle", type })),
    equipment: [],
  });
}

describe("T16 canonical catalogue muscle membership", () => {
  it("preserves the same bundled muscle in distinct roles and emits canonical role order", () => {
    const decoded = decodeBackendResponse("get_exercise", wire(["secondary", "primary"]));
    check(
      decoded.muscleGroups.length === 2 &&
        decoded.muscleGroups.every((group) => group.id === muscle) &&
        decoded.muscleGroups[0].type === "primary" &&
        decoded.muscleGroups[1].type === "secondary",
      "Valid bundled role membership was rejected or collapsed",
    );
  });
  for (const [label, body] of [
    ["duplicate same-role bundled membership", wire(["primary", "primary"])],
    ["overlapping custom primary/secondary", wire(["primary", "secondary"], true)],
  ]) {
    it(`still rejects ${label}`, () => {
      let rejected = false;
      try {
        decodeBackendResponse("get_exercise", body);
      } catch (error) {
        rejected = error instanceof CodecError && error.code === "invalid_backend_response";
      }
      check(rejected, "Invalid relationship membership was accepted");
    });
  }
});

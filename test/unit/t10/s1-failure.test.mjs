import { describe, it, expect } from "vitest";
import { classifyCreationFailure } from "../../../dist/creation/failure.js";
import { CreationFault } from "../../../dist/creation/boundary.js";
import { uuid } from "./helpers.mjs";
describe("T21 safe failure context", () => {
  it("never makes unknown native failures retryable or copies messages", () => {
    expect(
      classifyCreationFailure(new Error("synthetic private body"), {
        routineId: uuid(10),
        lastConfirmedStep: "draft",
        outcomeUnknown: true,
      }),
    ).toEqual({
      code: "internal_error",
      retryable: false,
      routineId: uuid(10),
      lastConfirmedStep: "draft",
      outcomeUnknown: true,
    });
  });
  it("keeps known local errors without inventing creation context", () => {
    expect(classifyCreationFailure(new CreationFault("request_too_large"))).toEqual({
      code: "request_too_large",
      retryable: false,
    });
  });
});

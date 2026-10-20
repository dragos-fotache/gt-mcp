import { describe, it, expect } from "vitest";
import { evaluateStepConfirmation } from "../../../dist/creation/confirmation.js";
import { uuid, raw } from "./helpers.mjs";
const expected = { id: uuid(10), name: "Synthetic", isDraft: true, exercises: [] };
function response(overrides = {}) {
  return {
    status: 200,
    routeLabel: "save_routine",
    resourceKey: uuid(20),
    dispatched: true,
    rawBodyBytes: raw({ ...expected, isDraft: false }),
    ...overrides,
  };
}
describe("T21 invocation response confirmation", () => {
  it("confirms exact saved content from raw bytes with lossless revision", () => {
    expect(evaluateStepConfirmation("save", expected, uuid(20), response())).toBe("confirmed");
  });
  it.each([
    { status: 201 },
    { resourceKey: uuid(21) },
    { rawBodyBytes: Buffer.from("{}") },
    { rawBodyBytes: raw({ ...expected, id: uuid(11), isDraft: false }) },
    {
      rawBodyBytes: Buffer.from(
        raw({ ...expected, isDraft: false })
          .toString()
          .replace("9007199254740993", "9223372036854775808"),
      ),
    },
  ])("never confirms malformed/wrong-target/identity success %o", (override) => {
    expect(evaluateStepConfirmation("save", expected, uuid(20), response(override))).toBe(
      "uncertain",
    );
  });
  it("reports a confirmed saved content conflict", () => {
    expect(
      evaluateStepConfirmation(
        "save",
        expected,
        uuid(20),
        response({ rawBodyBytes: raw({ ...expected, name: "Changed", isDraft: false }) }),
      ),
    ).toBe("conflict");
  });
});

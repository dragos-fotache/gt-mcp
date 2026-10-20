import { describe, it, expect } from "vitest";
import { createCreationService } from "../../../dist/creation/index.js";
import { args, binding, signal, sessionFixture } from "../t10/helpers.mjs";
describe("T21 no retained creation outcome", () => {
  it("reconstructing the service never replays a previous saved result", async () => {
    const f = sessionFixture();
    const first = await createCreationService({ session: f.session, writesEnabled: true }).create(
      binding,
      args(),
      signal(),
    );
    const second = await createCreationService({ session: f.session, writesEnabled: true }).create(
      binding,
      args(),
      signal(),
    );
    expect(first.ok && second.ok).toBe(true);
    expect(first.data.routineId).not.toBe(second.data.routineId);
    expect(f.mutations).toHaveLength(6);
  });
});

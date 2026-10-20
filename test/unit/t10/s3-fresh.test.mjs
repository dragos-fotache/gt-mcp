import { describe, it, expect } from "vitest";
import { createCreationService } from "../../../dist/creation/index.js";
import { args, binding, signal, sessionFixture } from "./helpers.mjs";
describe("T21 fresh domain projection", () => {
  it("preserves defaults, empty sets, repeated references and family identity", async () => {
    const f = sessionFixture();
    await createCreationService({ session: f.session, writesEnabled: true }).create(
      binding,
      args(),
      signal(),
    );
    expect(f.mutations.map((r) => r.step)).toEqual(["draft", "populate", "save"]);
    const body = JSON.parse(f.mutations[1].body);
    expect(body.name).toBe("Synthetic routine");
    expect(body.isDraft).toBe(true);
    expect(
      body.exercises.map((e) => [
        e.position,
        e.restDurationSeconds,
        e.sets.map((s) => [s.position, s.repetitions, s.weightKg]),
      ]),
    ).toEqual([
      [0, 30, [[0, null, null]]],
      [1, 30, []],
    ]);
    const ids = [body.id, ...body.exercises.flatMap((e) => [e.id, ...e.sets.map((s) => s.id)])];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

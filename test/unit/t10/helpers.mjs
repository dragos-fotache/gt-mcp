/* global AbortController */
// Synthetic contract fixture; no credentials, network or persistent creation state.
export const uuid = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const binding = {
  origin: "https://synthetic.example.invalid",
  accountUuid: uuid(1),
  profileGenerationId: uuid(2),
  sessionGeneration: 0,
};
export const args = () => ({
  name: "Synthetic routine",
  exercises: [
    { exerciseId: uuid(4), sets: [{}] },
    { exerciseId: uuid(4), sets: [] },
  ],
});
export const signal = () => new AbortController().signal;
export function raw(record) {
  return Buffer.from(
    JSON.stringify({ ...record, revision: "WIRE" }).replace('"WIRE"', "9007199254740993"),
  );
}
export function sessionFixture(hook) {
  const mutations = [],
    reads = [],
    routines = new Map();
  const session = {
    binding: { ...binding },
    async getExercise(_b, id) {
      reads.push(id);
      return { data: { id } };
    },
  };
  for (const [step, method, label] of [
    ["draft", "createDraft", "create_draft"],
    ["populate", "populateDraft", "populate_draft"],
    ["save", "saveRoutine", "save_routine"],
  ]) {
    session[method] = async (_b, id, body, key, s) => {
      const request = { step, id, body: Buffer.from(body), key, signal: s };
      mutations.push(request);
      const custom = await hook?.(request, session);
      if (custom) return custom;
      const input = JSON.parse(Buffer.from(body).toString("utf8"));
      const record =
        step === "draft"
          ? { id, name: "", isDraft: true, exercises: [] }
          : step === "populate"
            ? {
                ...input,
                exercises: input.exercises.map((e) => ({
                  ...e,
                  exerciseName: "Synthetic exercise",
                })),
              }
            : { ...routines.get(id), name: input.name, isDraft: false };
      routines.set(id, record);
      return {
        status: step === "draft" ? 201 : 200,
        routeLabel: label,
        resourceKey: key,
        dispatched: true,
        rawBodyBytes: raw(record),
        data: null,
      };
    };
  }
  return { session, mutations, reads, routines };
}

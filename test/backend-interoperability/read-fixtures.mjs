// Small actual-HTTP fixtures for read-only boundary checks; no domain simulation.
import { randomUUID } from "node:crypto";
import { check } from "./helpers.mjs";

export async function routine(f, { owner = f.grant, saved = true } = {}) {
  const id = randomUUID();
  const draft = await f.request("POST", "/v1/routines", { id }, owner);
  check(draft.status === 201, "Read fixture draft creation failed");
  if (!saved) return draft.value;
  const populated = await f.request(
    "PUT",
    `/v1/routines/${id}`,
    {
      id,
      name: "T16 read routine",
      isDraft: true,
      exercises: [
        {
          id: randomUUID(),
          exerciseId: owner === f.grant ? f.customs[0] : f.foreignId,
          position: 0,
          restDurationSeconds: 30,
          sets: [{ id: randomUUID(), position: 0, repetitions: null, weightKg: null }],
        },
      ],
    },
    owner,
  );
  check(populated.status === 200, "Read fixture populate failed");
  const result = await f.request(
    "POST",
    `/v1/routines/${id}/save`,
    { name: "T16 read routine" },
    owner,
  );
  check(result.status === 200, "Read fixture save failed");
  return result.value;
}

export async function workout(
  f,
  { owner = f.grant, finished = true, startedAt = "2026-01-05T18:00:00Z" } = {},
) {
  const id = randomUUID(),
    name = "T16 read workout";
  const started = await f.request("POST", "/v1/workouts", { id, name, startedAt }, owner);
  check(started.status === 201, "Read fixture workout start failed");
  if (!finished) return started.value;
  const populated = await f.request(
    "PUT",
    `/v1/workouts/${id}`,
    {
      id,
      name,
      status: "active",
      startedAt,
      exercises: [
        {
          id: randomUUID(),
          exerciseId: owner === f.grant ? f.customs[0] : f.foreignId,
          position: 0,
          notes: "",
          restDurationSeconds: 30,
          sets: [
            {
              id: randomUUID(),
              position: 0,
              repetitions: 8,
              weightKg: 10,
              isCompleted: true,
              restSeconds: 0,
            },
          ],
        },
      ],
    },
    owner,
  );
  check(populated.status === 200, "Read fixture workout populate failed");
  const result = await f.request(
    "POST",
    `/v1/workouts/${id}/finish`,
    {
      finishedAt: new Date(Date.parse(startedAt) + 3600000).toISOString(),
    },
    owner,
  );
  check(result.status === 200, "Read fixture workout finish failed");
  return result.value;
}

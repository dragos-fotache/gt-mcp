/* global AbortController */
// Fixed process boundary around the public authenticated draft call. Real IO;
// no production checkpoint hook or journal, and no credential commit in flight.
import fs from "node:fs";
import { openProfile } from "../../dist/storage/index.js";
import { openLifecycleSessionState } from "../../dist/auth/index.js";
import { createCreationService } from "../../dist/creation/index.js";

let owner, auth;
try {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  const input = JSON.parse(text);
  if (!["before-dispatch", "after-response"].includes(input.phase))
    throw new Error("Invalid checkpoint");
  owner = await openProfile(input.location);
  auth = await openLifecycleSessionState({
    profile: owner,
    transportConfig: {
      origin: owner.binding.origin,
      testCaPem: fs.readFileSync(process.env.GT_S1_FIXTURE_CERT_FILE),
    },
  });
  async function stop() {
    auth.invalidate();
    await owner.close();
    fs.writeSync(1, "creation-checkpoint");
    process.exit(73);
  }
  const session = {
    get binding() {
      return auth.binding;
    },
    getExercise: (...args) => auth.getExercise(...args),
    async createDraft(...args) {
      if (input.phase === "before-dispatch") await stop();
      const result = await auth.createDraft(...args);
      await stop();
      return result;
    },
    populateDraft: (...args) => auth.populateDraft(...args),
    saveRoutine: (...args) => auth.saveRoutine(...args),
  };
  const service = createCreationService({ session, writesEnabled: true });
  const execute = new Promise((resolve, reject) => {
    process.once("message", (message) =>
      message === "execute" ? resolve() : reject(new Error("Checkpoint command rejected")),
    );
  });
  process.send({ kind: "ready" });
  await execute;
  await service.create(owner.binding, input.intent, new AbortController().signal);
  throw new Error("Expected checkpoint was not reached");
} catch {
  fs.writeSync(2, "Isolated checkpoint child failed.");
  process.exitCode = 1;
} finally {
  auth?.invalidate();
  await owner?.close();
  if (process.connected) process.disconnect();
}

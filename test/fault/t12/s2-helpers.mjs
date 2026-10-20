import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "../../../dist/storage/credential/client.js";
import { SecretMasterKey } from "../../../dist/storage/keyring.js";
import { assertBusAddress } from "../../../dist/storage/validate.js";
export const key = (f) =>
  new SecretMasterKey(
    assertBusAddress(f.storage.secretServiceBusAddress).socketPath,
    f.binding.profileGenerationId,
  );
export async function ownerAt(f, point, action = "kill-holder") {
  const control = path.join(f.dir, "single-record-fault.json");
  fs.writeFileSync(
    control,
    JSON.stringify({ point, action: action === "kill-holder" ? "kill" : "throw" }),
    { mode: 0o600 },
  );
  process.env.T21_TEST_CONTROL = control;
  try {
    return await launch(
      { ...f.storage, origin: f.origin },
      "open",
      fileURLToPath(new URL("../t21/worker.mjs", import.meta.url)),
    );
  } finally {
    delete process.env.T21_TEST_CONTROL;
  }
}

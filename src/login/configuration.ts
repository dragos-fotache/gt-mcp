import { assertFileSeparation, validateConfigRecord } from "../runtime/config.js";
import type { ValidatedConfig } from "../runtime/config.js";
import { loadProtectedFile, parseStrictMetadataJson } from "../runtime/files.js";
import { LoginError } from "./errors.js";
export async function loadLoginConfiguration(configPath: string): Promise<ValidatedConfig> {
  try {
    const loaded = await loadProtectedFile(configPath, 65536);
    if (loaded.status !== "ok") throw new LoginError("configuration_required");
    const config = validateConfigRecord(parseStrictMetadataJson(loaded.bytes));
    assertFileSeparation(config, configPath);
    return Object.freeze(config);
  } catch {
    throw new LoginError("configuration_required");
  }
}

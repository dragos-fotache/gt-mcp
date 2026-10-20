import { createCreationExecutor } from "./executor.js";
import type { CreationService, CreationServiceOptions } from "./types.js";
/** No repository, stored outcome, continuation or background lifecycle. */
export function createCreationService(options: CreationServiceOptions): CreationService {
  return createCreationExecutor(options);
}

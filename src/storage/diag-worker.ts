/** Separate diagnostic executable; issued synthetic fixture only, never ambient providers. */
import path from "node:path";
import { credentialHandlers } from "./credential/worker.js";
import { FileFaultProbe, SyntheticMasterKey, validateTicket } from "./diag-support.js";
import { serveWorker, type WorkerHandler } from "./ipc.js";
import { StorageError } from "./errors.js";
import { captureShape, requiredField } from "./validate.js";
import { location } from "./credential/validate.js";

let handlers: Record<string, WorkerHandler | undefined> | null = null;
const wrapped: Record<string, WorkerHandler | undefined> = {};
for (const op of [
  "provision",
  "open",
  "readVault",
  "commit",
  "bind",
  "advance",
  "removeProfile",
  "close",
]) {
  wrapped[op] = async (params) => {
    if (handlers === null) {
      if (op !== "provision" && op !== "open") throw new StorageError("invalid_argument");
      const fields = captureShape(params, ["location", "ownership", "deadlineMs", "ticket"]);
      const ticket = captureShape(requiredField(fields, "ticket"), ["root", "capability"]);
      const root = requiredField(ticket, "root"),
        capability = requiredField(ticket, "capability");
      if (typeof root !== "string" || typeof capability !== "string")
        throw new StorageError("invalid_argument");
      validateTicket(root, capability);
      const checked = location(requiredField(fields, "location"));
      if (checked.profileRoot !== path.join(root, "profile"))
        throw new StorageError("invalid_argument");
      const faults = new FileFaultProbe(root);
      handlers = credentialHandlers(
        (point) => faults.probe(point),
        () => new SyntheticMasterKey(root),
      );
      params = {
        location: checked,
        ownership: requiredField(fields, "ownership"),
        deadlineMs: requiredField(fields, "deadlineMs"),
      };
    }
    const handler = handlers[op];
    if (handler === undefined) throw new StorageError("invalid_argument");
    return handler(params);
  };
}
if (import.meta.main === true) serveWorker(wrapped);

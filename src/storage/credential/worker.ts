/** Production holder: fixed real provider; no env/filesystem/provider test bypass. */
import { serveWorker, type WorkerHandler } from "../ipc.js";
import type { MasterKeyAccess } from "../keyring.js";
import { SecretMasterKey } from "../keyring.js";
import { StorageError } from "../errors.js";
import {
  assertBusAddress,
  assertByteView,
  assertGeneration,
  assertUuid,
  captureShape,
  requiredField,
  copyBytes,
} from "../validate.js";
import { CredentialEngine } from "./engine.js";
import { noProbe, type Ownership, type Identity, type Probe } from "./files.js";
import { location } from "./validate.js";

function identity(value: unknown): Identity {
  const entries = captureShape(value, ["dev", "ino"]);
  const dev = requiredField(entries, "dev");
  const ino = requiredField(entries, "ino");
  if (
    typeof dev !== "string" ||
    typeof ino !== "string" ||
    !/^(0|[1-9][0-9]*)$/.test(dev) ||
    !/^(0|[1-9][0-9]*)$/.test(ino)
  )
    throw new StorageError("invalid_argument");
  return { dev, ino };
}
function ownership(value: unknown): Ownership {
  const entries = captureShape(value, ["root", "lock"]);
  return {
    root: identity(requiredField(entries, "root")),
    lock: identity(requiredField(entries, "lock")),
  };
}
function deadline(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= Date.now())
    throw new StorageError("io_failure");
  // Preserve a reply margin inside the parent whole-call deadline.
  return value - Math.min(100, Math.floor((value - Date.now()) / 10));
}

/** Internal handler construction. Production main fixes the real provider; only the separate diagnostic executable supplies synthetic keys. */
export function credentialHandlers(
  probe: Probe = noProbe,
  keyProvider: (socket: string, id: string) => MasterKeyAccess = (socket, id) =>
    new SecretMasterKey(socket, id),
): Record<string, WorkerHandler | undefined> {
  let engine: CredentialEngine | null = null;
  const start = async (
    params: Record<string, unknown>,
    action: "provision" | "open" | "remove",
  ): Promise<unknown> => {
    if (engine !== null) throw new StorageError("invalid_argument");
    const entries = captureShape(params, ["location", "ownership", "deadlineMs"]);
    const checked = location(requiredField(entries, "location"));
    const socket = assertBusAddress(checked.secretServiceBusAddress).socketPath;
    engine = new CredentialEngine({
      root: checked.profileRoot,
      origin: checked.origin,
      ownership: ownership(requiredField(entries, "ownership")),
      keyAccess: (id) => keyProvider(socket, id),
      probe,
    });
    const until = deadline(requiredField(entries, "deadlineMs"));
    if (action === "remove") {
      await engine.remove(until);
      return null;
    }
    return {
      binding: await (action === "provision" ? engine.provision(until) : engine.open(until)),
    };
  };
  const call = async (
    params: Record<string, unknown>,
    action: "read" | "commit" | "bind" | "advance" | "remove",
  ): Promise<unknown> => {
    if (engine === null) {
      if (action === "remove") return start(params, "remove");
      throw new StorageError("not_owner");
    }
    const entries = captureShape(params, [
      "generation",
      "deadlineMs",
      ...(action === "commit" || action === "bind" || action === "advance" ? ["vaultBytes"] : []),
      ...(action === "bind" ? ["accountUuid"] : []),
    ]);
    const generation = assertGeneration(requiredField(entries, "generation"));
    const until = deadline(requiredField(entries, "deadlineMs"));
    if (action === "read") return engine.read(generation, until);
    if (action === "remove") {
      await engine.remove(until, generation);
      return null;
    }
    const vault = copyBytes(assertByteView(requiredField(entries, "vaultBytes"), true));
    try {
      const next = await engine.update(
        generation,
        vault,
        until,
        action === "commit" ? undefined : action,
        action === "bind" ? assertUuid(requiredField(entries, "accountUuid")) : undefined,
      );
      return action === "commit" ? null : next;
    } finally {
      vault.fill(0);
    }
  };
  return {
    provision: (params) => start(params, "provision"),
    open: (params) => start(params, "open"),
    readVault: (params) => call(params, "read"),
    commit: (params) => call(params, "commit"),
    bind: (params) => call(params, "bind"),
    advance: (params) => call(params, "advance"),
    removeProfile: (params) => call(params, "remove"),
    close: async () => {
      engine?.close();
      return null;
    },
  };
}

if (import.meta.main === true) serveWorker(credentialHandlers());

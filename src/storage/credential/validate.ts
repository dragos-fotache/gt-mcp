import path from "node:path";
import { StorageError } from "../errors.js";
import {
  assertBusAddress,
  assertOrigin,
  assertTimeoutMs,
  assertByteView,
  captureShape,
  requiredField,
  optionalField,
  copyBytes,
} from "../validate.js";
import type { ProfileLocation } from "./types.js";

export function location(value: unknown): Required<ProfileLocation> {
  const entries = captureShape(value, [
    "profileRoot",
    "secretServiceBusAddress",
    "timeoutMs",
    "origin",
  ]);
  const root = requiredField(entries, "profileRoot");
  if (
    typeof root !== "string" ||
    !path.isAbsolute(root) ||
    root.includes("\0") ||
    path.resolve(root) === "/"
  )
    throw new StorageError("invalid_argument");
  return {
    profileRoot: path.resolve(root),
    origin: assertOrigin(requiredField(entries, "origin")),
    secretServiceBusAddress: assertBusAddress(requiredField(entries, "secretServiceBusAddress"))
      .address,
    timeoutMs: assertTimeoutMs(optionalField(entries, "timeoutMs")),
  };
}

export function vaultUpdate(value: unknown): Uint8Array {
  const entries = captureShape(value, ["vaultBytes"]);
  return copyBytes(assertByteView(requiredField(entries, "vaultBytes"), true));
}

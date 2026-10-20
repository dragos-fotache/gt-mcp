import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { StorageError } from "../errors.js";
import { readWholeFile, fsyncDirectory } from "../fsutil.js";
import type { MasterKeyAccess } from "../keyring.js";
import { assertBinding, assertUuid } from "../validate.js";
import { MAX_RECORD_BYTES, openRecord, parseHeader, sealRecord } from "./format.js";
import {
  checkOwnership,
  isTemp,
  knownFiles,
  noProbe,
  replace,
  type Ownership,
  type Probe,
} from "./files.js";
import type { StorageBinding } from "./types.js";

export interface EngineOptions {
  readonly root: string;
  readonly origin: string;
  readonly ownership: Ownership;
  readonly keyAccess: (id: string) => MasterKeyAccess;
  readonly probe?: Probe;
}

export class CredentialEngine {
  private binding: StorageBinding | null = null;
  private master: Uint8Array | null = null;
  private fenced = false;
  private removed = false;
  private readonly probe: Probe;
  constructor(private readonly options: EngineOptions) {
    this.probe = options.probe ?? noProbe;
  }

  private owned(deadline: number): void {
    if (this.fenced) throw new StorageError("commit_ambiguous");
    if (this.removed) throw new StorageError("not_owner");
    if (Date.now() >= deadline) throw new StorageError("io_failure");
    try {
      checkOwnership(this.options.root, this.options.ownership);
    } catch (error) {
      this.fenced = true;
      throw error;
    }
    knownFiles(this.options.root);
  }

  private async load(deadline: number): Promise<{ binding: StorageBinding; vault: Uint8Array }> {
    this.owned(deadline);
    const header = parseHeader(
      readWholeFile(
        path.join(this.options.root, "credentials.enc"),
        MAX_RECORD_BYTES,
        "store_missing",
      ),
    );
    const fresh = await this.options.keyAccess(header.profileGenerationId).loadMaster(deadline);
    try {
      if (
        this.master !== null &&
        (fresh.byteLength !== this.master.byteLength || !crypto.timingSafeEqual(fresh, this.master))
      )
        throw new StorageError("provider_failure");
      const result = openRecord(header, fresh, this.options.origin);
      if (this.binding !== null) {
        const current = this.binding;
        if (
          result.binding.profileGenerationId !== current.profileGenerationId ||
          result.binding.accountUuid !== current.accountUuid
        ) {
          result.vault.fill(0);
          throw new StorageError("binding_mismatch");
        }
        if (result.binding.sessionGeneration !== current.sessionGeneration) {
          result.vault.fill(0);
          throw new StorageError("generation_mismatch");
        }
      }
      this.master?.fill(0);
      this.master = new Uint8Array(fresh);
      return result;
    } finally {
      fresh.fill(0);
    }
  }

  async provision(deadline: number): Promise<StorageBinding> {
    this.owned(deadline);
    if (knownFiles(this.options.root).some((n) => n !== "owner.lock"))
      throw new StorageError("already_provisioned");
    const binding = assertBinding({
      origin: this.options.origin,
      accountUuid: null,
      sessionGeneration: 0,
      profileGenerationId: crypto.randomUUID(),
    });
    const master = crypto.randomBytes(32);
    try {
      await this.options.keyAccess(binding.profileGenerationId).createMaster(master, deadline);
      this.owned(deadline);
      await this.install(master, binding, new Uint8Array());
      this.master = new Uint8Array(master);
      this.binding = binding;
      return binding;
    } finally {
      master.fill(0);
    }
  }

  async open(deadline: number): Promise<StorageBinding> {
    const result = await this.load(deadline);
    result.vault.fill(0);
    this.binding = result.binding;
    return result.binding;
  }

  private capture(generation: number): void {
    if (this.binding === null) throw new StorageError("not_owner");
    if (this.binding.sessionGeneration !== generation)
      throw new StorageError("generation_mismatch");
  }

  async read(generation: number, deadline: number): Promise<Uint8Array> {
    this.capture(generation);
    return (await this.load(deadline)).vault;
  }

  private async install(
    master: Uint8Array,
    binding: StorageBinding,
    vault: Uint8Array,
  ): Promise<void> {
    const bytes = sealRecord(master, binding, vault);
    try {
      await replace(this.options.root, bytes, this.probe);
    } catch (error) {
      if (error instanceof StorageError && error.code === "commit_ambiguous") this.fenced = true;
      throw error;
    }
  }

  async update(
    generation: number,
    vault: Uint8Array,
    deadline: number,
    transition?: "bind" | "advance",
    account?: string,
  ): Promise<StorageBinding> {
    this.capture(generation);
    const loaded = await this.load(deadline);
    loaded.vault.fill(0);
    let binding = loaded.binding;
    if (transition === "bind") {
      const uuid = assertUuid(account);
      if (binding.accountUuid !== null && binding.accountUuid !== uuid)
        throw new StorageError("binding_mismatch");
      if (binding.accountUuid === null)
        binding = assertBinding({ ...binding, accountUuid: uuid, sessionGeneration: 1 });
    } else if (transition === "advance") {
      if (binding.accountUuid === null) throw new StorageError("binding_mismatch");
      if (binding.sessionGeneration === Number.MAX_SAFE_INTEGER)
        throw new StorageError("resource_exhausted");
      binding = assertBinding({ ...binding, sessionGeneration: binding.sessionGeneration + 1 });
    }
    this.owned(deadline);
    await this.install(this.master!, binding, vault);
    this.binding = binding;
    return binding;
  }

  /** Explicit trusted removal also works after an interrupted key-first cleanup. */
  async remove(deadline: number, generation?: number): Promise<void> {
    if (generation !== undefined) this.capture(generation);
    this.owned(deadline);
    const names = knownFiles(this.options.root);
    if (names.includes("credentials.enc")) {
      const header = parseHeader(
        readWholeFile(
          path.join(this.options.root, "credentials.enc"),
          MAX_RECORD_BYTES,
          "store_missing",
        ),
      );
      const access = this.options.keyAccess(header.profileGenerationId);
      let key: Uint8Array | undefined;
      try {
        key = await access.loadMaster(deadline);
      } catch (error) {
        if (!(error instanceof StorageError) || error.code !== "key_not_found") throw error;
      }
      if (key !== undefined) {
        try {
          if (
            this.master !== null &&
            (key.byteLength !== this.master.byteLength || !crypto.timingSafeEqual(key, this.master))
          )
            throw new StorageError("provider_failure");
          const verified = openRecord(header, key, this.options.origin);
          verified.vault.fill(0);
          if (
            this.binding !== null &&
            JSON.stringify(verified.binding) !== JSON.stringify(this.binding)
          )
            throw new StorageError("binding_mismatch");
          if (access.deleteMaster === undefined) throw new StorageError("provider_failure");
          this.owned(deadline);
          await access.deleteMaster(
            crypto.createHash("sha256").update(key).digest("hex"),
            deadline,
          );
        } finally {
          key.fill(0);
        }
      }
      // An absent exact key is sufficient only in this explicit local cleanup API.
      // Ordinary open/read never takes this branch and never creates a new key.
      await this.probe("remove.key.deleted");
    }
    this.owned(deadline);
    try {
      for (const name of knownFiles(this.options.root))
        if (name === "credentials.enc" || isTemp(name))
          fs.unlinkSync(path.join(this.options.root, name));
      fsyncDirectory(this.options.root);
    } catch {
      throw new StorageError("io_failure");
    }
    this.removed = true;
    this.master?.fill(0);
    this.master = null;
  }

  close(): void {
    this.fenced = true;
    this.master?.fill(0);
    this.master = null;
  }
}

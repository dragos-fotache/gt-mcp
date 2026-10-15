/**
 * T04 protected storage — shared persistence engine.
 *
 * One Engine instance serves one holder session (production holder or
 * diagnostic worker; the only difference is the wired MasterKeyAccess,
 * FaultProbe, and filesystem policy). Every protected call revalidates,
 * in order: kernel lease (fdinfo WRITE FLOCK scan), root safety, anchor
 * file structure, key-facility availability/uniqueness with comparison
 * against the held key (no cached fallback), decrypted anchor phase and
 * binding, root/lock commitments, and both store digests. State
 * transitions stage envelopes, durably write PREPARED, rename stores, and
 * durably write COMMITTED; success resolves only after the final anchor
 * directory sync. Any failure once a PREPARED write may have occurred, or
 * after any store rename, fences the session (commit_ambiguous); earlier
 * failures keep their specific codes with the old state usable.
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  anchorAad,
  dataAad,
  deriveDigestKey,
  encodeAnchorRecord,
  hmacIntentDigest,
  nextSeq,
  openEnvelope,
  parseAnchorRecord,
  parseEnvelopeHeader,
  scrubBytes,
  sealEnvelope,
  sha256Hex,
  type AnchorDigests,
  type AnchorRecord,
} from "./format.js";
import {
  assertAllowedFilesystem,
  assertSafeAncestors,
  assertSingleWriteFlockLease,
  durableInstallFile,
  euid,
  fsyncDirectory,
  maxStoreFileBytes,
  readWholeFile,
  statIdentityOfPath,
  sweepTempFiles,
  validateDirStat,
  validateRegularFileStat,
  type FileIdentity,
} from "./fsutil.js";
import { FaultArmed, type FaultProbe } from "./faults.js";
import { StorageError } from "./errors.js";
import type { MasterKeyAccess } from "./keyring.js";
import { MAX_STORE_BYTES } from "./validate.js";
import type { StorageBinding } from "./types.js";

export const VAULT_FILE: string = "vault.bin";
export const OPS_FILE: string = "operations.bin";
export const ANCHOR_FILE: string = "anchor.bin";
export const LOCK_FILE: string = "owner.lock";
export const INCOMPLETE_FILE: string = "INCOMPLETE";

export interface EngineOptions {
  profileRoot: string;
  anchorRoot: string;
  expectedLock: FileIdentity;
  generationId: string;
  keyAccess: MasterKeyAccess;
  faults: FaultProbe;
  allowedFilesystems: readonly string[];
  mintMaster: () => Uint8Array;
}

/**
 * Production master mint: fresh CSPRNG bytes inside the lease holder.
 * Diagnostic workers pass a closure reading the issued fixture key
 * instead, so the issued synthetic.key bytes stay stable for the
 * profile-generation. No mint path ever regenerates a lost/changed key.
 */
export function mintRandomMaster(): Uint8Array {
  return new Uint8Array(crypto.randomBytes(32));
}

interface ValidatedRoots {
  anchorLock: FileIdentity;
}

function checkDeadline(deadlineMs: number): void {
  if (Date.now() >= deadlineMs) {
    throw new StorageError("commit_ambiguous");
  }
}

class InternalDeadline extends Error {
  constructor() {
    super("transition deadline");
    this.name = "InternalDeadline";
  }
}

function checkTransitionDeadline(deadlineMs: number): void {
  if (Date.now() >= deadlineMs) {
    throw new InternalDeadline();
  }
}

/**
 * Internal worker timer margin. Holder-side timers and checks run against
 * the whole-call deadline minus this margin, so a holder diagnosis
 * (notably a connected-provider timeout surfacing as provider_failure) is
 * always delivered strictly before the parent-side deadline can fire and
 * reap the worker. The external single whole-call deadline is unchanged;
 * the margin only spends budget earlier inside it. If load delays the
 * holder past the margin, the parent backstop still fences safely.
 */
const WORKER_TIMER_MARGIN_MS: number = 100;

function workerDeadline(deadlineMs: number): number {
  return deadlineMs - WORKER_TIMER_MARGIN_MS;
}

function existsNoFollow(targetPath: string): boolean {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "ENOENT"
    ) {
      return false;
    }
    throw new StorageError("io_failure");
  }
}

export class StorageEngine {
  private readonly opts: EngineOptions;
  private fenced: boolean;
  private closed: boolean;
  private master: Uint8Array | null;
  private binding: StorageBinding | null;
  private epoch: number;

  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.fenced = false;
    this.closed = false;
    this.master = null;
    this.binding = null;
    this.epoch = 0;
  }

  private ensureUsable(): void {
    if (this.closed) {
      throw new StorageError("not_owner");
    }
    if (this.fenced) {
      throw new StorageError("commit_ambiguous");
    }
  }

  private fence(): void {
    this.fenced = true;
  }

  private checkCapture(captureGeneration: number): void {
    if (this.binding === null || captureGeneration !== this.epoch) {
      throw new StorageError("generation_mismatch");
    }
  }

  private verifyLease(): void {
    try {
      assertSingleWriteFlockLease(this.opts.expectedLock.dev, this.opts.expectedLock.ino);
    } catch {
      this.fence();
      throw new StorageError("commit_ambiguous");
    }
  }

  private validateRoots(): ValidatedRoots {
    const { profileRoot, anchorRoot } = this.opts;
    assertSafeAncestors(profileRoot);
    assertSafeAncestors(anchorRoot);
    assertAllowedFilesystem(profileRoot, this.opts.allowedFilesystems);
    assertAllowedFilesystem(anchorRoot, this.opts.allowedFilesystems);
    let anchorSt: fs.Stats;
    try {
      anchorSt = fs.lstatSync(anchorRoot);
    } catch {
      throw new StorageError("anchor_missing");
    }
    if (anchorSt.isSymbolicLink()) {
      throw new StorageError("io_failure");
    }
    try {
      validateDirStat(anchorSt);
    } catch {
      throw new StorageError("io_failure");
    }
    const lockPath: string = path.join(anchorRoot, LOCK_FILE);
    let lockSt: fs.Stats;
    try {
      lockSt = fs.lstatSync(lockPath);
    } catch {
      throw new StorageError("anchor_missing");
    }
    if (lockSt.isSymbolicLink()) {
      throw new StorageError("io_failure");
    }
    try {
      validateRegularFileStat(lockSt);
    } catch {
      throw new StorageError("io_failure");
    }
    return {
      anchorLock: {
        dev: String(lockSt.dev),
        ino: String(lockSt.ino),
      },
    };
  }

  private rootCommitment(rootPath: string): {
    path: string;
    dev: string;
    ino: string;
  } {
    let st: fs.BigIntStats;
    try {
      st = fs.lstatSync(rootPath, { bigint: true });
    } catch {
      throw new StorageError("io_failure");
    }
    if (st.isSymbolicLink()) {
      throw new StorageError("io_failure");
    }
    try {
      validateDirStat(st);
    } catch {
      throw new StorageError("io_failure");
    }
    return {
      path: rootPath,
      dev: st.dev.toString(10),
      ino: st.ino.toString(10),
    };
  }

  private readAnchorFile(): Buffer {
    return readWholeFile(
      path.join(this.opts.anchorRoot, ANCHOR_FILE),
      maxStoreFileBytes(),
      "anchor_missing",
    );
  }

  private async recheckKey(deadlineMs: number): Promise<Uint8Array> {
    if (this.master === null) {
      throw new StorageError("provider_failure");
    }
    const fresh: Uint8Array = await this.opts.keyAccess.loadMaster(deadlineMs);
    try {
      if (
        fresh.byteLength !== this.master.byteLength ||
        !crypto.timingSafeEqual(fresh, this.master)
      ) {
        throw new StorageError("provider_failure");
      }
      return this.master;
    } finally {
      scrubBytes(fresh);
    }
  }

  private currentBinding(): StorageBinding {
    if (this.binding === null) {
      throw new StorageError("provider_failure");
    }
    return this.binding;
  }

  /**
   * Full per-call revalidation. Returns decrypted anchor plus current
   * store bytes. Fences on lease loss or PREPARED residue.
   */
  private async revalidate(
    deadlineMs: number,
  ): Promise<{ anchor: AnchorRecord; vaultFile: Buffer; opsFile: Buffer }> {
    this.verifyLease();
    const roots: ValidatedRoots = this.validateRoots();
    void roots;
    if (existsNoFollow(path.join(this.opts.anchorRoot, INCOMPLETE_FILE))) {
      this.fence();
      throw new StorageError("incomplete_provision");
    }
    const anchorFile: Buffer = this.readAnchorFile();
    const master: Uint8Array = await this.recheckKey(deadlineMs);
    const anchor: AnchorRecord = this.decryptAnchor(anchorFile, master);
    if (anchor.phase === "PROVISIONING") {
      throw new StorageError("incomplete_provision");
    }
    if (anchor.phase === "PREPARED") {
      this.fence();
      throw new StorageError("commit_ambiguous");
    }
    const session: StorageBinding = this.currentBinding();
    if (
      anchor.binding.origin !== session.origin ||
      anchor.binding.accountUuid !== session.accountUuid ||
      anchor.binding.profileGenerationId !== session.profileGenerationId
    ) {
      throw new StorageError("binding_mismatch");
    }
    this.checkLockCommitment(anchor);
    this.checkRootCommitments(anchor);
    const vaultFile: Buffer = this.readStoreFile(VAULT_FILE);
    const opsFile: Buffer = this.readStoreFile(OPS_FILE);
    // Published data-file order: structural header/length/version gates,
    // then whole-file digest comparison, then expected-family/AAD/tag
    // decryption at use. Unknown families and recognized-unknown versions
    // fail before any digest comparison.
    parseEnvelopeHeader(new Uint8Array(vaultFile));
    parseEnvelopeHeader(new Uint8Array(opsFile));
    this.checkDigests(anchor, vaultFile, opsFile);
    if (anchor.binding.sessionGeneration !== session.sessionGeneration) {
      throw new StorageError("generation_mismatch");
    }
    return { anchor, vaultFile, opsFile };
  }

  private decryptAnchor(anchorFile: Buffer, master: Uint8Array): AnchorRecord {
    const opened: { plaintext: Uint8Array } = openEnvelope(
      "anchor",
      master,
      anchorAad(this.opts.generationId),
      new Uint8Array(anchorFile),
    );
    return parseAnchorRecord(opened.plaintext);
  }

  private checkLockCommitment(anchor: AnchorRecord): void {
    const live: FileIdentity = statIdentityOfPath(
      path.join(this.opts.anchorRoot, LOCK_FILE),
      false,
    );
    if (live.dev !== anchor.lock.dev || live.ino !== anchor.lock.ino) {
      this.fence();
      throw new StorageError("fence_mismatch");
    }
    if (live.dev !== this.opts.expectedLock.dev || live.ino !== this.opts.expectedLock.ino) {
      this.fence();
      throw new StorageError("fence_mismatch");
    }
  }

  private checkRootCommitments(anchor: AnchorRecord): void {
    const profile: { path: string; dev: string; ino: string } = this.rootCommitment(
      this.opts.profileRoot,
    );
    const anchorRoot: { path: string; dev: string; ino: string } = this.rootCommitment(
      this.opts.anchorRoot,
    );
    if (
      profile.path !== anchor.roots.profile.path ||
      profile.dev !== anchor.roots.profile.dev ||
      profile.ino !== anchor.roots.profile.ino ||
      anchorRoot.path !== anchor.roots.anchor.path ||
      anchorRoot.dev !== anchor.roots.anchor.dev ||
      anchorRoot.ino !== anchor.roots.anchor.ino ||
      anchor.roots.euid !== euid()
    ) {
      this.fence();
      throw new StorageError("fence_mismatch");
    }
  }

  private readStoreFile(name: string): Buffer {
    return readWholeFile(
      path.join(this.opts.profileRoot, name),
      maxStoreFileBytes(),
      "store_missing",
    );
  }

  private checkDigests(anchor: AnchorRecord, vaultFile: Buffer, opsFile: Buffer): void {
    if (
      sha256Hex(vaultFile) !== anchor.digests.vault ||
      sha256Hex(opsFile) !== anchor.digests.ops
    ) {
      this.fence();
      throw new StorageError("fence_mismatch");
    }
  }

  private decryptStore(
    family: "vault" | "operations",
    file: Buffer,
    master: Uint8Array,
    binding: StorageBinding,
  ): Uint8Array {
    const opened: { plaintext: Uint8Array } = openEnvelope(
      family,
      master,
      dataAad(binding.origin, binding.accountUuid, binding.profileGenerationId),
      new Uint8Array(file),
      "fence_mismatch",
    );
    return opened.plaintext;
  }

  private async writeAnchorRecord(
    record: AnchorRecord,
    master: Uint8Array,
    generationId: string,
  ): Promise<void> {
    const plaintext: Buffer = encodeAnchorRecord(record);
    const envelope: Buffer = sealEnvelope("anchor", master, plaintext, anchorAad(generationId));
    await durableInstallFile(this.opts.anchorRoot, ANCHOR_FILE, envelope, this.opts.faults);
  }

  private async stageStore(name: string, envelope: Buffer): Promise<string> {
    const { faults } = this.opts;
    const dir: string = this.opts.profileRoot;
    let tempName: string = "";
    let fd: number = -1;
    for (let attempt: number = 0; attempt < 10; attempt += 1) {
      tempName = `.${name}.${process.pid}.${attempt}.${crypto.randomBytes(4).toString("hex")}.tmp`;
      try {
        fd = fs.openSync(
          path.join(dir, tempName),
          fs.constants.O_CREAT |
            fs.constants.O_EXCL |
            fs.constants.O_WRONLY |
            fs.constants.O_NOFOLLOW,
          0o600,
        );
        break;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: unknown }).code === "EEXIST"
        ) {
          continue;
        }
        throw new StorageError("io_failure");
      }
    }
    if (fd < 0) {
      throw new StorageError("io_failure");
    }
    const tempPath: string = path.join(dir, tempName);
    try {
      await faults.probe("fs.write");
      let offset: number = 0;
      const buffer: Buffer = Buffer.from(envelope);
      while (offset < buffer.byteLength) {
        const written: number = fs.writeSync(fd, buffer, offset);
        if (written <= 0) {
          throw new StorageError("io_failure");
        }
        offset += written;
      }
      await faults.probe("fs.fsync.file");
      fs.fsyncSync(fd);
    } catch (error) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best effort.
      }
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Best effort; staged temps are never read as state.
      }
      throw error;
    }
    try {
      fs.closeSync(fd);
    } catch {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Best effort.
      }
      throw new StorageError("io_failure");
    }
    await faults.probe("fs.fsync.directory");
    fsyncDirectory(dir);
    return tempName;
  }

  private async installStaged(
    name: string,
    tempName: string,
    renamedPoint: "commit.vault.renamed" | "commit.operations.renamed",
    syncedPoint: "commit.vault.synced" | "commit.operations.synced",
  ): Promise<void> {
    const { faults } = this.opts;
    const dir: string = this.opts.profileRoot;
    await faults.probe("fs.rename");
    try {
      fs.renameSync(path.join(dir, tempName), path.join(dir, name));
    } catch {
      throw new StorageError("io_failure");
    }
    await faults.probe(renamedPoint);
    await faults.probe("fs.fsync.directory");
    fsyncDirectory(dir);
    await faults.probe(syncedPoint);
  }

  /**
   * Run one atomic transition: stage changed stores, durably write
   * PREPARED, rename stores, durably write COMMITTED. preparedAttempted
   * flips before the PREPARED rename so every later failure fences.
   */
  private async runTransition(args: {
    targetBinding: StorageBinding;
    newVaultEnvelope: Buffer | null;
    newOpsEnvelope: Buffer | null;
    current: { anchor: AnchorRecord; vaultFile: Buffer; opsFile: Buffer };
    master: Uint8Array;
    generationId: string;
    deadlineMs: number;
  }): Promise<void> {
    const { faults } = this.opts;
    let stagedVault: string | null;
    let stagedOps: string | null;
    try {
      checkTransitionDeadline(args.deadlineMs);
      await faults.probe("commit.before.prepare");
      stagedVault =
        args.newVaultEnvelope === null
          ? null
          : await this.stageStore(VAULT_FILE, args.newVaultEnvelope);
      stagedOps =
        args.newOpsEnvelope === null ? null : await this.stageStore(OPS_FILE, args.newOpsEnvelope);
    } catch (error) {
      if (error instanceof FaultArmed || error instanceof InternalDeadline) {
        throw new StorageError("io_failure");
      }
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError("io_failure");
    }
    const targetDigests: AnchorDigests = {
      vault:
        args.newVaultEnvelope === null
          ? args.current.anchor.digests.vault
          : sha256Hex(args.newVaultEnvelope),
      ops:
        args.newOpsEnvelope === null
          ? args.current.anchor.digests.ops
          : sha256Hex(args.newOpsEnvelope),
    };
    const prepared: AnchorRecord = {
      v: 1,
      phase: "PREPARED",
      seq: args.current.anchor.seq,
      binding: args.current.anchor.binding,
      digests: args.current.anchor.digests,
      roots: args.current.anchor.roots,
      lock: args.current.anchor.lock,
      target: {
        seq: nextSeq(args.current.anchor.seq),
        binding: args.targetBinding,
        digests: targetDigests,
      },
    };
    try {
      checkTransitionDeadline(args.deadlineMs);
      await this.writeAnchorRecord(prepared, args.master, args.generationId);
      await faults.probe("commit.anchor.prepared");
      if (stagedVault !== null) {
        await this.installStaged(
          VAULT_FILE,
          stagedVault,
          "commit.vault.renamed",
          "commit.vault.synced",
        );
      }
      if (stagedOps !== null) {
        await this.installStaged(
          OPS_FILE,
          stagedOps,
          "commit.operations.renamed",
          "commit.operations.synced",
        );
      }
      const committed: AnchorRecord = {
        v: 1,
        phase: "COMMITTED",
        seq: nextSeq(args.current.anchor.seq),
        binding: args.targetBinding,
        digests: targetDigests,
        roots: args.current.anchor.roots,
        lock: args.current.anchor.lock,
      };
      checkTransitionDeadline(args.deadlineMs);
      await this.writeAnchorRecord(committed, args.master, args.generationId);
      await faults.probe("commit.anchor.committed");
      await faults.probe("commit.anchor.synced");
      sweepTempFiles(this.opts.profileRoot);
      // The reply probe sits inside the fenced region: a throw after the
      // COMMITTED transition fences the handle like any other late fault.
      await faults.probe("commit.reply");
    } catch {
      // From the PREPARED attempt onward every failure is uncertain:
      // fence the handle and report ambiguity. Non-storage faults
      // cannot be mapped to a clean code once a mutation may have run.
      this.fence();
      throw new StorageError("commit_ambiguous");
    }
  }

  private async loadFreshMaster(deadlineMs: number): Promise<Uint8Array> {
    return this.opts.keyAccess.loadMaster(deadlineMs);
  }

  async provision(
    origin: string,
    generationId: string,
    deadlineMs: number,
  ): Promise<StorageBinding> {
    deadlineMs = workerDeadline(deadlineMs);
    checkDeadline(deadlineMs);
    this.verifyLease();
    await this.opts.faults.probe("lock.acquired");
    const roots: ValidatedRoots = this.validateRoots();
    void roots;
    // F7: a valid INCOMPLETE marker has priority over every ordinary
    // existing-state refusal on reprovision. This is safe marker metadata
    // only — no initialization — and runs before any data/anchor checks.
    if (existsNoFollow(path.join(this.opts.anchorRoot, INCOMPLETE_FILE))) {
      throw new StorageError("incomplete_provision");
    }
    // Data root: absent creates, empty reuses, anything else denies.
    try {
      const st: fs.Stats = fs.lstatSync(this.opts.profileRoot);
      if (st.isSymbolicLink()) {
        throw new StorageError("io_failure");
      }
      validateDirStat(st);
      const entries: string[] = fs.readdirSync(this.opts.profileRoot);
      if (entries.length > 0) {
        throw new StorageError("already_provisioned");
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "ENOENT"
      ) {
        try {
          fs.mkdirSync(this.opts.profileRoot, { mode: 0o700 });
        } catch {
          throw new StorageError("io_failure");
        }
        await this.opts.faults.probe("fs.fsync.directory");
        fsyncDirectory(path.dirname(this.opts.profileRoot));
      } else {
        throw new StorageError("io_failure");
      }
    }
    assertSafeAncestors(this.opts.profileRoot);
    assertAllowedFilesystem(this.opts.profileRoot, this.opts.allowedFilesystems);
    if (existsNoFollow(path.join(this.opts.anchorRoot, ANCHOR_FILE))) {
      throw new StorageError("already_provisioned");
    }
    checkDeadline(deadlineMs);
    const master: Uint8Array = this.opts.mintMaster();
    try {
      // Durable incomplete marker precedes the first external side effect.
      await durableInstallFile(
        this.opts.anchorRoot,
        INCOMPLETE_FILE,
        new Uint8Array(0),
        this.opts.faults,
      );
      await this.opts.faults.probe("provision.marker.durable");
      await this.opts.keyAccess.createMaster(master, deadlineMs);
      await this.opts.faults.probe("provision.key.stored");
      const binding: StorageBinding = Object.freeze({
        origin,
        accountUuid: null,
        sessionGeneration: 0,
        profileGenerationId: generationId,
      });
      const aad: Buffer = dataAad(origin, null, generationId);
      const vaultEnvelope: Buffer = sealEnvelope("vault", master, new Uint8Array(0), aad);
      const opsEnvelope: Buffer = sealEnvelope("operations", master, new Uint8Array(0), aad);
      const provisioning: AnchorRecord = {
        v: 1,
        phase: "PROVISIONING",
        seq: "0",
        binding,
        digests: {
          vault: sha256Hex(vaultEnvelope),
          ops: sha256Hex(opsEnvelope),
        },
        roots: {
          profile: this.rootCommitment(this.opts.profileRoot),
          anchor: this.rootCommitment(this.opts.anchorRoot),
          euid: euid(),
        },
        lock: {
          dev: this.opts.expectedLock.dev,
          ino: this.opts.expectedLock.ino,
        },
      };
      await this.writeAnchorRecord(provisioning, master, generationId);
      await durableInstallFile(this.opts.profileRoot, VAULT_FILE, vaultEnvelope, this.opts.faults);
      await durableInstallFile(this.opts.profileRoot, OPS_FILE, opsEnvelope, this.opts.faults);
      await this.opts.faults.probe("provision.stores.durable");
      const committed: AnchorRecord = {
        ...provisioning,
        phase: "COMMITTED",
      };
      await this.writeAnchorRecord(committed, master, generationId);
      await this.opts.faults.probe("provision.anchor.committed");
      try {
        fs.unlinkSync(path.join(this.opts.anchorRoot, INCOMPLETE_FILE));
      } catch {
        throw new StorageError("io_failure");
      }
      await this.opts.faults.probe("fs.fsync.directory");
      fsyncDirectory(this.opts.anchorRoot);
      await this.opts.faults.probe("provision.marker.removed");
      sweepTempFiles(this.opts.profileRoot);
      sweepTempFiles(this.opts.anchorRoot);
      this.master = master;
      this.binding = binding;
      this.epoch = 0;
      return { ...binding };
    } catch (error) {
      scrubBytes(master);
      if (error instanceof FaultArmed) {
        // Provision has no PREPARED phase: partial state keeps the
        // durable incomplete marker and fails closed as io_failure.
        throw new StorageError("io_failure");
      }
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError("io_failure");
    }
  }

  async open(expected: StorageBinding, deadlineMs: number): Promise<StorageBinding> {
    deadlineMs = workerDeadline(deadlineMs);
    checkDeadline(deadlineMs);
    this.verifyLease();
    await this.opts.faults.probe("lock.acquired");
    this.validateRoots();
    if (existsNoFollow(path.join(this.opts.anchorRoot, INCOMPLETE_FILE))) {
      throw new StorageError("incomplete_provision");
    }
    const anchorFile: Buffer = this.readAnchorFile();
    const master: Uint8Array = await this.loadFreshMaster(deadlineMs);
    try {
      const anchor: AnchorRecord = this.decryptAnchor(anchorFile, master);
      if (anchor.phase === "PROVISIONING") {
        throw new StorageError("incomplete_provision");
      }
      if (anchor.phase === "PREPARED") {
        this.fence();
        throw new StorageError("commit_ambiguous");
      }
      if (
        anchor.binding.origin !== expected.origin ||
        anchor.binding.accountUuid !== expected.accountUuid ||
        anchor.binding.profileGenerationId !== expected.profileGenerationId
      ) {
        throw new StorageError("binding_mismatch");
      }
      if (anchor.binding.sessionGeneration !== expected.sessionGeneration) {
        throw new StorageError("generation_mismatch");
      }
      this.checkLockCommitment(anchor);
      this.checkRootCommitments(anchor);
      const vaultFile: Buffer = this.readStoreFile(VAULT_FILE);
      const opsFile: Buffer = this.readStoreFile(OPS_FILE);
      parseEnvelopeHeader(new Uint8Array(vaultFile));
      parseEnvelopeHeader(new Uint8Array(opsFile));
      this.checkDigests(anchor, vaultFile, opsFile);
      this.master = master;
      this.binding = anchor.binding;
      this.epoch = anchor.binding.sessionGeneration;
      return { ...anchor.binding };
    } catch (error) {
      scrubBytes(master);
      if (error instanceof FaultArmed) {
        throw new StorageError("io_failure");
      }
      throw error;
    }
  }

  async readVault(captureGeneration: number, deadlineMs: number): Promise<Uint8Array> {
    deadlineMs = workerDeadline(deadlineMs);
    this.ensureUsable();
    this.checkCapture(captureGeneration);
    checkDeadline(deadlineMs);
    const validated: {
      anchor: AnchorRecord;
      vaultFile: Buffer;
      opsFile: Buffer;
    } = await this.revalidate(deadlineMs);
    const master: Uint8Array = await this.recheckKey(deadlineMs);
    const binding: StorageBinding = this.currentBinding();
    if (validated.anchor.binding.sessionGeneration !== binding.sessionGeneration) {
      throw new StorageError("generation_mismatch");
    }
    return new Uint8Array(this.decryptStore("vault", validated.vaultFile, master, binding));
  }

  async readOps(captureGeneration: number, deadlineMs: number): Promise<Uint8Array> {
    deadlineMs = workerDeadline(deadlineMs);
    this.ensureUsable();
    this.checkCapture(captureGeneration);
    checkDeadline(deadlineMs);
    const validated: {
      anchor: AnchorRecord;
      vaultFile: Buffer;
      opsFile: Buffer;
    } = await this.revalidate(deadlineMs);
    const master: Uint8Array = await this.recheckKey(deadlineMs);
    const binding: StorageBinding = this.currentBinding();
    if (validated.anchor.binding.sessionGeneration !== binding.sessionGeneration) {
      throw new StorageError("generation_mismatch");
    }
    return new Uint8Array(this.decryptStore("operations", validated.opsFile, master, binding));
  }

  async commit(
    captureGeneration: number,
    update: { vaultBytes?: Uint8Array; operationBytes?: Uint8Array },
    deadlineMs: number,
  ): Promise<void> {
    deadlineMs = workerDeadline(deadlineMs);
    this.ensureUsable();
    this.checkCapture(captureGeneration);
    checkDeadline(deadlineMs);
    if (update.vaultBytes === undefined && update.operationBytes === undefined) {
      throw new StorageError("invalid_argument");
    }
    if (
      (update.vaultBytes !== undefined && update.vaultBytes.byteLength > MAX_STORE_BYTES) ||
      (update.operationBytes !== undefined && update.operationBytes.byteLength > MAX_STORE_BYTES)
    ) {
      throw new StorageError("resource_exhausted");
    }
    const validated: {
      anchor: AnchorRecord;
      vaultFile: Buffer;
      opsFile: Buffer;
    } = await this.revalidate(deadlineMs);
    const master: Uint8Array = await this.recheckKey(deadlineMs);
    const binding: StorageBinding = this.currentBinding();
    if (validated.anchor.binding.sessionGeneration !== binding.sessionGeneration) {
      throw new StorageError("generation_mismatch");
    }
    const aad: Buffer = dataAad(binding.origin, binding.accountUuid, binding.profileGenerationId);
    const newVault: Buffer | null =
      update.vaultBytes === undefined
        ? null
        : sealEnvelope("vault", master, update.vaultBytes, aad);
    const newOps: Buffer | null =
      update.operationBytes === undefined
        ? null
        : sealEnvelope("operations", master, update.operationBytes, aad);
    await this.runTransition({
      targetBinding: binding,
      newVaultEnvelope: newVault,
      newOpsEnvelope: newOps,
      current: validated,
      master,
      generationId: binding.profileGenerationId,
      deadlineMs,
    });
  }

  async bindAccount(
    captureGeneration: number,
    accountUuid: string,
    vaultBytes: Uint8Array,
    deadlineMs: number,
  ): Promise<StorageBinding> {
    deadlineMs = workerDeadline(deadlineMs);
    this.ensureUsable();
    this.checkCapture(captureGeneration);
    checkDeadline(deadlineMs);
    const binding: StorageBinding = this.currentBinding();
    if (binding.accountUuid !== null) {
      throw new StorageError("binding_mismatch");
    }
    if (vaultBytes.byteLength > MAX_STORE_BYTES) {
      throw new StorageError("resource_exhausted");
    }
    const validated: {
      anchor: AnchorRecord;
      vaultFile: Buffer;
      opsFile: Buffer;
    } = await this.revalidate(deadlineMs);
    const master: Uint8Array = await this.recheckKey(deadlineMs);
    const current: StorageBinding = this.currentBinding();
    if (current.accountUuid !== null) {
      throw new StorageError("binding_mismatch");
    }
    const next: StorageBinding = Object.freeze({
      origin: current.origin,
      accountUuid,
      sessionGeneration: 1,
      profileGenerationId: current.profileGenerationId,
    });
    const currentOps: Uint8Array = this.decryptStore(
      "operations",
      validated.opsFile,
      master,
      current,
    );
    const aad: Buffer = dataAad(next.origin, next.accountUuid, next.profileGenerationId);
    const newVault: Buffer = sealEnvelope("vault", master, vaultBytes, aad);
    const newOps: Buffer = sealEnvelope("operations", master, currentOps, aad);
    scrubBytes(currentOps);
    await this.runTransition({
      targetBinding: next,
      newVaultEnvelope: newVault,
      newOpsEnvelope: newOps,
      current: validated,
      master,
      generationId: next.profileGenerationId,
      deadlineMs,
    });
    this.binding = next;
    this.epoch = 1;
    return { ...next };
  }

  async advanceGeneration(
    captureGeneration: number,
    vaultBytes: Uint8Array,
    deadlineMs: number,
  ): Promise<StorageBinding> {
    deadlineMs = workerDeadline(deadlineMs);
    this.ensureUsable();
    this.checkCapture(captureGeneration);
    checkDeadline(deadlineMs);
    const binding: StorageBinding = this.currentBinding();
    if (binding.accountUuid === null) {
      throw new StorageError("binding_mismatch");
    }
    if (vaultBytes.byteLength > MAX_STORE_BYTES) {
      throw new StorageError("resource_exhausted");
    }
    if (binding.sessionGeneration + 1 > Number.MAX_SAFE_INTEGER) {
      throw new StorageError("resource_exhausted");
    }
    const validated: {
      anchor: AnchorRecord;
      vaultFile: Buffer;
      opsFile: Buffer;
    } = await this.revalidate(deadlineMs);
    const master: Uint8Array = await this.recheckKey(deadlineMs);
    const current: StorageBinding = this.currentBinding();
    if (validated.anchor.binding.sessionGeneration !== current.sessionGeneration) {
      throw new StorageError("generation_mismatch");
    }
    const next: StorageBinding = Object.freeze({
      origin: current.origin,
      accountUuid: current.accountUuid,
      sessionGeneration: current.sessionGeneration + 1,
      profileGenerationId: current.profileGenerationId,
    });
    const aad: Buffer = dataAad(next.origin, next.accountUuid, next.profileGenerationId);
    const newVault: Buffer = sealEnvelope("vault", master, vaultBytes, aad);
    await this.runTransition({
      targetBinding: next,
      newVaultEnvelope: newVault,
      newOpsEnvelope: null,
      current: validated,
      master,
      generationId: next.profileGenerationId,
      deadlineMs,
    });
    this.binding = next;
    this.epoch = next.sessionGeneration;
    return { ...next };
  }

  async intentDigest(
    captureGeneration: number,
    identityBytes: Uint8Array,
    deadlineMs: number,
  ): Promise<Uint8Array> {
    deadlineMs = workerDeadline(deadlineMs);
    this.ensureUsable();
    this.checkCapture(captureGeneration);
    checkDeadline(deadlineMs);
    const binding: StorageBinding = this.currentBinding();
    if (binding.accountUuid === null) {
      throw new StorageError("binding_mismatch");
    }
    await this.revalidate(deadlineMs);
    const master: Uint8Array = await this.recheckKey(deadlineMs);
    const digestKey: Buffer = deriveDigestKey(
      master,
      binding.origin,
      binding.accountUuid,
      binding.profileGenerationId,
    );
    try {
      return new Uint8Array(hmacIntentDigest(digestKey, identityBytes));
    } finally {
      digestKey.fill(0);
    }
  }

  closeEngine(): void {
    if (this.master !== null) {
      scrubBytes(this.master);
      this.master = null;
    }
    this.binding = null;
    this.closed = true;
  }
}

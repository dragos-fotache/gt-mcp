/* global AbortController, AbortSignal, fetch */
// A10/R12: real signed nonce proof, backend deletion/status, and trusted local erasure.
// Synthetic account bindings are provisioned only inside the guarded disposable DB.
import fs from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { describe, it } from "vitest";
import { openProfile } from "../../dist/storage/index.js";
import { SecretMasterKey } from "../../dist/storage/keyring.js";
import { assertBusAddress } from "../../dist/storage/validate.js";
import { signOutProfile } from "../../dist/lifecycle/index.js";
import { openAccountStatusTransaction } from "../../dist/lifecycle/account-status.js";
import { check, fixture, processSession } from "./helpers.mjs";

const signal = () => new AbortController().signal;
const binding = async (f) => (await f.privateState()).binding;

async function signProof(subject, nonce) {
  const selected = process.env.GT_T16_PROOF_CONFIG;
  check(typeof selected === "string", "Private signed-proof facility required");
  const stat = fs.lstatSync(selected);
  check(
    stat.isFile() && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o600,
    "Signed-proof configuration ownership/mode mismatch",
  );
  const proof = JSON.parse(fs.readFileSync(selected));
  check(
    /^http:\/\/127\.0\.0\.1:\d+$/.test(proof.origin) &&
      proof.audience === "android-isolated-test" &&
      typeof proof.token === "string",
    "Unowned signed-proof facility refused",
  );
  const response = await fetch(proof.origin + "/sign", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + proof.token },
    body: JSON.stringify({ subject, nonce }),
    signal: AbortSignal.timeout(10000),
  });
  check(response.status === 200, "Synthetic signed-proof generation failed");
  const value = await response.json();
  check(typeof value.idToken === "string", "Synthetic signed-proof result invalid");
  return value.idToken;
}

async function privateFingerprint(f) {
  const owner = await openProfile(f.privateProfileOptions());
  try {
    return createHash("sha256")
      .update(await owner.readVaultBytes())
      .update(JSON.stringify(owner.binding))
      .digest("hex");
  } finally {
    await owner.close();
  }
}

async function status(f, subject, stage) {
  const owner = await openProfile(f.privateProfileOptions());
  let transaction;
  try {
    transaction = await openAccountStatusTransaction({
      profile: owner,
      transportConfig: { origin: f.origin },
      settings: {
        version: 1,
        googleWebClientId: "android-isolated-test",
        browserOrigin: "http://localhost:43219",
      },
    });
    const challenge = await transaction.start(signal());
    const token = await signProof(subject, challenge.nonce);
    try {
      return await transaction.submit(challenge.attemptId, token, signal());
    } catch (error) {
      throw new Error(`Actual ${stage} status failed: ${error.code ?? "unknown"}`, {
        cause: error,
      });
    }
  } finally {
    await transaction?.close();
    await owner.close();
  }
}

async function create(f, loseDraft = false) {
  const session = await processSession(f.configPath);
  try {
    if (loseDraft) f.state.lose = "draft";
    const reply = await session.client.callTool({ name: "create_routine", arguments: f.intent() });
    const result = reply.structuredContent;
    check(
      loseDraft ? !result.ok && result.error.outcomeUnknown : result.ok,
      "Actual creation fixture did not reach expected saved/uncertain boundary",
    );
    return result;
  } finally {
    await session.close("eof");
    check(session.stderr() === "", "MCP emitted unexpected diagnostics");
  }
}

describe("T21-S5 authoritative deletion composition", () => {
  it("preserves the credential record on active/foreign proof, then deleted status erases only A", async () => {
    const f = await fixture(),
      separate = await fixture();
    try {
      const subject = "t16-s6-" + randomUUID();
      await f.bindProofSubject(subject);
      await create(f);
      await create(f, true);
      await create(separate);
      const bBefore = await privateFingerprint(separate),
        aBefore = await privateFingerprint(f);
      check(
        (await status(f, subject, "active")).state === "active",
        "Live verified account was not active",
      );
      check((await privateFingerprint(f)) === aBefore, "Active proof changed private evidence");
      let rejected;
      try {
        await status(f, "t16-s6-" + randomUUID(), "foreign");
      } catch (error) {
        rejected = error;
      }
      check(
        rejected?.message === "Actual foreign status failed: account_status_failed",
        "Foreign signed proof authorized cleanup",
      );
      check((await privateFingerprint(f)) === aBefore, "Generic404 erased private evidence");
      const prior = await binding(f);
      await signOutProfile({ configPath: f.configPath }, signal());
      const signedOut = await binding(f);
      check(
        signedOut.accountUuid === prior.accountUuid &&
          signedOut.sessionGeneration === prior.sessionGeneration + 1,
        "Sign-out did not preserve/fence account evidence",
      );
      const signedOutFingerprint = await privateFingerprint(f);
      const challenge = await f.request(
        "POST",
        "/v1/auth/google/challenge",
        {
          purpose: "deleteAccount",
        },
        null,
      );
      check(challenge.status === 200, "Actual deletion challenge failed");
      const deleted = await f.request(
        "POST",
        "/v1/account/delete",
        {
          accountId: f.grant.account.id,
          challengeId: challenge.value.challengeId,
          idToken: await signProof(subject, challenge.value.nonce),
          confirm: true,
        },
        null,
      );
      check(
        deleted.status === 202 &&
          deleted.value.state === "deleted" &&
          deleted.value.accountId === f.grant.account.id,
        "Actual account deletion was not accepted",
      );
      const observation = f.observeDeletion();
      check(
        observation.deleted &&
          observation.ledger === 1 &&
          observation.purgeIntents === 1 &&
          observation.bindings === 0 &&
          observation.sessions > 0 &&
          observation.revoked === observation.sessions,
        "Actual deletion lacks independent ledger/disable/session/detachment effects",
      );
      check(
        (await privateFingerprint(f)) === signedOutFingerprint,
        "Remote deletion silently erased offline local evidence",
      );
      check(
        (
          await status(
            f,
            subject,
            [deleted.value.deletedAt, deleted.value.purgeBy].some((value) =>
              /\.\d{3}\d*[1-9]\d*Z$/.test(value),
            )
              ? "deleted (backend submillisecond receipt)"
              : "deleted",
          )
        ).state === "deleted",
        "Authoritative status did not clean A",
      );
      const options = f.privateProfileOptions();
      check(
        JSON.stringify(fs.readdirSync(options.profileRoot)) === JSON.stringify(["owner.lock"]),
        "A private ciphertext was retained",
      );
      const key = new SecretMasterKey(
        assertBusAddress(options.secretServiceBusAddress).socketPath,
        prior.profileGenerationId,
      );
      let missing;
      try {
        await key.loadMaster(Date.now() + 5000);
      } catch (error) {
        missing = error;
      }
      check(missing?.code === "key_not_found", "A master key remains after authoritative cleanup");
      check(
        (await privateFingerprint(separate)) === bBefore,
        "A cleanup changed B private evidence",
      );
      check(
        (await separate.request("GET", "/v1/routines?limit=1")).status === 200,
        "A deletion disabled unrelated B",
      );
      check(!f.state.hookFailed, "Actual proof relay hook failed");
    } finally {
      await f.close();
      await separate.close();
    }
  }, 90000);
});

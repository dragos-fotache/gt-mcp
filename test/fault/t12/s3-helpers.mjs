// Synthetic account proof over actual private HTTPS/provider and secured callback.
import { randomUUID } from "node:crypto";
import { lifecycleFixture, signal, parse } from "./s1-helpers.mjs";
import { browserSettings } from "../../login/cli-helpers.mjs";
import { openConfiguredAccountStatusBrowserHelper } from "../../../dist/lifecycle/account-status.js";
import { pageCsrf, request } from "../../login/browser-helpers.mjs";
export { signal, parse, pageCsrf, request };
export const TOKEN = "synthetic-t12-status-google-proof";
export const deleted = (accountId) => ({
  accountId,
  state: "deleted",
  deletedAt: "2026-09-27T12:00:00Z",
  purgeBy: "2026-09-28T12:00:00Z",
});
export async function currentBinding(f) {
  const owner = await f.open();
  try {
    return owner.binding;
  } finally {
    await owner.close();
  }
}
export function json(res, value, status = 200) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}
export async function statusFixture() {
  const f = await lifecycleFixture();
  const challenges = [],
    headers = [];
  f.setChallenge((_req, res) => {
    const challenge = {
      challengeId: randomUUID(),
      nonce: `synthetic-status-nonce-${challenges.length}`,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };
    challenges.push(challenge);
    json(res, challenge);
  });
  f.setStatus((req, res) => {
    headers.push(req.headers);
    json(res, { accountId: f.binding.accountUuid, state: "active" });
  });
  return { ...f, challenges, headers };
}
export async function browser(f, signalInput = signal()) {
  const { port, settings } = await browserSettings(f);
  const helper = await openConfiguredAccountStatusBrowserHelper(
    { configPath: f.configPath, loginConfigPath: f.loginConfigPath },
    signalInput,
  );
  return { helper, port, settings };
}
export async function submit(h, token = TOKEN) {
  const page = await pageCsrf(h);
  const response = await request(h, {
    method: "POST",
    path: "/credential",
    body: JSON.stringify({ csrf: page.csrf, idToken: token }),
  });
  return { page, response };
}
export async function state(f) {
  const owner = await f.open();
  try {
    return {
      vault: Buffer.from(await owner.readVaultBytes()),
    };
  } finally {
    await owner.close();
  }
}

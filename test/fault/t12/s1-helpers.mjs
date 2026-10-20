import { setupLoginProfile } from "../../../dist/login/index.js";
import { fixture, signIn, signal, bytes, parse } from "../../login/configured-helpers.mjs";
export { signal, bytes, parse };
export async function lifecycleFixture({ accountUuid } = {}) {
  const f = await fixture();
  try {
    if (accountUuid !== undefined) f.grant.account.id = accountUuid;
    await setupLoginProfile({ configPath: f.configPath });
    const binding = await signIn(f);
    return { ...f, binding };
  } catch (error) {
    await f.close();
    throw error;
  }
}
export async function inspect(f) {
  const owner = await f.open();
  try {
    return { vault: parse(await owner.readVaultBytes()), binding: owner.binding };
  } finally {
    await owner.close();
  }
}

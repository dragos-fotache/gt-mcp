/** T07 additive trusted local authentication and browser helper. No import-time IO. */
export { LoginError, isLoginError } from "./errors.js";
export type { LoginErrorCode } from "./errors.js";
export { LOGIN_VAULT_VERSION } from "./records.js";
export type { LoginSettings } from "./records.js";
export { openLoginTransaction } from "./transaction.js";
export type { LoginChallenge, LoginTransaction, LoginTransactionOptions } from "./transaction.js";
export {
  openConfiguredLoginTransaction,
  openConfiguredBrowserLoginHelper,
  setupLoginProfile,
  recoverLoginProfile,
} from "./configured.js";
export type { ConfiguredLoginOptions, LoginProfileOptions } from "./configured.js";
export type { LoginMetadata, LoginReceipt } from "./metadata.js";
export { startBrowserLoginHelper } from "./browser.js";
export type { BrowserLoginHelper, BrowserLoginOptions } from "./browser.js";

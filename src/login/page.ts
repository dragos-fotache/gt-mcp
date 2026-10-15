import type { LoginSettings } from "./records.js";
import type { LoginChallenge } from "./transaction.js";

export interface LoginPageOptions {
  readonly settings: LoginSettings;
  readonly challenge: LoginChallenge;
  readonly csrf: string;
  readonly scriptNonce: string;
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/gu, (character) => {
    return `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
  });
}

function attribute(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/** Render the fixed trusted login page. No IO occurs while rendering or importing. */
export function renderLoginPage({
  settings,
  challenge,
  csrf,
  scriptNonce,
}: LoginPageOptions): string {
  const nonce = attribute(scriptNonce);
  const configuration = scriptJson({
    clientId: settings.googleWebClientId,
    nonce: challenge.nonce,
    csrf,
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GymTracka login</title>
<style nonce="${nonce}">
body { font: 1rem/1.5 system-ui, sans-serif; margin: 3rem auto; padding: 0 1rem; max-width: 34rem; color: #17202a; background: #fff; }
button { font: inherit; padding: .5rem 1rem; margin-top: 1rem; }
#google-signin { min-height: 44px; }
</style>
</head>
<body>
<main>
<h1>Sign in to GymTracka</h1>
<p>Choose your Google account to sign in. Keep this page open until login finishes.</p>
<div id="google-signin" aria-label="Sign in with Google"></div>
<p id="status" role="status" aria-live="polite">Loading Google sign-in…</p>
<button id="cancel" type="button">Cancel</button>
</main>
<script id="gis-script" nonce="${nonce}" src="https://accounts.google.com/gsi/client" async defer></script>
<script nonce="${nonce}">
(() => {
  "use strict";
  const configuration = ${configuration};
  const status = document.getElementById("status");
  const signIn = document.getElementById("google-signin");
  const cancel = document.getElementById("cancel");
  const providerScript = document.getElementById("gis-script");
  let initialized = false;
  let admitted = false;
  let cancelled = false;
  const failure = "Login could not finish. Return to the trusted local application for recovery or a new attempt.";
  const setupFailure = "Google sign-in could not load. Check the configured Google web client and authorized localhost origin, then start a new login from the trusted local application.";

  function disableSignIn() {
    signIn.replaceChildren();
    signIn.setAttribute("aria-disabled", "true");
  }

  function credential(response) {
    if (admitted || cancelled) return;
    admitted = true;
    disableSignIn();
    let idToken = response && response.credential;
    response = null;
    if (typeof idToken !== "string" || idToken.length === 0) {
      idToken = null;
      status.textContent = failure;
      return;
    }
    status.textContent = "Finishing login…";
    let body = JSON.stringify({ csrf: configuration.csrf, idToken });
    idToken = null;
    let request;
    try {
      request = fetch("/credential", {
        method: "POST",
        mode: "same-origin",
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body
      });
    } catch {
      if (!cancelled) status.textContent = failure;
      return;
    } finally {
      body = null;
    }
    request.then((result) => {
      if (cancelled) return;
      status.textContent = result.ok
        ? "Login complete. Return to the trusted local application. You may close this page."
        : failure;
    }).catch(() => {
      if (!cancelled) status.textContent = failure;
    });
  }

  function initialize() {
    if (initialized || admitted || cancelled) return;
    if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
    initialized = true;
    try {
      window.google.accounts.id.initialize({
        client_id: configuration.clientId,
        nonce: configuration.nonce,
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: false,
        callback: credential
      });
      window.google.accounts.id.renderButton(signIn, { theme: "outline", size: "large" });
      status.textContent = "Choose Sign in with Google to continue, or Cancel to stop.";
    } catch {
      disableSignIn();
      status.textContent = setupFailure;
    }
  }

  cancel.addEventListener("click", () => {
    if (cancelled) return;
    cancelled = true;
    disableSignIn();
    cancel.disabled = true;
    status.textContent = "Cancelling login…";
    fetch("/cancel", {
      method: "POST",
      mode: "same-origin",
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csrf: configuration.csrf })
    }).then((result) => {
      status.textContent = result.ok
        ? "Login cancelled. Return to the trusted local application. You may close this page."
        : failure;
    }).catch(() => { status.textContent = failure; });
  });
  providerScript.addEventListener("load", initialize);
  providerScript.addEventListener("error", () => {
    if (!admitted && !cancelled) status.textContent = setupFailure;
  });
  initialize();
})();
</script>
</body>
</html>`;
}

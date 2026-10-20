# T19 local setup checklist

**2026-10-18: preparation complete; execution blocked on external setup.** The
owner confirmed that the required deployment/Google inputs are not ready. No
real Google sign-in, backend session, installation or profile was created in this
preparation. T19/A02/A11 remain unpassed. See the
[work order](../tasks/t19-work-order.md) for scope and acceptance.

## Prepare outside the repository

- [ ] Designate an isolated test deployment/database containing only synthetic
      fitness data and a dedicated approved Google test account. Record locally how
      to revoke its dedicated MCP sessions. Do not use a personal/live backend or
      Android session, and do not copy an Android refresh credential.
- [ ] Supply the canonical HTTPS service origin and a certificate chain trusted
      by the selected Node runtime. The backend must use real Google token validation
      and unchanged v1 challenge/exchange/logout/read endpoints. Test token minting,
      signature bypasses and relaxed audience/nonce checks do not qualify T19.
- [ ] Select a Google OAuth **Web application** client whose client ID exactly
      matches the backend audience. Configure branding/consent and any test-user
      access required for the dedicated test account. Keep the client ID locally;
      no client secret is needed by this helper.
- [ ] Choose one available fixed port from1024–65535, reserve it on both
      127.0.0.1 and ::1, and register http://localhost:<PORT> exactly as an authorized
      JavaScript origin. Google's local-development guidance also calls for registering
      http://localhost. Use the fixed-port origin in the helper; it never falls back
      to the portless entry or a random port. See
      [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
- [ ] Prepare a supported desktop browser on the **same machine/network namespace
      as the helper**. Its localhost must reach that helper. Use a dedicated test
      browser profile with Google/GIS and popups available; the operator enters
      credentials/MFA directly. Confirm /usr/bin/xdg-open launches that intended
      browser without changing personal defaults as part of this task.
- [ ] Provide an available unlocked OS Secret Service on an explicit Unix bus,
      compatible flock and a trusted private0700 parent. Select a **nonexistent**
      profileRoot and two separate user-owned0400/0600 regular single-link config
      files, outside the application/profile roots. Follow the path/ancestor rules in
      [trusted setup](../login.md). Keep the deployment, bus and profile details local.
- [ ] Keep writesEnabled:false for all T19 work. Choose a synthetic read with an
      independently known result; return only its pass/fail and safe metadata to
      evidence, never raw fitness content, IDs or credentials.

Google's [JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference)
defines client_id, nonce and popup callback behavior. The existing helper supplies
the backend nonce and the GIS callback; a manual token-paste flow is not a substitute.

## Select and install the exact candidate

Use the accepted [T21-S6 handoff](t21-s6.md). Preparation rechecked the retained
archive against SHA256:

```text
cb2c8f7b4e75c3823b107191ed5a9d4c16e72eda5274953fc85343ddafa58191
```

Version0.0.0 alone does not identify it. Follow [installation](../installation.md)
for a fresh private application directory and extract + locked
npm ci --omit=dev --ignore-scripts using disposable Node24.21.0/npm11.19.0.
No global install or Pi changes are required. Do not replace the historical laptop
installation. This preparation verified the pinned runtime versions and archive
hash; it did not run an installation or repeat S6 acceptance.

Prepare the following values in the protected files locally. Angle-bracket values
are placeholders, so these examples cannot run unchanged.

Server config:

```json
{
  "version": 2,
  "serviceOrigin": "<ISOLATED_CANONICAL_HTTPS_ORIGIN>",
  "storage": {
    "profileRoot": "<ABSOLUTE_NONEXISTENT_PRIVATE_PROFILE_ROOT>",
    "secretServiceBusAddress": "unix:path=<ABSOLUTE_SECRET_SERVICE_SOCKET>"
  },
  "writesEnabled": false
}
```

Login settings:

```json
{
  "version": 1,
  "googleWebClientId": "<MATCHING_PUBLIC_WEB_CLIENT_ID>",
  "browserOrigin": "http://localhost:<REGISTERED_FIXED_PORT>"
}
```

## Execution once ready

1. Confirm the deployment/account are approved test resources, the backend's real
   Google verifier is active, HTTPS trust is valid, both loopbacks are available,
   and the browser can reach the helper. Record browser/OS/runtime and exact
   candidate identity; retain configuration privately. Do not dump environment,
   config files, network bodies or browser account pages into tools/evidence.
2. Run trusted setup and login using the installed absolute CLI, following
   [login commands](../login.md). Activate the actual Google button and complete
   foreground login. Observe backend-confirmed success, listener shutdown and
   independent profile release/reopen. A browser message alone does not establish
   authoritative account/session installation.
3. Through the installed stdio server and an isolated read client, verify the
   known synthetic read after reopening. Compare expected data locally and emit
   only sanitized outcomes. Sign out via the trusted CLI, confirm new reads need
   authentication, then repeat actual Google login with the same test account.
   Keep domain writes disabled and login/logout outside model-facing tools.
4. Start separate attempts to observe Cancel and the actual backend challenge
   deadline/listener closure. Observe occupied-port/missing-config guidance with
   owned temporary configuration only. An unregistered-origin attempt needs a
   separately approved test client/configuration; never alter a shared client's
   registration just to provoke failure. Reuse existing deterministic T07 fault
   evidence and label it separately from these real-browser observations.
5. Review safe status output, process arguments and browser behavior for exposure;
   do not export HAR files, raw console/network traces or token-bearing screenshots.
   Confirm service grants stay in private storage rather than browser storage,
   URLs or tool results. Record only observed properties and their limits.
6. Run the work order's relevant regressions against a stable isolated target.
   Revoke the task's dedicated service session(s), close the helper/client/provider
   and test browser resources, verify ownership release, and clean only task-owned
   resources. If revocation is uncertain, report it and use the deployment owner's
   approved session cleanup; local sign-out is best effort remotely. Do not delete
   the backend account, existing profiles, shared Google client or personal data.

Preparation validation is document/link/placeholder review and runtime/archive
identity only; no runtime suite or real Google gate was executed. The initial
version-only probe encountered ambient Node26.11.1/npm12.2.0 because T01_NODE_HOME
was unset; the retained disposable24.21.0/11.19.0 runtime was then located and
verified. No build/test/install used the ambient runtime.

To resume, confirm the checklist is ready and identify the private local
configuration through the agreed local handoff. Do not paste its values or any
credentials into chat. T17/current Android and independent T20 remain open;
this checklist grants no routine write enablement or release.

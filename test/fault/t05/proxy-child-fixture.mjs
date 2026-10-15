// Synthetic child for proxy-isolation tests. Spawned ONLY by
// proxy-isolation.test.mjs with an explicitly allowlisted environment (see
// CHILD_ENV_KEYS in the parent; nothing else is inherited). Prints exactly
// two JSON lines (control + target), never credentials or bodies.
//
// Modes via SYNTHETIC_QA_MODE:
// - "http-proxy" / "http-bypass": native http.get through the process global
//   agent (control: must reach the forward-proxy trap, or go direct under
//   NO_PROXY), then the transport getRoutine (target: must go direct).
// - "https-proxy": same pair over TLS with fixture trust for both legs.

/* global AbortSignal */

import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";

const origin = process.env.SYNTHETIC_QA_ORIGIN;
const mode = process.env.SYNTHETIC_QA_MODE ?? "http-proxy";
const secure = mode.startsWith("https");
const caller = secure ? https : http;

if (mode === "global-sabotage") {
  // Genuine runtime global replacement: swap the process globals for
  // throwing stubs. Native requests must break on them while the transport
  // (explicit per-attempt agent, never globals) keeps working.
  const sabotage = {
    addRequest: () => {
      throw new Error("synthetic-qa-global-used");
    },
  };
  http.globalAgent = sabotage;
  https.globalAgent = sabotage;
}

const ROUTINE_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const ACCOUNT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROFILE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function nativeGet() {
  return new Promise((resolve) => {
    const options = secure ? { ca: readFileSync(process.env.SYNTHETIC_QA_CERT) } : {};
    const request = caller.get(`${origin}/v1/routines/${ROUTINE_ID}`, options, (response) => {
      response.resume();
      response.on("end", () => resolve({ ok: response.statusCode === 200, status: response.statusCode }));
    });
    request.on("error", (error) => resolve({ ok: false, error: error.message }));
    request.setTimeout(5000, () => request.destroy(new Error("synthetic-qa native timeout")));
  });
}

async function transportGet() {
  const { createBackendTransport } = await import("../../../dist/http/index.js");
  const config = { origin, allowInsecureLoopback: true };
  if (secure) config.testCaPem = readFileSync(process.env.SYNTHETIC_QA_CERT);
  const handle = createBackendTransport(config, {
    session: {
      checkBinding: async () => {},
      selectCredential: async (binding) => ({
        bearerToken: "synthetic-qa-child-bearer.01",
        forBinding: binding,
      }),
      beforeDispatch: async () => {},
      isCurrent: () => true,
    },
  });
  try {
    const result = await handle.getRoutine(
      {
        origin,
        accountUuid: ACCOUNT_ID,
        sessionGeneration: 0,
        profileGenerationId: PROFILE_ID,
      },
      ROUTINE_ID,
      AbortSignal.timeout(5000),
    );
    return { ok: result.status === 200, status: result.status };
  } catch (error) {
    return { ok: false, code: error?.code ?? "unknown" };
  }
}

const control = await (async () => {
  try {
    return await nativeGet();
  } catch {
    return { ok: false, sabotaged: true };
  }
})();
process.stdout.write(`${JSON.stringify({ line: "control", ...control })}\n`);
const target = await transportGet();
process.stdout.write(`${JSON.stringify({ line: "target", ...target })}\n`);

// Minimal child for proxy-boundary tests. Spawned ONLY by
// proxy-boundary.test.mjs with an explicitly allowlisted environment.
// Performs a native request through the process global agent (control: must
// reach the owned non-forwarding trap and fail there) and then the transport
// getRoutine (target: must reach the owned HTTP/HTTPS target directly).
// Prints exactly two JSON lines; never credentials or bodies.

import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";

/* global AbortSignal */

const origin = process.env.SYNTHETIC_QA_ORIGIN;
const secure = process.env.SYNTHETIC_QA_SECURE === "1";
const caller = secure ? https : http;

const ROUTINE_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const ACCOUNT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROFILE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function nativeGet() {
  return new Promise((resolve) => {
    const options = secure ? { ca: readFileSync(process.env.SYNTHETIC_QA_CERT) } : {};
    const request = caller.get(`${origin}/v1/routines/${ROUTINE_ID}`, options, (response) => {
      response.resume();
      response.on("end", () =>
        resolve({ ok: response.statusCode === 200, status: response.statusCode }),
      );
    });
    request.on("error", () => resolve({ ok: false, refused: true }));
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
        bearerToken: "synthetic-qa-boundary-bearer.01",
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

const control = await nativeGet();
process.stdout.write(`${JSON.stringify({ line: "control", ...control })}\n`);
const target = await transportGet();
process.stdout.write(`${JSON.stringify({ line: "target", ...target })}\n`);

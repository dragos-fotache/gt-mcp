// T05 fault: production TLS adapter over isolated literal-loopback HTTPS with
// synthetic test-only certificates. Fixture files are requested through the
// coordinator (test-only local material, never personal trust stores); absence
// fails loudly, never skips. testCaPem adds fixture trust and NEVER disables
// certificate/expiry/host verification.

/* global AbortController, TextEncoder */

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  startLoopbackHttp,
  startLoopbackHttps,
  closeServer,
  jsonResponse,
  readFixture,
} from "./helpers.mjs";
import {
  ROUTINE_R,
  RESOURCE_KEY,
  BEARER,
  testBinding,
  catchTransportError,
} from "../../unit/t05/helpers.mjs";

// Required test-only fixtures (coordinator-provisioned, visibly labelled):
// - test-only-loopback-cert.pem / test-only-loopback-key.pem
//   self-signed, SAN IP 127.0.0.1 (+ ::1), currently valid.
// - test-only-loopback-expired-cert.pem / -key.pem (expired now).
// - test-only-loopback-wronghost-cert.pem / -key.pem (SAN example.invalid).
function loadPair(prefix) {
  const certPem = new TextEncoder().encode(readFixture(`${prefix}-cert.pem`));
  const keyPem = new TextEncoder().encode(readFixture(`${prefix}-key.pem`));
  return { certPem, keyPem };
}

function tlsSession() {
  return {
    checkBinding: async () => {},
    selectCredential: async (binding) => ({ bearerToken: BEARER, forBinding: binding }),
    beforeDispatch: async () => {},
    isCurrent: () => true,
  };
}

describe("loopback HTTPS with test-only fixture trust", () => {
  it("trusted fixture cert completes the same wire contract", async () => {
    const { certPem, keyPem } = loadPair("test-only-loopback");
    const { server, origin, requests } = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa valid loopback pair" },
      (req, res) => {
        jsonResponse(res, 200, {
          id: ROUTINE_R,
          name: "",
          isDraft: true,
          revision: 1,
          exercises: [],
        });
      },
    );
    try {
      const handle = createBackendTransport(
        { origin, testCaPem: certPem },
        { session: tlsSession() },
      );
      const result = await handle.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      expect(result.status).toBe(200);
      expect(result.data.id).toBe(ROUTINE_R);
      expect(requests.length).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("untrusted chain without testCaPem fails closed as network_error", async () => {
    const { certPem, keyPem } = loadPair("test-only-loopback");
    const { server, origin, requests } = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa valid loopback pair" },
      (req, res) => {
        jsonResponse(res, 200, {});
      },
    );
    try {
      const handle = createBackendTransport(
        { origin, budgets: { maxAttempts: 1 } },
        { session: tlsSession() },
      );
      const error = await catchTransportError(
        handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
      );
      expect(error.code).toBe("network_error");
      expect(error.retryable).toBe(true);
      // The failed handshake never became an HTTP handler invocation.
      expect(requests.length).toBe(0);
    } finally {
      await closeServer(server);
    }
  });

  it("testCaPem never rescues expired certificates", async () => {
    const { certPem, keyPem } = loadPair("test-only-loopback-expired");
    const { server, origin, requests } = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa expired loopback pair" },
      (req, res) => {
        jsonResponse(res, 200, {});
      },
    );
    try {
      const handle = createBackendTransport(
        { origin, testCaPem: certPem, budgets: { maxAttempts: 1 } },
        { session: tlsSession() },
      );
      const error = await catchTransportError(
        handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
      );
      expect(error.code).toBe("network_error");
      expect(requests.length).toBe(0);
    } finally {
      await closeServer(server);
    }
  });

  it("testCaPem never rescues wrong-host certificates", async () => {
    const { certPem, keyPem } = loadPair("test-only-loopback-wronghost");
    const { server, origin, requests } = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa wrong-host loopback pair" },
      (req, res) => {
        jsonResponse(res, 200, {});
      },
    );
    try {
      const handle = createBackendTransport(
        { origin, testCaPem: certPem, budgets: { maxAttempts: 1 } },
        { session: tlsSession() },
      );
      const error = await catchTransportError(
        handle.getRoutine({ ...testBinding(), origin }, ROUTINE_R, new AbortController().signal),
      );
      expect(error.code).toBe("network_error");
      expect(requests.length).toBe(0);
    } finally {
      await closeServer(server);
    }
  });

  it("NODE_TLS_REJECT_UNAUTHORIZED=0 fails the factory without touching env", async () => {
    const { certPem } = loadPair("test-only-loopback");
    const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
      let error = null;
      try {
        createBackendTransport(
          { origin: "https://127.0.0.1:18443", testCaPem: certPem },
          {
            session: tlsSession(),
          },
        );
      } catch (thrown) {
        error = thrown;
      }
      expect(error?.code).toBe("invalid_arguments");
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe("0");
    } finally {
      if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
    }
  });

  it("refused connections on an owned closed port are uncertain post-handoff failures", async () => {
    const owned = await startLoopbackHttp((req, res) => {
      res.end();
    });
    const closedOrigin = owned.origin;
    await closeServer(owned.server);
    // Nothing listens here anymore. Handoff marks dispatch at invocation of
    // the low-level sender (approved sections 5/8), not at socket connect or
    // body flush, so a refused TCP connect on a mutation is conservatively
    // uncertain with one counted attempt.
    const handle = createBackendTransport(
      { origin: closedOrigin, allowInsecureLoopback: true, budgets: { maxAttempts: 1 } },
      { session: tlsSession() },
    );
    const error = await catchTransportError(
      handle.createDraft(
        { ...testBinding(), origin: closedOrigin },
        ROUTINE_R,
        new TextEncoder().encode(`{"id":"${ROUTINE_R}"}`),
        RESOURCE_KEY,
        new AbortController().signal,
      ),
    );
    expect(error.code).toBe("network_error");
    expect(error.dispatched).toBe(true);
    expect(error.outcomeUnknown).toBe(true);
    expect(error.attempts).toBe(1);
  });
});

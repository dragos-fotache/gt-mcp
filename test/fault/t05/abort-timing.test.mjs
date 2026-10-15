// T05 fault: production timing and abort behavior on real sockets.
// Per-attempt timeouts, caller abort mid-flight, slow-drip bodies and handle
// reuse after abort. Real timers only; no doubles; isolated loopback only.
// Every pending call gets an immediate rejection handler; servers track
// response/socket close events as cleanup evidence.

/* global AbortController, TextEncoder, clearInterval, clearTimeout, setInterval, setTimeout */

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import { startLoopbackHttp, closeServer, jsonResponse, waitForDeadline } from "./helpers.mjs";
import {
  ROUTINE_R,
  RESOURCE_KEY,
  BEARER,
  testBinding,
  catchTransportError,
} from "../../unit/t05/helpers.mjs";

function timingSession() {
  return {
    checkBinding: async () => {},
    selectCredential: async (binding) => ({ bearerToken: BEARER, forBinding: binding }),
    beforeDispatch: async () => {},
    isCurrent: () => true,
  };
}

const ROUTINE_OK = {
  id: ROUTINE_R,
  name: "",
  isDraft: true,
  revision: 1,
  exercises: [],
};

describe("per-attempt timeout and abort on live sockets", () => {
  it("delayed response head maps network_error within one attempt", async () => {
    const { server, origin, responses } = await startLoopbackHttp((req, res) => {
      const timer = setTimeout(() => {
        try {
          jsonResponse(res, 200, ROUTINE_OK);
        } catch {
          // Socket already destroyed by the attempt timeout; nothing to do.
        }
      }, 500);
      res.on("close", () => clearTimeout(timer));
    });
    try {
      const handle = createBackendTransport(
        {
          origin,
          allowInsecureLoopback: true,
          budgets: { perAttemptTimeoutMs: 100, maxAttempts: 1 },
        },
        { session: timingSession() },
      );
      const pending = handle.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      pending.catch(() => {});
      const error = await catchTransportError(pending);
      expect(error.code).toBe("network_error");
      expect(error.retryable).toBe(true);
      expect(error.attempts).toBe(1);
      // The abandoned server response is closed: no leaked connection.
      await waitForDeadline(() => responses.every((record) => record.closed));
    } finally {
      await closeServer(server);
    }
  });

  it("caller abort mid-flight interrupts a mutation as uncertain", async () => {
    const { server, origin, requests } = await startLoopbackHttp((req, res) => {
      // Hold the response open until the client goes away; the transport
      // abort destroys its socket and owned cleanup reaps the server side.
      void res;
    });
    try {
      const handle = createBackendTransport(
        { origin, allowInsecureLoopback: true, budgets: { maxAttempts: 1 } },
        { session: timingSession() },
      );
      const controller = new AbortController();
      const pending = handle.createDraft(
        { ...testBinding(), origin },
        ROUTINE_R,
        new TextEncoder().encode(`{"id":"${ROUTINE_R}"}`),
        RESOURCE_KEY,
        controller.signal,
      );
      pending.catch(() => {});
      await waitForDeadline(() => requests.length === 1);
      controller.abort();
      const error = await catchTransportError(pending);
      expect(error.code).toBe("operation_interrupted");
      expect(error.dispatched).toBe(true);
      expect(error.outcomeUnknown).toBe(true);
    } finally {
      await closeServer(server);
    }
  });

  it("slow-drip valid partial JSON cannot hang an attempt past its timeout", async () => {
    const { server, origin } = await startLoopbackHttp((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      // Emit partial but so-far-valid JSON bytes, far too slowly.
      try {
        res.write(`{"id":"${ROUTINE_R}","name":`);
      } catch {
        return;
      }
      const timer = setInterval(() => {
        try {
          res.write(`""`);
        } catch {
          clearInterval(timer);
        }
      }, 400);
      res.on("close", () => clearInterval(timer));
    });
    try {
      const handle = createBackendTransport(
        {
          origin,
          allowInsecureLoopback: true,
          budgets: { perAttemptTimeoutMs: 100, maxAttempts: 1 },
        },
        { session: timingSession() },
      );
      const pending = handle.getRoutine(
        { ...testBinding(), origin },
        ROUTINE_R,
        new AbortController().signal,
      );
      pending.catch(() => {});
      const error = await catchTransportError(pending);
      expect(error.code).toBe("network_error");
      expect(error.attempts).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("the handle stays usable for later calls after an abort", async () => {
    const seen = { count: 0 };
    const { server, origin } = await startLoopbackHttp((req, res) => {
      if (seen.count === 0) {
        seen.count += 1;
        // Hold the first response open; the abort reaps it via owned cleanup.
        return;
      }
      jsonResponse(res, 200, ROUTINE_OK);
    });
    try {
      const handle = createBackendTransport(
        { origin, allowInsecureLoopback: true, budgets: { maxAttempts: 1 } },
        { session: timingSession() },
      );
      const binding = { ...testBinding(), origin };
      const controller = new AbortController();
      const pending = handle.getRoutine(binding, ROUTINE_R, controller.signal);
      pending.catch(() => {});
      await waitForDeadline(() => seen.count === 1);
      controller.abort();
      const aborted = await catchTransportError(pending);
      expect(aborted.code).toBe("operation_interrupted");
      const recovered = handle.getRoutine(binding, ROUTINE_R, new AbortController().signal);
      recovered.catch(() => {});
      const result = await recovered;
      expect(result.status).toBe(200);
      expect(result.data.id).toBe(ROUTINE_R);
    } finally {
      await closeServer(server);
    }
  });
});

// T05 fault: fixture-only owned-cleanup calibration. Proves the harness
// itself leaves no servers listening, sockets open or timers dangling on
// success, failure and timeout paths — without importing any moving target.
// Every owned server is closed in finally, even when assertions fail.

import { describe, it, expect } from "vitest";
import net from "node:net";
import {
  startLoopbackHttp,
  startLoopbackHttps,
  startRawServer,
  closeServer,
  jsonResponse,
  readFixtureBytes,
  waitForDeadline,
} from "./helpers.mjs";

function timeoutCount() {
  return process.getActiveResourcesInfo().filter((type) => type === "Timeout").length;
}

describe("owned cleanup calibration", () => {
  it("reaps held-open HTTP responses on close", async () => {
    const timersBefore = timeoutCount();
    const opened = await startLoopbackHttp((req, res) => {
      void res;
    });
    let socket = null;
    try {
      socket = await new Promise((resolve, reject) => {
        const candidate = net.connect(opened.server.address().port, "127.0.0.1");
        candidate.once("connect", () => resolve(candidate));
        candidate.once("error", reject);
      });
      expect(opened.server.listening).toBe(true);
    } finally {
      await closeServer(opened.server);
    }
    expect(opened.server.listening).toBe(false);
    try {
      await waitForDeadline(() => socket.destroyed);
    } finally {
      socket.destroy();
    }
    expect(timeoutCount()).toBeLessThanOrEqual(timersBefore);
  });

  it("reaps raw sockets and HTTPS servers without hangs", async () => {
    const timersBefore = timeoutCount();
    const raw = await startRawServer(() => {});
    try {
      const rawSocket = await new Promise((resolve, reject) => {
        const candidate = net.connect(raw.server.address().port, "127.0.0.1");
        candidate.once("connect", () => resolve(candidate));
        candidate.once("error", reject);
      });
      try {
        const certPem = readFixtureBytes("test-only-loopback-cert.pem");
        const keyPem = readFixtureBytes("test-only-loopback-key.pem");
        const secure = await startLoopbackHttps(
          { keyPem, certPem, label: "synthetic-qa cleanup" },
          (req, res) => {
            jsonResponse(res, 200, {});
          },
        );
        try {
          expect(raw.received.length).toBe(1);
        } finally {
          await closeServer(secure.server);
        }
        expect(secure.server.listening).toBe(false);
      } finally {
        rawSocket.destroy();
      }
    } finally {
      await closeServer(raw.server);
    }
    expect(raw.server.listening).toBe(false);
    expect(timeoutCount()).toBeLessThanOrEqual(timersBefore);
  });
});

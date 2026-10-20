// Separate diagnostic executable. Production entry never selects this worker.
import fs from "node:fs";
import { serveWorker } from "../../../dist/storage/ipc.js";
import { credentialHandlers } from "../../../dist/storage/credential/worker.js";
const control = process.env.T21_TEST_CONTROL;
if (!control || !process.env.GT_S3_TEST_BUS) process.exit(2);
serveWorker(
  credentialHandlers(async (point) => {
    if (!fs.existsSync(control)) return;
    const fault = JSON.parse(fs.readFileSync(control));
    if (fault.point !== point) return;
    fs.unlinkSync(control);
    if (fault.action === "kill") process.kill(process.pid, "SIGKILL");
    throw new Error("synthetic interruption");
  }),
);

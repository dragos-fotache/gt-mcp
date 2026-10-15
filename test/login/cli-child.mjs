// Only the explicitly trusted library launcher is replaced. Production CLI flags,
// storage, transport, provider and browser-helper composition remain unchanged.
import { main } from "../../dist/cli/main.js";

const [launcherMode, ...args] = process.argv.slice(2);
const code = await main(args, undefined, async (url, signal) => {
  process.send({ url });
  if (launcherMode === "fail") throw new Error("synthetic launcher failure");
  if (launcherMode === "hold") {
    await new Promise((resolve) => {
      if (signal.aborted) resolve();
      else signal.addEventListener("abort", resolve, { once: true });
    });
  }
});
process.exitCode = code;
if (process.connected) process.disconnect();

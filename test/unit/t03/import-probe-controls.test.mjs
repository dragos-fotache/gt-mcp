// T03 QA import-probe controls (artifact-free standalone suite).
//
// This file has NO static or dynamic import of the moving dist artifact: it
// exercises only synthetic fixtures through the shared probe runner. It is
// therefore artifact-free and independent of any frozen relay. Nothing here
// proves domain behavior; the controls exist so that a passing control with
// a failing domain run attributes the delta to the target, and a clean
// domain delta is meaningful rather than harness-masked.
//
// Run history (authorized artifact-free runs only): 11/11 green on the
// initial guard revision, 13/13 green after the reader-aware open revision.
// Current sources below are expectations for the next run, not proved
// behavior.

import { describe, it } from "vitest";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  expectCleanImport,
  expectDeniedImport,
  expectZodVendorGlobals,
  withScope,
} from "./import-probe-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DENY_SETUP_JS = path.resolve(HERE, "import-deny-setup.mjs");

function target(file) {
  return pathToFileURL(path.resolve(HERE, file)).href;
}

const setupHref = pathToFileURL(DENY_SETUP_JS).href;

describe("T03 import-probe controls (synthetic only, artifact-free)", () => {
  it("control: synthetic inert import yields a clean delta", () => {
    withScope(target("import-control-target.mjs"), setupHref, expectCleanImport, "control");
  });

  it("zod-only control shows exactly the verified vendor globals", () => {
    // Isolated pinned public zod package import (never project production
    // contents): records the verified initialization the domain entry is
    // allowed to match — exactly the two named own data properties.
    withScope(target("import-control-zod.mjs"), setupHref, expectZodVendorGlobals, "zod-vendor");
  });

  it.each([
    ["fetch", "import-control-deny-fetch.mjs", "network:fetch"],
    ["timer global", "import-control-deny-timer.mjs", "timer:setTimeout"],
    ["timer module", "import-control-deny-timers.mjs", "timers:setTimeout"],
    ["process-exit", "import-control-deny-exit.mjs", "process:exit"],
    ["child-spawn", "import-control-deny-spawn.mjs", "child:spawn"],
    ["fs-write", "import-control-deny-write.mjs", "fs:writeFileSync"],
    ["fs-write-open", "import-control-deny-writeopen.mjs", "fs:openSync"],
    ["fs-fd-write", "import-control-deny-fdwrite.mjs", "fs:writeSync"],
    ["http2-connect", "import-control-deny-http2.mjs", "http2:connect"],
    ["tls-connect", "import-control-deny-tls.mjs", "tls:connect"],
    ["dgram-socket", "import-control-deny-dgram.mjs", "dgram:createSocket"],
    ["dns-lookup", "import-control-deny-dns.mjs", "dns-promises:lookup"],
  ])("deny control proves %s attempts trigger and record", (_label, file, kind) => {
    // Each deny path is expected to throw inside module evaluation before
    // any real I/O, record exactly once, fail the import with a forbidden
    // error, and leave the sandbox empty. Unexecuted until a relay run.
    withScope(target(file), setupHref, (scope, result) =>
      expectDeniedImport(scope, result, file, kind),
    );
  });
});

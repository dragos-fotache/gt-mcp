// Synthetic Zod-only control fixture for the T03 import probe harness.
//
// Imports the pinned public zod package (locked dependency, never project
// production contents) so the probe can record its verified initialization:
// exactly __zod_globalConfig and __zod_globalRegistry as own data.
// Expected probe outcome: clean channels plus exactly that vendor set.
// See the pinned-Zod import contract (read by QA as spec).

import "zod";

export const CONTROL = "synthetic-qa-t03-zod-vendor";

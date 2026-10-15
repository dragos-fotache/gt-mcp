// Synthetic inert control target for the T03 import probe harness.
//
// No imports and no side effects. A clean control delta proves the probe
// harness itself (spawn args, env, snapshots) contributes nothing observable,
// so any domain delta at relay is attributable to the target. This file is
// synthetic QA scaffolding only: never a real catalogue, account or backend
// value, and never the moving dist artifact.

export const CONTROL = "synthetic-qa-t03-import-control";

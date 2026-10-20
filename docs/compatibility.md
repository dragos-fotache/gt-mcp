# Compatibility

The current runtime requires Node.js >=24.0.0 on Linux x64. Development uses the machine's Node; CI
checks the Node 24 release line. No exact local Node version is required. Dependency pins below
describe the lockfile, not certification of every environment. The external release matrix remains
unverified while the [integrated and release gates](improvements.md) are open.

| Component                            | Version / configuration                            | Boundary                                    | Status                  | Limitations                                                                 |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| Node.js                              | >=24.0.0                                           | Runtime, storage and packaging              | unverified              | No upper-version guard; no exhaustive newer-version compatibility claim     |
| npm                                  | packageManager metadata 11.19.0                    | Locked installs using machine npm           | unverified              | Use --ignore-scripts; archive generation currently requires npm 11.19.0     |
| TypeScript                           | 5.9.3                                              | Strict production typecheck/build           | unverified              | Companion has an existing skipLibCheck exception                            |
| Official MCP SDK                     | 1.32.1                                             | Portable stdio server                       | unverified              | Other hosts require their own interoperability qualification                |
| MCP protocol                         | 2025-11-25                                         | SDK/host negotiation                        | unverified              | Negotiation alone does not qualify host modes or lifecycle                  |
| Zod                                  | 4.5.4                                              | Strict schemas and lossless domain decoding | unverified              | Valid numeric boundaries and canonical projection remain required           |
| Vitest                               | 4.1.11                                             | test/**/*.test.mjs                          | unverified              | Isolated suites need explicit fixture facilities; skips are not passes      |
| Node types                           | 24.19.2                                            | Development declarations                    | unverified              | Compile-time dependency                                                     |
| ESLint / JS / TS ESLint / Prettier   | 10.12.0 / 10.0.1 / 8.71.1 / 3.9.10                 | Development checks                          | unverified              | Exact resolutions/integrities are in package-lock.json                      |
| Pi runtime                           | coding-agent 1.1.0                                 | Direct, deferred and codemode integration   | unverified              | Actual CLI, modes, lifecycle and output qualification remain open           |
| Config-file routine-creation guard   | writesEnabled boolean, default false               | Startup configuration and all clients       | unverified              | True permits authenticated valid creation without per-call confirmation     |
| Pi companion / approval ordering     | No runtime dependency                              | Portable server permission model            | not in current delivery | Inert workspace and experimental sources remain outside delivery            |
| OS / secret facility                 | Linux x64, OS Secret Service, dbus-native 0.7.8    | Encrypted record and exclusive ownership    | unverified              | No filesystem-name gate; Btrfs is user-owned; no power-loss certification   |
| Backend / OpenAPI / shared docs      | Backend v1, OpenAPI 1.0.0, MCP 0.3-draft           | Fixed-origin REST and shared contracts      | unverified              | Current artifact and independent release qualification remain necessary     |
| Google / helper origin               | Operator-supplied public client and localhost port | Foreground GIS login                        | unverified              | Real browser/audience/nonce flow requires deployment-specific qualification |
| Android sync observation             | Current client/delivery selected for qualification | Ordinary sync of created saved routines     | unverified              | Current delivery needs its own observation; no live-phone claim             |
| Credential/config format transitions | Config 2, credential record 1; fresh profile       | Startup refusal and explicit setup          | unverified              | No automatic old/future-format migration                                    |

Runtime dependencies are MCP SDK, Zod and dbus-native. Pi and the companion workspace are not
runtime installation requirements. Private archive membership and runtime dependency closure are
controlled by the [packaging procedure](packaging.md).

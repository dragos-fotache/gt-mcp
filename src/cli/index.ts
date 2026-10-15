#!/usr/bin/env node
/**
 * Inert T01 trusted CLI entry. Domain commands are not implemented. Importing
 * this module never dispatches commands from argv and never writes output —
 * even if argv[1] matches this artifact's path, and whether referenced
 * directly or through a filesystem symlink. This entry never calls
 * process.exit itself; direct execution uses the returned exit code.
 */
import process from "node:process";

export interface CliIo {
  stdout(text: string): void;
  stderr(text: string): void;
}

const HELP_TEXT =
  "GymTracka MCP foundation\nUsage: gymtracka-mcp --help\nDomain commands are not implemented.\n";

const NOT_IMPLEMENTED_MESSAGE =
  "GymTracka MCP CLI commands are not implemented (T01 foundation).\n";

const NOT_IMPLEMENTED_EXIT_CODE = 78;

/**
 * Dispatches CLI arguments to injected IO. Exactly `--help` exits 0 with usage
 * on stdout; every other argument list (including none) exits 78 with a fixed
 * stderr message and empty stdout. No setup prompt, browser, or private-state
 * discovery is performed.
 */
export function main(args: readonly string[], io: CliIo): number {
  if (args.length === 1 && args[0] === "--help") {
    io.stdout(HELP_TEXT);
    return 0;
  }
  io.stderr(NOT_IMPLEMENTED_MESSAGE);
  return NOT_IMPLEMENTED_EXIT_CODE;
}

// Main-entry guard: `import.meta.main` is true only when this file is the
// process entry point, through symlinks included. No argv comparison, no
// argv-path filesystem access, no import-time effects. Invocation arguments
// are read only inside this branch, never on the import path.
if (import.meta.main === true) {
  const code = main(process.argv.slice(2), {
    stdout: (text: string): void => {
      process.stdout.write(text);
    },
    stderr: (text: string): void => {
      process.stderr.write(text);
    },
  });
  process.exitCode = code;
}

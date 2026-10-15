/** Official low-level SDK composition; no transport, process entry or mutable registry is exposed. */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { TOOL_NAMES, parseArguments } from "../domain/index.js";
import type { ReadToolName, ToolName } from "../domain/index.js";
import type { ReadRuntime } from "../runtime/index.js";
import { isReadRuntimeError } from "../runtime/index.js";
import { openReadRuntimeSnapshot } from "../runtime/read.js";
import { DEFAULT_MAX_TOOL_RESULT_BYTES, isToolResultBudget } from "../runtime/protocolBudget.js";
import { isReadToolServerError, ReadToolServerError } from "./errors.js";
import { catalogue } from "./catalogue.js";
import { boundedResult, failure, readEnvelope, thrownReadFailure } from "./results.js";
import { exactKeys, hasOwn, ownRecord, validMetadata } from "./validation.js";

export interface ReadToolServerOptions {
  readonly runtime: ReadRuntime;
  readonly maxToolResultBytes?: number;
}

export interface ConfiguredReadToolServerOptions {
  readonly configPath?: string;
}

export interface ReadToolServer {
  connect(transport: Transport): Promise<void>;
  close(): Promise<void>;
}

type ReadMethod = (args: unknown, signal: AbortSignal) => Promise<unknown>;
interface CapturedRuntime {
  readonly reads: Readonly<Record<ReadToolName, ReadMethod>>;
  readonly close: () => Promise<void>;
}

const METHODS = {
  search_exercises: "searchExercises",
  get_exercise: "getExercise",
  list_workouts: "listWorkouts",
  get_workout: "getWorkout",
  list_routines: "listRoutines",
  get_routine: "getRoutine",
} as const;

function invalidOptions(): never {
  throw new ReadToolServerError("invalid_arguments");
}

/** Trusted capability capture: data methods, including inherited class methods, with original receivers. */
function captureMethod(value: unknown, key: string): (...args: unknown[]) => unknown {
  if (typeof value !== "object" || value === null) invalidOptions();
  let current: object | null = value;
  const visited = new Set<object>();
  while (current !== null && !visited.has(current)) {
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) {
      if (
        !hasOwn(descriptor as Record<string, unknown>, "value") ||
        typeof descriptor.value !== "function"
      )
        invalidOptions();
      const method = descriptor.value as (...args: unknown[]) => unknown;
      return (...args: unknown[]): unknown => Reflect.apply(method, value, args);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  invalidOptions();
}

function captureRuntime(value: unknown): CapturedRuntime {
  try {
    const reads = Object.fromEntries(
      Object.entries(METHODS).map(([tool, method]) => {
        const captured = captureMethod(value, method);
        return [
          tool,
          (args: unknown, signal: AbortSignal): Promise<unknown> =>
            Promise.resolve(captured(args, signal)),
        ];
      }),
    ) as Record<ReadToolName, ReadMethod>;
    const close = captureMethod(value, "close");
    return {
      reads,
      close: async (): Promise<void> => {
        await close();
      },
    };
  } catch {
    invalidOptions();
  }
}

function invalidParams(message = "Invalid parameters."): never {
  throw new McpError(ErrorCode.InvalidParams, message);
}

function checkedParams(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  const params = ownRecord(value);
  if (params === null || !exactKeys(params, allowed)) invalidParams();
  if (hasOwn(params, "_meta") && !validMetadata(params["_meta"])) invalidParams();
  return params;
}

// Unknown params are handled manually so protocol failures never include Zod input details.
const LIST_REQUEST = z.object({ method: z.literal("tools/list"), params: z.unknown().optional() });

interface AdapterOutcome {
  sdkFailed: boolean;
  cleanupFailed: boolean;
}

// Private process integration only; the public index and server capability stay unchanged.
const OUTCOMES = new WeakMap<ReadToolServer, AdapterOutcome>();
export function adapterOutcome(server: ReadToolServer): Readonly<AdapterOutcome> | undefined {
  return OUTCOMES.get(server);
}

export function createReadToolServer(options: ReadToolServerOptions): ReadToolServer {
  const record = ownRecord(options);
  if (
    record === null ||
    !exactKeys(record, ["runtime", "maxToolResultBytes"]) ||
    !hasOwn(record, "runtime")
  )
    invalidOptions();
  const budget = hasOwn(record, "maxToolResultBytes")
    ? record["maxToolResultBytes"]
    : DEFAULT_MAX_TOOL_RESULT_BYTES;
  if (!isToolResultBudget(budget)) invalidOptions();
  const runtime = captureRuntime(record["runtime"]);
  try {
    return createAdapter(runtime, budget);
  } catch {
    // Failed construction has not transferred ownership; caller still owns runtime.
    throw new ReadToolServerError("internal_error");
  }
}

function createAdapter(runtime: CapturedRuntime, budget: number): ReadToolServer {
  const sdk = new Server(
    { name: "gymtracka-mcp", version: "0.0.0" },
    { capabilities: { tools: {} } },
  );
  let closing = false;
  let attempted = false;
  let closeOutcome: Promise<void> | undefined;
  let initialized = false;
  const outcome: AdapterOutcome = { sdkFailed: false, cleanupFailed: false };
  let faultClose: Promise<boolean> | undefined;

  const close = (): Promise<void> => {
    if (closeOutcome !== undefined) return closeOutcome;
    closing = true;
    let resolveClose!: () => void;
    let rejectClose!: (error: ReadToolServerError) => void;
    // Store ownership before synchronous transport closure reenters SDK onclose.
    closeOutcome = new Promise<void>((resolve, reject) => {
      resolveClose = resolve;
      rejectClose = reject;
    });
    void closeOutcome.catch(() => undefined);
    const settle = async (): Promise<void> => {
      let failed = false;
      try {
        await runtime.close();
      } catch {
        failed = true;
      }
      if (faultClose !== undefined) failed = (await faultClose) || failed;
      try {
        await sdk.close();
      } catch {
        failed = true;
      }
      outcome.cleanupFailed = failed;
      if (failed || outcome.sdkFailed) throw new ReadToolServerError("internal_error");
    };
    void settle().then(resolveClose, rejectClose);
    return closeOutcome;
  };

  sdk.onclose = (): void => {
    void close();
  };
  sdk.onerror = (): void => {
    // Disconnect cancels SDK sends; those expected failures are already owned by close.
    if (closing) return;
    outcome.sdkFailed = true;
    // Unexpected faults fence transport now; ordinary explicit S2 close still settles
    // runtime persistence before closing its transport, preserving the accepted boundary.
    faultClose = sdk.close().then(
      () => false,
      () => true,
    );
    void close();
  };
  sdk.oninitialized = (): void => {
    initialized = sdk.getClientCapabilities() !== undefined;
  };
  const requireInitialized = (): void => {
    if (!initialized) throw new McpError(ErrorCode.InvalidRequest, "Invalid request.");
  };
  sdk.setRequestHandler(LIST_REQUEST, (request) => {
    requireInitialized();
    // Official SDK listTools() represents omitted optional params as own undefined
    // over in-memory transport; ordinary JSON serialization omits that property.
    if (hasOwn(request, "params") && request.params !== undefined) {
      checkedParams(request.params, ["_meta"]);
    }
    return { tools: catalogue() };
  });
  sdk.fallbackRequestHandler = async (request, extra) => {
    if (request.method !== "tools/call")
      throw new McpError(ErrorCode.MethodNotFound, "Method not found.");
    requireInitialized();
    const params = checkedParams(request.params, ["name", "arguments", "_meta"]);
    const name = params["name"];
    if (typeof name !== "string") invalidParams();
    if (!(TOOL_NAMES as readonly string[]).includes(name)) invalidParams("Unknown tool.");
    const tool = name as ToolName;
    let args: unknown;
    try {
      args = parseArguments(tool, hasOwn(params, "arguments") ? params["arguments"] : {});
    } catch {
      return boundedResult(tool, failure("invalid_arguments"), budget);
    }
    const interrupted = (): boolean => closing || extra.signal.aborted;
    if (interrupted()) return boundedResult(tool, failure("operation_interrupted"), budget);
    if (tool === "create_routine") {
      return boundedResult(
        tool,
        failure("configuration_required", "Routine creation is unavailable in this build."),
        budget,
      );
    }
    let result: CallToolResult;
    try {
      const envelope = await runtime.reads[tool](args, extra.signal);
      try {
        result = boundedResult(tool, readEnvelope(tool, envelope), budget);
      } catch {
        result = boundedResult(tool, failure("internal_error"), budget);
      }
    } catch (error: unknown) {
      result = boundedResult(tool, thrownReadFailure(error), budget);
    }
    // SDK may suppress the reply; we never deliver a successful late result ourselves.
    return interrupted() ? boundedResult(tool, failure("operation_interrupted"), budget) : result;
  };

  const connect = async (transport: Transport): Promise<void> => {
    if (attempted || closing) invalidOptions();
    // Infrastructure is trusted, but reject malformed/repeated connection without starting a lifecycle.
    try {
      if (
        typeof transport !== "object" ||
        transport === null ||
        typeof transport.start !== "function" ||
        typeof transport.send !== "function" ||
        typeof transport.close !== "function"
      )
        invalidOptions();
    } catch {
      invalidOptions();
    }
    attempted = true;
    try {
      await sdk.connect(transport);
      if (closing) {
        await close();
        throw new ReadToolServerError("internal_error");
      }
    } catch {
      await close();
      throw new ReadToolServerError("internal_error");
    }
  };
  const server: ReadToolServer = { connect, close };
  OUTCOMES.set(server, outcome);
  return server;
}

export async function openConfiguredReadToolServer(
  options: ConfiguredReadToolServerOptions,
): Promise<ReadToolServer> {
  // S1 captures the exact caller shape synchronously before its first await and loads once.
  let acquired: Awaited<ReturnType<typeof openReadRuntimeSnapshot>>;
  try {
    acquired = await openReadRuntimeSnapshot(options);
  } catch (error: unknown) {
    throw new ReadToolServerError(isReadRuntimeError(error) ? error.code : "internal_error");
  }
  try {
    return createReadToolServer(acquired);
  } catch (error: unknown) {
    try {
      await acquired.runtime.close();
    } catch {
      throw new ReadToolServerError("internal_error");
    }
    throw new ReadToolServerError(isReadToolServerError(error) ? error.code : "internal_error");
  }
}

/**
 * T02 scripted local provider (disposable roots only).
 *
 * Pure factory `createScriptedProvider(turns)` returning the faux handle from
 * Pi's public faux-provider toolkit: canned assistant turns flow through the
 * real agent loop and tool hooks. No network, no credentials, no live model.
 * The factory performs no registration and no file I/O; malformed turns throw
 * explicitly. The default extension wrapper below exists for the later CLI
 * path only: it loads launcher-provided turns and registers the native
 * provider; missing/malformed turns fail the load explicitly.
 *
 * Turns shape (JSON):
 *   [{ "calls": [{ "tool": "<name>", "args": {…} }], "text": "<optional trailing text>" },
 *    { "text": "<final text>" }]
 */

import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@earendil-works/pi-ai";
import { readFileSync, writeFileSync } from "node:fs";

export const SCRIPTED_PROVIDER_ID = "t02-scripted";
export const SCRIPTED_MODEL_ID = "t02-synth";

function checkedTurns(turns) {
  if (!Array.isArray(turns) || turns.length === 0) {
    throw new Error("t02-scripted-provider: turns must be a non-empty array");
  }
  for (const turn of turns) {
    if (!turn || typeof turn !== "object") throw new Error("t02-scripted-provider: malformed turn");
    if (turn.calls !== undefined) {
      if (!Array.isArray(turn.calls) || turn.calls.length === 0) {
        throw new Error("t02-scripted-provider: malformed calls");
      }
      for (const call of turn.calls) {
        if (!call || typeof call.tool !== "string" || call.tool.length === 0) {
          throw new Error("t02-scripted-provider: malformed call tool");
        }
        if (
          call.args !== undefined &&
          (typeof call.args !== "object" || call.args === null || Array.isArray(call.args))
        ) {
          throw new Error("t02-scripted-provider: malformed call args");
        }
      }
    }
    if (turn.text !== undefined && typeof turn.text !== "string") {
      throw new Error("t02-scripted-provider: malformed text");
    }
    if (turn.calls === undefined && turn.text === undefined) {
      throw new Error("t02-scripted-provider: empty turn");
    }
  }
  return turns;
}

export function createScriptedProvider(turns, hooks = {}) {
  const checked = checkedTurns(turns);
  const onRequest = typeof hooks.onRequest === "function" ? hooks.onRequest : null;
  const faux = fauxProvider({
    provider: SCRIPTED_PROVIDER_ID,
    models: [
      {
        id: SCRIPTED_MODEL_ID,
        name: "T02 synthetic scripted model",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 32768,
        maxTokens: 4096,
      },
    ],
  });
  faux.setResponses(
    checked.map((turn, turnIndex) => {
      // Optional launcher observation hook: invoked inside the first real
      // provider request only, with the faux factory arguments. It must not
      // alter turns or parse private provider state.
      if (turnIndex === 0 && onRequest) {
        return (context, options, state, model) => {
          onRequest(context, options, state, model);
          return buildTurn(turn);
        };
      }
      return buildTurn(turn);
    }),
  );
  return faux;
}

function buildTurn(turn) {
  const calls = Array.isArray(turn.calls) ? turn.calls : [];
  if (calls.length > 0) {
    const blocks = calls.map((call) => fauxToolCall(String(call.tool), call.args ?? {}));
    if (typeof turn.text === "string" && turn.text.length > 0) {
      return fauxAssistantMessage([...blocks, { type: "text", text: turn.text }], {
        stopReason: "toolUse",
      });
    }
    return fauxAssistantMessage(blocks, { stopReason: "toolUse" });
  }
  return fauxAssistantMessage(String(turn.text ?? ""), { stopReason: "stop" });
}

function loadTurnsFile() {
  const path = process.env["T02_TURNS_FILE"];
  if (!path) throw new Error("t02-scripted-provider: T02_TURNS_FILE is not set");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error("t02-scripted-provider: turns file unreadable");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("t02-scripted-provider: turns file malformed");
  }
  return checkedTurns(parsed);
}

export default function t02ScriptedProvider(pi) {
  const faux = createScriptedProvider(loadTurnsFile());
  pi.registerProvider(faux.provider);
  // Publish the selected model as plain data for launcher-owned SDK sessions
  // (trusted launch metadata; the session resolves streaming through the
  // registered provider, never through this file).
  const modelFile = process.env["T02_MODEL_FILE"];
  if (modelFile) {
    try {
      writeFileSync(modelFile, JSON.stringify(faux.getModel()), { encoding: "utf8", mode: 0o600 });
    } catch {
      // The launcher observes the missing file and refuses to proceed.
    }
  }
}

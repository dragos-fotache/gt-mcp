// T08-S1 QA shared helpers (simple, no generalized harness).
// Spec authority: t08-s1-runtime-spec sections 2/4/5; tools.md envelope rules.
// Helpers assert observable envelope/runtime shape only, never implementation.
/* global AbortController */

import { expect } from "vitest";

// Explicitly prepared inputs only. Missing prerequisites are BLOCKED failures,
// never skipped passes: throw so the requiring test fails clearly.
export function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") {
    throw new Error(`BLOCKED: isolated fixture input ${name} is not prepared`);
  }
  return value;
}

export function expectOkEnvelope(envelope) {
  expect(envelope).toMatchObject({ ok: true });
  expect(envelope).not.toHaveProperty("error");
  expect(envelope.data).toBeDefined();
}

// Exact conservative-error oracle: code and retryable are always required.
export function expectExactErr(envelope, code, retryable) {
  expect(envelope).toMatchObject({ ok: false });
  expect(envelope).not.toHaveProperty("data");
  expect(envelope.error.code).toBe(code);
  expect(envelope.error.retryable).toBe(retryable);
  // No stack, native message, or private binding leakage in envelopes.
  const text = JSON.stringify(envelope);
  expect(text).not.toMatch(/stack|Trace|secretServiceBus|profileRoot|Bearer /i);
}

export function expectReadRuntimeErrorKinds(mod) {
  expect(typeof mod.openReadRuntime).toBe("function");
  expect(typeof mod.ReadRuntimeError).toBe("function");
  expect(typeof mod.isReadRuntimeError).toBe("function");
  const err = new mod.ReadRuntimeError("internal_error");
  expect(mod.isReadRuntimeError(err)).toBe(true);
  expect(mod.isReadRuntimeError({ code: "internal_error" })).toBe(false);
  expect(err.code).toBe("internal_error");
}

export function freshSignal() {
  return new AbortController().signal;
}

export function abortedSignal() {
  const c = new AbortController();
  c.abort();
  return c.signal;
}

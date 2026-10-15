// T06-S1 QA 02 — captured-identity hooks and local fences (SOURCE-READY,
// HOLD: authored against the settled work-order public API, never executed
// before the coordinator's named frozen relay).
//
// Spec basis: work-order section "Hooks and fences". Every case awaits a real
// hook outcome on a real facade opened over an isolated diagnostic owner and
// asserts a literal contract result. No placeholders, skips, or type-only
// assertions.

import { describe, expect, it } from "vitest";
import { isSessionError, openSessionState } from "../../../dist/auth/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  BEARER_A,
  ORIGIN,
  abortedSignal,
  captureRejection,
  freshSignal,
  grantBodyBytes,
  liveClock,
  teardownAll,
  version1Bytes,
} from "./helpers.mjs";

// Install one synthetic grant, close the installer owner, reopen under the
// new binding, and hand fn a live facade. Every acquired holder is closed
// (double close succeeds) before facility cleanup; a teardown failure
// fails the check but never skips remaining teardown, and the test body's
// own failure keeps precedence. Runs only after relay.
async function withLiveFacade(fn) {
  const facility = await createStorageTestFacility();
  const closers = [];
  let bodyError = null;
  try {
    const profile = await facility.provision(ORIGIN);
    closers.push(() => profile.close());
    const installer = await openSessionState({
      profile,
      clock: liveClock(),
    });
    const installed = await installer.installInitialGrant(
      installer.binding,
      grantBodyBytes(),
      freshSignal(),
    );
    installer.invalidate();
    await profile.close();
    const bound = await facility.open(installed);
    closers.push(() => bound.close());
    const live = await openSessionState({
      profile: bound,
      clock: liveClock(),
    });
    try {
      await fn({ facility, profile: bound, state: live, installed });
    } finally {
      live.invalidate();
    }
  } catch (error) {
    bodyError = error;
  }
  let teardownError = null;
  try {
    await teardownAll([...closers.reverse(), () => facility.cleanup()]);
  } catch (error) {
    teardownError = error;
  }
  if (bodyError !== null) throw bodyError;
  if (teardownError !== null) throw teardownError;
}

describe("T06-S1 isCurrent and invalidate", () => {
  it("is true for the live capture, false after synchronous idempotent invalidate", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      expect(state.hooks.isCurrent(installed)).toBe(true);
      expect(state.hooks.isCurrent(state.binding)).toBe(true);
      const returned = state.invalidate();
      expect(returned).toBe(undefined);
      expect(state.hooks.isCurrent(installed)).toBe(false);
      expect(state.invalidate()).toBe(undefined);
      expect(state.hooks.isCurrent(installed)).toBe(false);
    });
  });

  it("is false for foreign and malformed bindings without throwing", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      expect(
        state.hooks.isCurrent({
          origin: ORIGIN,
          accountUuid: ACCOUNT_B,
          sessionGeneration: 1,
          profileGenerationId: installed.profileGenerationId,
        }),
      ).toBe(false);
      expect(state.hooks.isCurrent(null)).toBe(false);
      expect(state.hooks.isCurrent({})).toBe(false);
      expect(
        state.hooks.isCurrent({
          origin: ORIGIN,
          accountUuid: ACCOUNT_A,
          sessionGeneration: "1",
          profileGenerationId: installed.profileGenerationId,
        }),
      ).toBe(false);
    });
  });
});

describe("T06-S1 checkBinding admits live captures and fences the rest", () => {
  it("resolves pre-send and pre-delivery for the live capture", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      await state.hooks.checkBinding("pre-send", installed, freshSignal());
      await state.hooks.checkBinding("pre-delivery", installed, freshSignal());
    });
  });

  it("rejects aborted, stale, and foreign captures as operation_interrupted", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      const aborted = await captureRejection(
        state.hooks.checkBinding("pre-send", installed, abortedSignal()),
      );
      expect(aborted.code).toBe("operation_interrupted");
      const foreign = await captureRejection(
        state.hooks.checkBinding(
          "pre-send",
          { ...installed, accountUuid: ACCOUNT_B },
          freshSignal(),
        ),
      );
      expect(foreign.code).toBe("operation_interrupted");
      state.invalidate();
      const stale = await captureRejection(
        state.hooks.checkBinding("pre-delivery", installed, freshSignal()),
      );
      expect(stale.code).toBe("operation_interrupted");
    });
  });

  it("fails closed on unexpected external vault change and never adopts it", async () => {
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const seed = {
        origin: profile.binding.origin,
        sessionGeneration: 0,
        profileGenerationId: profile.binding.profileGenerationId,
      };
      const state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        await state.hooks.checkBinding("pre-send", state.binding, freshSignal());
        await profile.commit({ vaultBytes: version1Bytes(seed) });
        const changed = await captureRejection(
          state.hooks.checkBinding("pre-delivery", state.binding, freshSignal()),
        );
        expect(isSessionError(changed)).toBe(true);
        expect(changed.code).toBe("operation_interrupted");
        expect(state.hooks.isCurrent(state.binding)).toBe(false);
        const fenced = await captureRejection(
          state.hooks.selectCredential(state.binding, "get_routine", freshSignal()),
        );
        expect(fenced.code).toBe("operation_interrupted");
      } finally {
        state.invalidate();
      }
    } finally {
      const steps = [];
      if (profile !== null) steps.push(() => profile.close());
      steps.push(() => facility.cleanup());
      await teardownAll(steps);
    }
  });
});

describe("T06-S1 hooks use detached entry snapshots, never reread callers", () => {
  it("post-entry mutation of the caller binding cannot change the check", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      const capture = { ...installed };
      const pending = state.hooks.checkBinding("pre-send", capture, freshSignal());
      capture.accountUuid = ACCOUNT_B;
      await pending;
      expect(state.hooks.isCurrent(installed)).toBe(true);
    });
  });

  it("post-entry mutation of the caller summary cannot change dispatch", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      const summary = {
        routeLabel: "get_routine",
        method: "GET",
        target: "/v1/routines/synthetic",
        bodyByteLength: 0,
        keyKind: null,
        attempt: 1,
      };
      const pending = state.hooks.beforeDispatch(installed, summary, freshSignal());
      summary.routeLabel = "auth_logout";
      await pending;
      expect(Object.isFrozen(summary)).toBe(false);
      expect(summary.routeLabel).toBe("auth_logout");
    });
  });
});

describe("T06-S1 selectCredential returns only live read credentials", () => {
  it("returns a detached frozen bearer bound to all four fields", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      const selected = await state.hooks.selectCredential(installed, "get_routine", freshSignal());
      expect(selected.bearerToken).toBe(BEARER_A);
      expect(selected.forBinding).toEqual(installed);
      expect(Object.isFrozen(selected)).toBe(true);
      expect(Object.isFrozen(selected.forBinding)).toBe(true);
    });
  });

  it("serves all six read routes and refuses mutation routes", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      for (const route of [
        "search_exercises",
        "get_exercise",
        "list_workouts",
        "get_workout",
        "list_routines",
        "get_routine",
      ]) {
        const selected = await state.hooks.selectCredential(installed, route, freshSignal());
        expect(selected.bearerToken, route).toBe(BEARER_A);
      }
      for (const route of ["create_draft", "populate_draft", "save_routine"]) {
        expect(await state.hooks.selectCredential(installed, route, freshSignal()), route).toBe(
          null,
        );
      }
    });
  });

  it("rejects stale and foreign selections as operation_interrupted", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      const foreign = await captureRejection(
        state.hooks.selectCredential(
          { ...installed, accountUuid: ACCOUNT_B },
          "get_routine",
          freshSignal(),
        ),
      );
      expect(isSessionError(foreign)).toBe(true);
      expect(foreign.code).toBe("operation_interrupted");
      state.invalidate();
      const stale = await captureRejection(
        state.hooks.selectCredential(installed, "get_routine", freshSignal()),
      );
      expect(stale.code).toBe("operation_interrupted");
    });
  });
});

describe("T06-S1 beforeDispatch admits reads and fenced auth, rejects the rest", () => {
  function summary(routeLabel, method = "GET", keyKind = null) {
    return {
      routeLabel,
      method,
      target: `/v1/synthetic/${routeLabel}`,
      bodyByteLength: 0,
      keyKind,
      attempt: 1,
    };
  }

  it("admits the six read labels plus auth_challenge and auth_exchange", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      for (const routeLabel of [
        "search_exercises",
        "get_exercise",
        "list_workouts",
        "get_workout",
        "list_routines",
        "get_routine",
      ]) {
        await state.hooks.beforeDispatch(installed, summary(routeLabel), freshSignal());
      }
      await state.hooks.beforeDispatch(
        installed,
        {
          routeLabel: "auth_challenge",
          method: "POST",
          target: "/v1/auth/google/challenge",
          bodyByteLength: 2,
          keyKind: null,
          attempt: 1,
        },
        freshSignal(),
      );
      await state.hooks.beforeDispatch(
        installed,
        {
          routeLabel: "auth_exchange",
          method: "POST",
          target: "/v1/auth/google",
          bodyByteLength: 64,
          keyKind: "auth",
          attempt: 1,
        },
        freshSignal(),
      );
    });
  });

  it("rejects mutation, refresh, logout, and status labels as operation_interrupted", async () => {
    // Documented T05 method/keyKind per label: draft/save POST/resource,
    // populate PUT/resource, refresh POST/auth, logout/status POST/null.
    // These summaries match the table so refusal proves the label rule.
    const disallowed = [
      {
        routeLabel: "create_draft",
        method: "POST",
        target: "/v1/routines",
        bodyByteLength: 16,
        keyKind: "resource",
        attempt: 1,
      },
      {
        routeLabel: "populate_draft",
        method: "PUT",
        target: "/v1/routines/synthetic",
        bodyByteLength: 16,
        keyKind: "resource",
        attempt: 1,
      },
      {
        routeLabel: "save_routine",
        method: "POST",
        target: "/v1/routines/synthetic/save",
        bodyByteLength: 16,
        keyKind: "resource",
        attempt: 1,
      },
      {
        routeLabel: "auth_refresh",
        method: "POST",
        target: "/v1/auth/refresh",
        bodyByteLength: 32,
        keyKind: "auth",
        attempt: 1,
      },
      {
        routeLabel: "auth_logout",
        method: "POST",
        target: "/v1/auth/logout",
        bodyByteLength: 32,
        keyKind: null,
        attempt: 1,
      },
      {
        routeLabel: "account_status",
        method: "POST",
        target: "/v1/account/status",
        bodyByteLength: 64,
        keyKind: null,
        attempt: 1,
      },
    ];
    await withLiveFacade(async ({ state, installed }) => {
      for (const summary of disallowed) {
        const error = await captureRejection(
          state.hooks.beforeDispatch(installed, summary, freshSignal()),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code, summary.routeLabel).toBe("operation_interrupted");
      }
    });
  });

  it("rejects malformed summaries as invalid_arguments and writes no evidence", async () => {
    await withLiveFacade(async ({ state, installed }) => {
      const frozen = Object.freeze({
        routeLabel: "get_routine",
        method: "GET",
        target: "/v1/routines/synthetic",
        bodyByteLength: 0,
        keyKind: null,
        attempt: 1,
      });
      await state.hooks.beforeDispatch(installed, frozen, freshSignal());
      expect(frozen.bodyByteLength).toBe(0);
      const malformed = await captureRejection(
        state.hooks.beforeDispatch(
          installed,
          {
            routeLabel: "get_routine",
            method: "GET",
            bodyByteLength: 0,
            keyKind: null,
            attempt: 1,
          },
          freshSignal(),
        ),
      );
      expect(malformed.code).toBe("invalid_arguments");
      const inconsistent = await captureRejection(
        state.hooks.beforeDispatch(
          installed,
          {
            routeLabel: "get_routine",
            method: "POST",
            target: "/v1/routines/synthetic",
            bodyByteLength: 0,
            keyKind: null,
            attempt: 1,
          },
          freshSignal(),
        ),
      );
      expect(inconsistent.code).toBe("invalid_arguments");
      const aborted = await captureRejection(
        state.hooks.beforeDispatch(installed, frozen, abortedSignal()),
      );
      expect(aborted.code).toBe("operation_interrupted");
    });
  });
});

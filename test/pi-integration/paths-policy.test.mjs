// Draft0.3 host checks; actual HTTPS fixture mutations and credential-only storage are the oracle.
import { describe, it, expect } from "vitest";
import { host, fixture, args, PREFIX, TOOLS, direct, code, results, envelope } from "./helpers.mjs";

const DISABLED = {
  ok: false,
  error: {
    code: "configuration_required",
    retryable: false,
    message: "Routine creation is disabled in the operator configuration.",
  },
};
const EMPTY = { ok: true, data: { items: [], hasMore: false, nextPageToken: null } };

function calls(exposure, input) {
  if (exposure === "codemode") {
    return [
      {
        calls: [
          code(`
      const namespace = await describeNamespace("mcp__gymtracka");
      text({ names: namespace.tools });
      const found = await searchTools("create_routine", { namespace: "mcp__gymtracka" });
      text({ found: found.map(tool => tool.name) });
      const read = await tools.mcp__gymtracka__list_routines({});
      const create = await tools.mcp__gymtracka__create_routine(${JSON.stringify(input)});
      text({ read, create });
    `),
        ],
      },
    ];
  }
  return [
    ...(exposure === "deferred"
      ? [
          {
            calls: [
              {
                tool: "tool_search",
                args: {
                  query: "create_routine list_routines",
                  limit: 7,
                },
              },
            ],
          },
        ]
      : []),
    { calls: [direct("list_routines")] },
    { calls: [direct("create_routine", input)] },
  ];
}

describe("T21-S5 actual Pi native paths/config policy", () => {
  for (const exposure of ["direct", "deferred", "codemode"]) {
    for (const enabled of [false, true]) {
      it(`${exposure} reaches the server with writesEnabled ${enabled}`, async () => {
        const f = await fixture({ writesEnabled: enabled });
        try {
          const input = args();
          const report = await host(f, exposure, calls(exposure, input));
          const read = results(report, "list_routines"),
            create = results(report, "create_routine");
          expect(read).toHaveLength(1);
          expect(create).toHaveLength(1);
          envelope(report, read[0], EMPTY);
          if (enabled) {
            expect(f.mutations().map((request) => request.method)).toEqual(["POST", "PUT", "POST"]);
            const root = JSON.parse(f.mutations()[0].body).id;
            expect(f.mutations().map((request) => request.target)).toEqual([
              "/v1/routines",
              `/v1/routines/${root}`,
              `/v1/routines/${root}/save`,
            ]);
            envelope(report, create[0], {
              ok: true,
              data: {
                routineId: root,
                status: "saved",
              },
            });
            expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
          } else {
            envelope(report, create[0], DISABLED);
            expect(f.mutations()).toEqual([]);
            expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
          }
          if (exposure === "direct") {
            expect(report.requests[0]).toEqual(
              expect.arrayContaining(TOOLS.map((name) => PREFIX + name)),
            );
            expect(create[0].parent).toBeNull();
          } else if (exposure === "deferred") {
            expect(report.requests[0]).not.toContain(PREFIX + "create_routine");
            const search = report.results.find((event) => event.name === "tool_search");
            expect(search.result.details.loaded).toEqual(
              expect.arrayContaining([PREFIX + "create_routine", PREFIX + "list_routines"]),
            );
            expect(report.active).toContain(PREFIX + "create_routine");
            expect(
              report.requests.slice(1).some((names) => names.includes(PREFIX + "create_routine")),
            ).toBe(true);
            expect(create[0].parent).toBeNull();
          } else {
            const parent = report.calls.find((event) => event.name === "codemode");
            expect(create[0].parent).toBe(parent.id);
            expect(read[0].parent).toBe(parent.id);
            const outer = report.results.find((event) => event.name === "codemode");
            expect(outer.isError).toBe(false);
            const text = outer.result.content.map((block) => block.text ?? "").join("\n");
            expect(text).toContain("Script completed");
            expect(text).toContain(PREFIX + "create_routine");
            expect(text).toContain(JSON.stringify(create[0].result.structuredContent));
          }
        } finally {
          await f.close();
        }
      }, 45000);
    }
  }

  it("omitted config defeats environment enablement while direct reads remain usable", async () => {
    const f = await fixture();
    try {
      f.write({ ...f.config, writesEnabled: undefined });
      const report = await host(f, "direct", calls("direct", args()));
      envelope(report, results(report, "list_routines")[0], EMPTY);
      envelope(report, results(report, "create_routine")[0], DISABLED);
      expect(f.mutations()).toEqual([]);
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
    } finally {
      await f.close();
    }
  }, 45000);

  it("repeated and changed explicit calls create fresh routines; missing auth cannot create", async () => {
    const f = await fixture();
    try {
      const input = args();
      const report = await host(f, "direct", [
        { calls: [direct("create_routine", input)] },
        { calls: [direct("create_routine", input)] },
        { calls: [direct("create_routine", { ...input, name: "Changed intent" })] },
      ]);
      const outcomes = results(report, "create_routine");
      expect(outcomes).toHaveLength(3);
      expect(f.mutations()).toHaveLength(9);
      const roots = [0, 3, 6].map((index) => JSON.parse(f.mutations()[index].body).id);
      expect(new Set(roots).size).toBe(3);
      for (const [index, root] of roots.entries()) {
        envelope(report, outcomes[index], {
          ok: true,
          data: { routineId: root, status: "saved" },
        });
        expect(
          f
            .mutations()
            .slice(index * 3, index * 3 + 3)
            .map((request) => request.target),
        ).toEqual(["/v1/routines", `/v1/routines/${root}`, `/v1/routines/${root}/save`]);
      }
      const names = [1, 4, 7].map((index) => JSON.parse(f.mutations()[index].body).name);
      expect(names).toEqual([input.name, input.name, "Changed intent"]);
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
    } finally {
      await f.close();
    }
    const signedOut = await fixture({ signedOut: true });
    try {
      const report = await host(signedOut, "direct", [
        { calls: [direct("create_routine", args())] },
      ]);
      envelope(report, results(report, "create_routine")[0], {
        ok: false,
        error: { code: "authentication_required", retryable: false },
      });
      expect(signedOut.mutations()).toEqual([]);
      expect(await signedOut.inspect()).toEqual(["credentials.enc", "owner.lock"]);
    } finally {
      await signedOut.close();
    }
  }, 60000);
});

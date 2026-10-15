import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { delay, helperFixture, request } from "./browser-helpers.mjs";

function runPage(html, { googleReady = true, fetchOk = true } = {}) {
  const elements = new Map();
  for (const id of ["status", "google-signin", "cancel", "gis-script"]) {
    elements.set(id, {
      textContent: "",
      disabled: false,
      handlers: new Map(),
      attributes: new Map(),
      addEventListener(event, handler) {
        this.handlers.set(event, handler);
      },
      setAttribute(name, value) {
        this.attributes.set(name, value);
      },
      replaceChildren() {
        this.cleared = true;
      },
    });
  }
  const initialized = [];
  const rendered = [];
  const fetches = [];
  const google = {
    accounts: {
      id: {
        initialize: (options) => initialized.push(options),
        renderButton: (element, options) => rendered.push({ element, options }),
        prompt: () => {
          throw new Error("Implicit Google prompt forbidden");
        },
      },
    },
  };
  const window = { google: googleReady ? google : undefined };
  for (const name of ["localStorage", "sessionStorage", "indexedDB"]) {
    Object.defineProperty(window, name, {
      get() {
        throw new Error("Browser persistence forbidden");
      },
    });
  }
  const document = { getElementById: (id) => elements.get(id) };
  Object.defineProperty(document, "cookie", {
    get() {
      throw new Error("Cookie read forbidden");
    },
    set() {
      throw new Error("Cookie write forbidden");
    },
  });
  const context = vm.createContext({
    window,
    document,
    navigator: {
      get serviceWorker() {
        throw new Error("Service worker forbidden");
      },
    },
    fetch: (url, options) => {
      fetches.push({ url, options });
      return Promise.resolve({ ok: fetchOk });
    },
  });
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  expect(scripts.filter(([, attributes]) => attributes.includes("src="))).toHaveLength(1);
  expect(scripts.find(([, attributes]) => attributes.includes("src="))[1]).toContain(
    "https://accounts.google.com/gsi/client",
  );
  const inline = scripts.filter(([, attributes]) => !attributes.includes("src="));
  expect(inline).toHaveLength(1);
  vm.runInContext(inline[0][2], context, { timeout: 1000 });
  return { elements, initialized, rendered, fetches, window, google };
}

async function withPage(run) {
  const fixture = await helperFixture();
  try {
    const response = await request(fixture);
    await run(fixture, response.body);
  } finally {
    await fixture.helper.close();
    await fixture.helper.completion.catch(() => {});
  }
}

describe("T07-S2 served GIS page behavior", () => {
  it("initializes one captured client/nonce popup button without implicit sign-in", async () => {
    await withPage(async (fixture, html) => {
      const page = runPage(html);
      expect(page.initialized).toHaveLength(1);
      const setup = page.initialized[0];
      expect(setup.client_id).toBe(fixture.settings.googleWebClientId);
      expect(setup.nonce).toBe(fixture.challenge.nonce);
      expect(setup.ux_mode).toBe("popup");
      expect(setup.auto_select).toBe(false);
      expect(setup.cancel_on_tap_outside).toBe(false);
      expect(page.rendered).toHaveLength(1);
      expect(page.rendered[0].element).toBe(page.elements.get("google-signin"));
      expect(page.fetches).toHaveLength(0);
      page.elements.get("gis-script").handlers.get("load")();
      expect(page.initialized).toHaveLength(1);
      expect(page.rendered).toHaveLength(1);
    });
  });

  it("posts opaque credential only locally once and shows fixed guidance", async () => {
    await withPage(async (_fixture, html) => {
      const page = runPage(html);
      const response = { credential: "synthetic-opaque-browser-credential" };
      page.initialized[0].callback(response);
      expect(page.fetches).toHaveLength(1);
      const sent = page.fetches[0];
      expect(sent.url).toBe("/credential");
      expect(sent.options.method).toBe("POST");
      expect(sent.options.credentials).toBe("omit");
      expect(sent.options.mode).toBe("same-origin");
      expect(sent.options.headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(sent.options.body);
      expect(Object.keys(body).sort()).toEqual(["csrf", "idToken"]);
      expect(body.idToken).toBe("synthetic-opaque-browser-credential");
      expect(body.csrf).toMatch(/^[A-Za-z0-9_-]{43}$/);
      page.initialized[0].callback({ credential: "synthetic-second-credential" });
      expect(page.fetches).toHaveLength(1);
      await delay(0);
      expect(page.elements.get("status").textContent).toMatch(/success|signed in|complete/i);
      expect(page.elements.get("status").textContent).not.toContain(body.idToken);
    });
  });

  it("visible Cancel posts only CSRF and Google load failure offers safe setup guidance", async () => {
    await withPage(async (_fixture, html) => {
      const page = runPage(html, { googleReady: false });
      expect(page.initialized).toHaveLength(0);
      page.elements.get("gis-script").handlers.get("error")();
      const guidance = page.elements.get("status").textContent;
      expect(guidance).toMatch(/setup|configuration|Google/i);
      expect(guidance).not.toMatch(/paste|synthetic-|idToken/i);
      page.elements.get("cancel").handlers.get("click")();
      expect(page.fetches).toHaveLength(1);
      expect(page.fetches[0].url).toBe("/cancel");
      expect(Object.keys(JSON.parse(page.fetches[0].options.body))).toEqual(["csrf"]);
      await delay(0);
      expect(page.elements.get("status").textContent).toMatch(/cancel/i);
    });
  });

  it("failed exchange displays fixed safe terminal guidance", async () => {
    await withPage(async (_fixture, html) => {
      const page = runPage(html, { fetchOk: false });
      page.initialized[0].callback({ credential: "synthetic-secret" });
      await delay(0);
      expect(page.elements.get("status").textContent).toMatch(/fail|could not|unable/i);
      expect(page.elements.get("status").textContent).not.toContain("synthetic-secret");
      expect(page.elements.get("status").textContent).not.toMatch(/paste/i);
    });
  });
});

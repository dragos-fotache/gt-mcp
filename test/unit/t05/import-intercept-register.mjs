// Registration entry for the import-interception hooks. Loaded via
// `node --import <this file>` so the resolve hook is active before the
// runner entry (and therefore before any calibrated or production target)
// is resolved or executed.
import { register } from "node:module";

register(new URL("./intercept-hooks.mjs", import.meta.url));

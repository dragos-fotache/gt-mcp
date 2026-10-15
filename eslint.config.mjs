import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "coverage/**",
      "shared-docs/**",
      ".pi/**",
      "*.tsbuildinfo",
      "package-lock.json",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // QA-owned black-box harness helpers/tests (plain .mjs, Node runtime).
    // Declares read-only Node globals so no-undef stays enabled; no rule
    // suppressions, no extra dependency.
    files: ["test/**/*.mjs"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        URL: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    // Developer-owned T02 experiment plain modules (fixture/driver/
    // diagnostics, Node runtime). Scoped read-only Node globals so no-undef
    // stays enabled; no rule suppressions, no extra dependency. Generated
    // experiments/t02/dist is ignored above.
    files: ["experiments/t02/**/*.mjs"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        URL: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
);

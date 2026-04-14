// @ts-check
import js          from "@eslint/js"
import tsPlugin    from "@typescript-eslint/eslint-plugin"
import tsParser    from "@typescript-eslint/parser"
import security    from "eslint-plugin-security"
import sonarjs     from "eslint-plugin-sonarjs"
import reactHooks  from "eslint-plugin-react-hooks"
import noSecrets   from "eslint-plugin-no-secrets"
import globals     from "globals"

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  // ── Base recommended ───────────────────────────────────────────────────────
  js.configs.recommended,

  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
      "coverage/**",
      "infrastructure/**",
      "prisma/**",
      "eslint.config.mjs",
      "vitest.config.ts",
      "next.config.ts",
      "postcss.config.mjs",
      "tailwind.config.ts",
    ],
  },

  // ── TypeScript + React files ───────────────────────────────────────────────
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project:         "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      // Provide all globals used in a Next.js app:
      // Node built-ins (process, Buffer, console) + browser APIs (window, fetch, React JSX)
      globals: {
        ...globals.node,
        ...globals.browser,
        React: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      security,
      sonarjs,
      "react-hooks":  reactHooks,
      "no-secrets":   noSecrets,
    },
    rules: {
      // ── TypeScript safety ──────────────────────────────────────────────────
      "@typescript-eslint/no-explicit-any":          "error",
      // Disable base no-unused-vars; TS version handles it
      "no-unused-vars":                              "off",
      "@typescript-eslint/no-unused-vars":           ["error", {
        argsIgnorePattern:          "^_",
        caughtErrorsIgnorePattern:  "^_",
        varsIgnorePattern:          "^_",
      }],
      "@typescript-eslint/no-floating-promises":     "error",
      "@typescript-eslint/no-misused-promises":      ["error", {
        // onClick and other event handlers commonly wrap async fns — allow void return
        checksVoidReturn: { attributes: false },
      }],
      "@typescript-eslint/await-thenable":           "error",
      "@typescript-eslint/consistent-type-imports":  ["warn", { prefer: "type-imports" }],

      // ── React Hooks ────────────────────────────────────────────────────────
      "react-hooks/rules-of-hooks":  "error",
      "react-hooks/exhaustive-deps": "warn",

      // ── Injection prevention ───────────────────────────────────────────────
      "no-eval":         "error",
      "no-implied-eval": "error",
      "no-new-func":     "error",
      "no-script-url":   "error",

      // ── Console discipline ─────────────────────────────────────────────────
      "no-console": ["warn", { allow: ["error", "warn"] }],

      // ── Escape sequences ───────────────────────────────────────────────────
      "no-useless-escape": "warn",

      // ── Security plugin ────────────────────────────────────────────────────
      // detect-object-injection has many false positives on typed dictionary lookups
      "security/detect-object-injection":        "off",
      "security/detect-non-literal-regexp":      "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-eval-with-expression":    "error",
      "security/detect-pseudoRandomBytes":       "error",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-unsafe-regex":            "error",
      "security/detect-buffer-noassert":         "error",
      "security/detect-child-process":           "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-new-buffer":              "error",

      // ── SonarJS quality ──────────────────────────────────────────────────���─
      "sonarjs/no-duplicate-string":    ["warn", { threshold: 5 }],
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/cognitive-complexity":   ["warn", 20],
      "sonarjs/no-redundant-boolean":   "error",

      // ── Secrets detection ──────────────────────────────────────────────────
      // Prevents accidental hardcoding of API keys, tokens, passwords.
      // Critical for eclat which handles KMS keys, Stripe keys, and Razorpay secrets.
      "no-secrets/no-secrets": ["error", { tolerance: 4.2 }],
    },
  },

  // ── Test files — relax some rules ─────────────────────────────────────────
  {
    files: ["**/__tests__/**/*.ts", "**/tests/**/*.ts", "**/*.test.ts"],
    rules: {
      "sonarjs/no-duplicate-string": "off",
      "no-console":                  "off",
    },
  },
];

export default eslintConfig;

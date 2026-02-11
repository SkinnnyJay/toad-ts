import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "max-lines": [
        "error",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      "no-undef": "off", // TypeScript handles this
      "no-unused-vars": "off", // TypeScript handles this
    },
  },
  {
    files: ["src/ui/components/App.tsx", "src/ui/components/chat/slash-command-runner.ts"],
    rules: {
      "max-lines": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "scratchpad/**",
      "ref/**",
      "skills/**",
      ".cursor/skills/**",
      ".claude/skills/**",
      "*.config.js",
      "*.config.ts",
      "**/*.test.ts",
      "**/*.spec.ts",
    ],
  },
];

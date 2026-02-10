import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    {
      name: "opentui-file-imports",
      enforce: "pre",
      load(id) {
        const [cleanId] = id.split("?");
        if (cleanId.endsWith(".scm") || cleanId.endsWith(".wasm")) {
          return `export default ${JSON.stringify(cleanId)};`;
        }
        return null;
      },
    },
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/shared": resolve(__dirname, "./src"),
      "react-reconciler/constants": resolve(
        __dirname,
        "./node_modules/react-reconciler/constants.js"
      ),
    },
  },
  assetsInclude: ["**/*.scm"],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./__tests__/env.ts", "./__tests__/setup.ts"],
    server: {
      deps: {
        inline: ["@opentui/core", "@opentui/react"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.config.*",
        "**/*.test.*",
        "**/test/**",
      ],
    },
    exclude: [
      "scratchpad/**",
      "node_modules/**",
      ".opencode/**",
      "ref/**",
    ],
  },
});

import { defineConfig } from "tsup";
import { resolve } from "path";

export default defineConfig({
  entry: ["src/cliBootstrap.ts", "src/cli.ts", "src/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  outDir: "dist",
  // Keep native/binary + environment-specific packages external.
  // This avoids bundling runtime-specific entrypoints (e.g. Bun) into a Node CLI build.
  external: [
    "keytar",
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "prisma",
  ],
  noExternal: ["@opentui/react", "react-reconciler"],
  target: "es2022",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
  esbuildOptions(options) {
    // Force Node export conditions even when building under Bun.
    options.conditions = ["node", "import", "default"];
    options.alias = {
      "@": resolve(__dirname, "./src"),
      "@/shared": resolve(__dirname, "./src"),
    };
  },
});

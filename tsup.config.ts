import { defineConfig } from "tsup";
import { resolve } from "path";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  outDir: "dist",
  external: ["keytar"],
  target: "es2022",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
  esbuildOptions(options) {
    options.alias = {
      "@": resolve(__dirname, "./src"),
      "@/shared": resolve(__dirname, "./src"),
    };
  },
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageJson {
  scripts?: Record<string, string>;
}

const readPackageScripts = (): Record<string, string> => {
  const packagePath = join(process.cwd(), "package.json");
  const raw = readFileSync(packagePath, "utf8");
  const parsed = JSON.parse(raw) as PackageJson;
  return parsed.scripts ?? {};
};

describe("package quality scripts", () => {
  it("uses formatter-only validation for format:check", () => {
    const scripts = readPackageScripts();
    const formatCheck = scripts["format:check"];

    expect(formatCheck).toBeDefined();
    expect(formatCheck).toContain("biome check");
    expect(formatCheck).toContain("--linter-enabled=false");
    expect(formatCheck).toContain("--organize-imports-enabled=false");
  });

  it("points grouped test scripts at existing test directories", () => {
    const scripts = readPackageScripts();

    expect(scripts["test:unit"]).toContain("__tests__/unit");
    expect(scripts["test:integration"]).toContain("__tests__/integration");
    expect(scripts["test:e2e"]).toContain("__tests__/e2e");

    expect(scripts["test:unit"]).not.toContain("vitest.unit.config.ts");
    expect(scripts["test:integration"]).not.toContain("vitest.integration.config.ts");
    expect(scripts["test:e2e"]).not.toContain("vitest.e2e.config.ts");
  });

  it("keeps strict literal and format gates in build:test:all", () => {
    const scripts = readPackageScripts();
    const fullGate = scripts["build:test:all"];

    expect(fullGate).toBeDefined();
    expect(fullGate).toContain("bun run format:check");
    expect(fullGate).toContain("bun run check:literals:strict");
    expect(fullGate).toContain("bun run test:unit");
    expect(fullGate).toContain("bun run test:integration");
    expect(fullGate).toContain("bun run test:e2e");
  });
});

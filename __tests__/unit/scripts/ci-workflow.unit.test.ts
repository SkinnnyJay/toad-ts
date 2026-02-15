import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readCiWorkflow = (): string => {
  const workflowPath = join(process.cwd(), ".github", "workflows", "ci.yml");
  return readFileSync(workflowPath, "utf8");
};

describe("CI quality workflow", () => {
  it("runs the canonical build:test:all quality gate", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("- name: Quality gate");
    expect(workflow).toContain("run: bun run build:test:all");
  });

  it("does not duplicate legacy separate quality steps", () => {
    const workflow = readCiWorkflow();

    expect(workflow).not.toContain("- name: Lint");
    expect(workflow).not.toContain("- name: Typecheck");
    expect(workflow).not.toContain("- name: Unit tests");
    expect(workflow).not.toContain("- name: Build");
  });

  it("runs nutjs smoke checks across linux, macos, and windows", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("nutjs-smoke:");
    expect(workflow).toContain("os: [ubuntu-latest, macos-latest, windows-latest]");
    expect(workflow).toContain("- name: NutJS smoke checks");
    expect(workflow).toContain(
      "run: bunx vitest run __tests__/e2e/skippable.nutjs-smoke.e2e.test.ts"
    );
  });
});

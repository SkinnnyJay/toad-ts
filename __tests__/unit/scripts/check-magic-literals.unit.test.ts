import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT_PATH = join(process.cwd(), "scripts/check-magic-literals.ts");

const tempDirs: string[] = [];

const createTempWorkspace = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "toad-magic-literals-"));
  tempDirs.push(dir);
  mkdirSync(join(dir, "src"), { recursive: true });
  return dir;
};

const runLiteralCheckStrict = (cwd: string): ReturnType<typeof spawnSync> =>
  spawnSync(process.execPath, [SCRIPT_PATH, "--strict"], {
    cwd,
    encoding: "utf8",
  });

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("check-magic-literals strict mode", () => {
  it("passes when no issues are detected", () => {
    const cwd = createTempWorkspace();
    writeFileSync(join(cwd, "src", "clean.ts"), "export const ok = 1;\n", "utf8");

    const result = runLiteralCheckStrict(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No magic literals detected");
  });

  it("fails when medium-severity magic numbers are detected", () => {
    const cwd = createTempWorkspace();
    writeFileSync(join(cwd, "src", "issues.ts"), "export const timeoutMs = 4000;\n", "utf8");

    const result = runLiteralCheckStrict(cwd);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Strict mode: failing because issues were detected");
  });

  it("ignores magic numbers inside block comments", () => {
    const cwd = createTempWorkspace();
    writeFileSync(
      join(cwd, "src", "commented.ts"),
      "/*\n  suggested timeout is 4000\n*/\nexport const ok = 1;\n",
      "utf8"
    );

    const result = runLiteralCheckStrict(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No magic literals detected");
  });
});

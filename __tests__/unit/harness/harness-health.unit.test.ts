import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ENV_KEY } from "@/constants/env-keys";
import { checkHarnessHealth } from "@/harness/harness-health";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { describe, expect, it } from "vitest";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "toad-harness-"));

describe("checkHarnessHealth", () => {
  it("marks harness command as available when found in PATH", async () => {
    const tempDir = await createTempDir();
    const commandName = "mock-cli";
    await writeFile(join(tempDir, commandName), "echo ok", "utf8");

    const harnesses = {
      mock: harnessConfigSchema.parse({
        id: "mock",
        name: "Mock",
        command: commandName,
        args: [],
        env: {},
        cwd: tempDir,
      }),
    };

    const [result] = checkHarnessHealth(harnesses, {
      [ENV_KEY.PATH]: tempDir,
    });

    expect(result?.available).toBe(true);
  });

  it("marks harness command as missing when not found", () => {
    const harnesses = {
      missing: harnessConfigSchema.parse({
        id: "missing",
        name: "Missing",
        command: "not-found",
        args: [],
        env: {},
      }),
    };

    const [result] = checkHarnessHealth(harnesses, {
      [ENV_KEY.PATH]: "",
    });

    expect(result?.available).toBe(false);
  });
});

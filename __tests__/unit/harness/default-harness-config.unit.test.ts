import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import { describe, expect, it } from "vitest";

describe("createDefaultHarnessConfig", () => {
  it("returns non-cursor defaults when cursor feature flag is unset", () => {
    const result = createDefaultHarnessConfig({});
    const harnessIds = Object.keys(result.harnesses);

    expect(result.harnessId).toBe(HARNESS_DEFAULT.CLAUDE_CLI_ID);
    expect(result.harness.id).toBe(HARNESS_DEFAULT.CLAUDE_CLI_ID);
    expect(harnessIds).toEqual([
      HARNESS_DEFAULT.CLAUDE_CLI_ID,
      HARNESS_DEFAULT.GEMINI_CLI_ID,
      HARNESS_DEFAULT.CODEX_CLI_ID,
      HARNESS_DEFAULT.MOCK_ID,
    ]);
    expect(harnessIds).not.toContain(HARNESS_DEFAULT.CURSOR_CLI_ID);
  });

  it("includes cursor harness when cursor feature flag is numeric truthy", () => {
    const result = createDefaultHarnessConfig({
      [ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]: "1",
    });
    const harnessIds = Object.keys(result.harnesses);

    expect(harnessIds).toContain(HARNESS_DEFAULT.CURSOR_CLI_ID);
    expect(result.harnesses[HARNESS_DEFAULT.CURSOR_CLI_ID]).toMatchObject({
      id: HARNESS_DEFAULT.CURSOR_CLI_ID,
      name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
      command: HARNESS_DEFAULT.CURSOR_COMMAND,
      args: HARNESS_DEFAULT.CURSOR_ARGS,
    });
  });

  it("includes cursor harness when cursor feature flag is padded true", () => {
    const result = createDefaultHarnessConfig({
      [ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]: " true ",
    });
    const harnessIds = Object.keys(result.harnesses);

    expect(harnessIds).toContain(HARNESS_DEFAULT.CURSOR_CLI_ID);
  });

  it.each(["false", "0", "maybe"] as const)(
    "does not include cursor harness when cursor feature flag is %s",
    (flagValue) => {
      const result = createDefaultHarnessConfig({
        [ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]: flagValue,
        [ENV_KEY.TOADSTOOL_CURSOR_COMMAND]: "cursor-custom",
        [ENV_KEY.TOADSTOOL_CURSOR_ARGS]: "--mode plan",
      });
      const harnessIds = Object.keys(result.harnesses);

      expect(harnessIds).not.toContain(HARNESS_DEFAULT.CURSOR_CLI_ID);
    }
  );

  it("parses command argument overrides from environment", () => {
    const result = createDefaultHarnessConfig({
      [ENV_KEY.TOADSTOOL_CLAUDE_ARGS]: "--sandbox enabled --force",
      [ENV_KEY.TOADSTOOL_GEMINI_ARGS]: " --model gemini-2.5-pro ",
      [ENV_KEY.TOADSTOOL_CODEX_ARGS]: "--mode agent",
      [ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]: "true",
      [ENV_KEY.TOADSTOOL_CURSOR_ARGS]: " --mode plan --browser ",
    });

    expect(result.harnesses[HARNESS_DEFAULT.CLAUDE_CLI_ID]?.args).toEqual([
      "--sandbox",
      "enabled",
      "--force",
    ]);
    expect(result.harnesses[HARNESS_DEFAULT.GEMINI_CLI_ID]?.args).toEqual([
      "--model",
      "gemini-2.5-pro",
    ]);
    expect(result.harnesses[HARNESS_DEFAULT.CODEX_CLI_ID]?.args).toEqual(["--mode", "agent"]);
    expect(result.harnesses[HARNESS_DEFAULT.CURSOR_CLI_ID]?.args).toEqual([
      "--mode",
      "plan",
      "--browser",
    ]);
  });

  it("treats explicit empty argument overrides as empty arrays", () => {
    const result = createDefaultHarnessConfig({
      [ENV_KEY.TOADSTOOL_CLAUDE_ARGS]: "",
      [ENV_KEY.TOADSTOOL_GEMINI_ARGS]: "",
      [ENV_KEY.TOADSTOOL_CODEX_ARGS]: "",
      [ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]: "true",
      [ENV_KEY.TOADSTOOL_CURSOR_ARGS]: "",
    });

    expect(result.harnesses[HARNESS_DEFAULT.CLAUDE_CLI_ID]?.args).toEqual([]);
    expect(result.harnesses[HARNESS_DEFAULT.GEMINI_CLI_ID]?.args).toEqual([]);
    expect(result.harnesses[HARNESS_DEFAULT.CODEX_CLI_ID]?.args).toEqual([]);
    expect(result.harnesses[HARNESS_DEFAULT.CURSOR_CLI_ID]?.args).toEqual([]);
  });

  it("falls back to default commands when command overrides are blank", () => {
    const result = createDefaultHarnessConfig({
      [ENV_KEY.TOADSTOOL_CLAUDE_COMMAND]: "   ",
      [ENV_KEY.TOADSTOOL_GEMINI_COMMAND]: "   ",
      [ENV_KEY.TOADSTOOL_CODEX_COMMAND]: "   ",
      [ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]: "true",
      [ENV_KEY.TOADSTOOL_CURSOR_COMMAND]: "   ",
    });

    expect(result.harnesses[HARNESS_DEFAULT.CLAUDE_CLI_ID]?.command).toBe(
      HARNESS_DEFAULT.CLAUDE_COMMAND
    );
    expect(result.harnesses[HARNESS_DEFAULT.GEMINI_CLI_ID]?.command).toBe(
      HARNESS_DEFAULT.GEMINI_COMMAND
    );
    expect(result.harnesses[HARNESS_DEFAULT.CODEX_CLI_ID]?.command).toBe(
      HARNESS_DEFAULT.CODEX_COMMAND
    );
    expect(result.harnesses[HARNESS_DEFAULT.CURSOR_CLI_ID]?.command).toBe(
      HARNESS_DEFAULT.CURSOR_COMMAND
    );
  });
});

import { describe, expect, it } from "vitest";
import { ENV_KEY } from "../../../src/constants/env-keys";
import { HARNESS_DEFAULT } from "../../../src/constants/harness-defaults";
import { createDefaultHarnessConfig } from "../../../src/harness/defaultHarnessConfig";
import type { HarnessAdapter } from "../../../src/harness/harnessAdapter";
import { harnessConfigSchema } from "../../../src/harness/harnessConfig";

describe("HarnessAdapter", () => {
  describe("createDefaultHarnessConfig()", () => {
    it("should create default config with claude command", () => {
      const result = createDefaultHarnessConfig();

      expect(result.harnessId).toBe(HARNESS_DEFAULT.CLAUDE_CLI_ID);
      expect(result.harness.id).toBe(HARNESS_DEFAULT.CLAUDE_CLI_ID);
      expect(result.harness.command).toBe(HARNESS_DEFAULT.CLAUDE_COMMAND);
    });

    it("should use environment variable for command", () => {
      const env = {
        [ENV_KEY.TOADSTOOL_CLAUDE_COMMAND]: "custom-claude",
      };

      const result = createDefaultHarnessConfig(env);

      expect(result.harness.command).toBe("custom-claude");
    });

    it("should parse args from environment variable", () => {
      const env = {
        [ENV_KEY.TOADSTOOL_CLAUDE_ARGS]: "arg1 arg2  arg3",
      };

      const result = createDefaultHarnessConfig(env);

      expect(result.harness.args).toEqual(["arg1", "arg2", "arg3"]);
    });

    it("should create both claude and mock harnesses", () => {
      const result = createDefaultHarnessConfig();

      expect(result.harnesses[HARNESS_DEFAULT.CLAUDE_CLI_ID]).toBeDefined();
      expect(result.harnesses[HARNESS_DEFAULT.GEMINI_CLI_ID]).toBeDefined();
      expect(result.harnesses[HARNESS_DEFAULT.CODEX_CLI_ID]).toBeDefined();
      expect(result.harnesses[HARNESS_DEFAULT.MOCK_ID]).toBeDefined();
    });

    it("should use environment overrides for gemini and codex commands", () => {
      const env = {
        [ENV_KEY.TOADSTOOL_GEMINI_COMMAND]: "custom-gemini",
        [ENV_KEY.TOADSTOOL_CODEX_COMMAND]: "custom-codex",
      };

      const result = createDefaultHarnessConfig(env);

      expect(result.harnesses[HARNESS_DEFAULT.GEMINI_CLI_ID]?.command).toBe("custom-gemini");
      expect(result.harnesses[HARNESS_DEFAULT.CODEX_CLI_ID]?.command).toBe("custom-codex");
    });

    it("should validate config with schema", () => {
      const result = createDefaultHarnessConfig();

      // Should not throw when parsing
      expect(() => harnessConfigSchema.parse(result.harness)).not.toThrow();
      expect(() =>
        harnessConfigSchema.parse(result.harnesses[HARNESS_DEFAULT.GEMINI_CLI_ID])
      ).not.toThrow();
      expect(() =>
        harnessConfigSchema.parse(result.harnesses[HARNESS_DEFAULT.CODEX_CLI_ID])
      ).not.toThrow();
      expect(() =>
        harnessConfigSchema.parse(result.harnesses[HARNESS_DEFAULT.MOCK_ID])
      ).not.toThrow();
    });
  });

  describe("HarnessAdapter interface", () => {
    it("should have required properties", () => {
      // This is a type check - verify the interface structure
      const mockAdapter: HarnessAdapter = {
        id: "test",
        name: "Test",
        configSchema: harnessConfigSchema,
        createHarness: () => {
          throw new Error("Not implemented");
        },
      };

      expect(mockAdapter.id).toBe("test");
      expect(mockAdapter.name).toBe("Test");
      expect(mockAdapter.configSchema).toBe(harnessConfigSchema);
    });
  });
});

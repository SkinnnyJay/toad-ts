import {
  AGENT_MANAGEMENT_CAPABILITY,
  AGENT_MANAGEMENT_COMMAND,
} from "@/constants/agent-management-commands";
import { ENV_KEY } from "@/constants/env-keys";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import {
  hasCapability,
  mapClaudeStatusLines,
  mapGeminiStatusLines,
  parseAboutVersionForHarness,
  resolveNativeCommandArgs,
  unsupportedCapabilityMessage,
} from "@/ui/components/chat/agent-management-command-resolver";
import { describe, expect, it } from "vitest";

describe("agent-management-command-resolver", () => {
  it("maps native about and codex status command args", () => {
    const cursorHarness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const codexHarness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });
    const claudeHarness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {},
    });
    const geminiHarness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {},
    });

    expect(resolveNativeCommandArgs(cursorHarness, AGENT_MANAGEMENT_COMMAND.ABOUT)).toEqual([
      AGENT_MANAGEMENT_COMMAND.ABOUT,
    ]);
    expect(resolveNativeCommandArgs(claudeHarness, AGENT_MANAGEMENT_COMMAND.ABOUT)).toEqual([
      "--version",
    ]);
    expect(resolveNativeCommandArgs(codexHarness, AGENT_MANAGEMENT_COMMAND.STATUS)).toEqual([
      AGENT_MANAGEMENT_COMMAND.LOGIN,
      AGENT_MANAGEMENT_COMMAND.STATUS,
    ]);
    expect(resolveNativeCommandArgs(geminiHarness, AGENT_MANAGEMENT_COMMAND.STATUS)).toEqual([
      "list-sessions",
    ]);
    expect(parseAboutVersionForHarness(claudeHarness, "claude 3.0.0")).toBe("claude 3.0.0");
    expect(parseAboutVersionForHarness(codexHarness, "codex 0.1.0")).toBe("codex 0.1.0");
    expect(parseAboutVersionForHarness(geminiHarness, "gemini 2.2.0")).toBe("gemini 2.2.0");
  });

  it("reports capability support and unsupported messaging", () => {
    const codexHarness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    expect(hasCapability(codexHarness, AGENT_MANAGEMENT_CAPABILITY.MCP)).toBe(false);
    expect(unsupportedCapabilityMessage(codexHarness, AGENT_MANAGEMENT_CAPABILITY.MCP)).toContain(
      "Codex CLI"
    );
  });

  it("derives claude and gemini status lines from env settings", () => {
    const claudeHarness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {
        [ENV_KEY.ANTHROPIC_API_KEY]: "anthropic-key",
      },
    });
    const geminiHarness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {
        [ENV_KEY.GEMINI_API_KEY]: "gemini-key",
      },
    });

    expect(mapClaudeStatusLines(claudeHarness)).toEqual(["Authenticated: yes", "Method: api_key"]);
    expect(mapGeminiStatusLines(geminiHarness)).toEqual([
      "Authenticated: yes",
      "Method: api_key",
      "Key source: GEMINI_API_KEY",
    ]);
  });
});

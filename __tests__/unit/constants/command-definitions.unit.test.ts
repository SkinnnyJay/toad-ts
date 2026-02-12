import { COMMAND_DEFINITIONS, filterSlashCommandsForAgent } from "@/constants/command-definitions";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { describe, expect, it } from "vitest";

describe("command definitions", () => {
  it("registers cloud command metadata with cursor-only agent filter", () => {
    const cloudCommand = COMMAND_DEFINITIONS.find(
      (definition) => definition.name === SLASH_COMMAND.CLOUD
    );
    expect(cloudCommand).toBeDefined();
    expect(cloudCommand).toEqual(
      expect.objectContaining({
        name: SLASH_COMMAND.CLOUD,
        category: "provider",
        agents: [HARNESS_DEFAULT.CURSOR_CLI_ID],
      })
    );
  });

  it("filters cloud command for non-cursor harnesses", () => {
    const cursorCommands = filterSlashCommandsForAgent(COMMAND_DEFINITIONS, {
      id: HARNESS_DEFAULT.CURSOR_CLI_ID,
      name: "Cursor",
      harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
    });
    const claudeCommands = filterSlashCommandsForAgent(COMMAND_DEFINITIONS, {
      id: HARNESS_DEFAULT.CLAUDE_CLI_ID,
      name: "Claude",
      harnessId: HARNESS_DEFAULT.CLAUDE_CLI_ID,
    });

    expect(cursorCommands.some((definition) => definition.name === SLASH_COMMAND.CLOUD)).toBe(true);
    expect(claudeCommands.some((definition) => definition.name === SLASH_COMMAND.CLOUD)).toBe(
      false
    );
  });

  it("registers MCP command metadata with supported harness filters", () => {
    const mcpCommand = COMMAND_DEFINITIONS.find(
      (definition) => definition.name === SLASH_COMMAND.MCP
    );
    expect(mcpCommand).toBeDefined();
    expect(mcpCommand).toEqual(
      expect.objectContaining({
        name: SLASH_COMMAND.MCP,
        category: "provider",
        agents: [
          HARNESS_DEFAULT.CLAUDE_CLI_ID,
          HARNESS_DEFAULT.GEMINI_CLI_ID,
          HARNESS_DEFAULT.CURSOR_CLI_ID,
        ],
      })
    );
  });

  it("filters MCP command for unsupported harnesses", () => {
    const cursorCommands = filterSlashCommandsForAgent(COMMAND_DEFINITIONS, {
      id: HARNESS_DEFAULT.CURSOR_CLI_ID,
      name: "Cursor",
      harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
    });
    const codexCommands = filterSlashCommandsForAgent(COMMAND_DEFINITIONS, {
      id: HARNESS_DEFAULT.CODEX_CLI_ID,
      name: "Codex",
      harnessId: HARNESS_DEFAULT.CODEX_CLI_ID,
    });
    const mockCommands = filterSlashCommandsForAgent(COMMAND_DEFINITIONS, {
      id: HARNESS_DEFAULT.MOCK_ID,
      name: "Mock",
      harnessId: HARNESS_DEFAULT.MOCK_ID,
    });

    expect(cursorCommands.some((definition) => definition.name === SLASH_COMMAND.MCP)).toBe(true);
    expect(codexCommands.some((definition) => definition.name === SLASH_COMMAND.MCP)).toBe(false);
    expect(mockCommands.some((definition) => definition.name === SLASH_COMMAND.MCP)).toBe(false);
  });
});

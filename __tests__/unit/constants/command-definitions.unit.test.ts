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
});

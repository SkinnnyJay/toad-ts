import { COMMAND_DEFINITIONS } from "@/constants/command-definitions";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { describe, expect, it } from "vitest";

const hasCommand = (commandName: string): boolean => {
  return COMMAND_DEFINITIONS.some((definition) => definition.name === commandName);
};

describe("command definitions", () => {
  it("includes unified agent management commands", () => {
    expect(hasCommand(SLASH_COMMAND.AGENT)).toBe(true);
    expect(hasCommand(SLASH_COMMAND.LOGOUT)).toBe(true);
    expect(hasCommand(SLASH_COMMAND.MCP)).toBe(true);
  });
});

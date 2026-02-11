import { SLASH_COMMAND } from "@/constants/slash-commands";
import { type SlashCommandDeps, runSlashCommand } from "@/ui/components/chat/slash-command-runner";
import { describe, expect, it, vi } from "vitest";

const createDeps = (
  overrides: Partial<SlashCommandDeps> = {}
): { deps: SlashCommandDeps; appendSystemMessage: ReturnType<typeof vi.fn> } => {
  const appendSystemMessage = vi.fn();
  const deps: SlashCommandDeps = {
    appendSystemMessage,
    getSession: () => undefined,
    getMessagesForSession: () => [],
    getPlanBySession: () => undefined,
    listSessions: () => [],
    upsertSession: () => {},
    clearMessagesForSession: () => {},
    upsertPlan: () => {},
    ...overrides,
  };
  return { deps, appendSystemMessage };
};

describe("slash command agent management", () => {
  it("runs /logout for active cursor harness", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "Logged out successfully",
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: "cursor-cli",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.LOGOUT, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["logout"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Logout command"));
  });

  it("shows usage for /agent with no subcommand", () => {
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: "cursor-cli",
      runAgentCommand: vi.fn(),
    });

    expect(runSlashCommand(SLASH_COMMAND.AGENT, deps)).toBe(true);
    expect(appendSystemMessage).toHaveBeenCalledWith("Usage: /agent <subcommand...>");
  });

  it("runs /mcp with default list behavior on cursor", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "github: loaded",
      stderr: "",
      exitCode: 0,
    }));
    const { deps } = createDeps({
      activeHarnessId: "cursor-cli",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.MCP, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["mcp", "list"]);
  });

  it("fetches native model list when /models has no active session", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "auto - Auto\nopus-4.6-thinking - Claude 4.6 Opus (Thinking) (default)",
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: "cursor-cli",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.MODELS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["models"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Available models"));
  });
});

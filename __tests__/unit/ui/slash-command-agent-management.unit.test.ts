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

  it("uses /model alias to fetch model list", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "auto - Auto",
      stderr: "",
      exitCode: 0,
    }));
    const { deps } = createDeps({
      activeHarnessId: "cursor-cli",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.MODEL, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["models"]);
  });

  it("shows gemini login hint instead of running CLI login", () => {
    const runAgentCommand = vi.fn();
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: "gemini-cli",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.LOGIN, deps)).toBe(true);
    expect(runAgentCommand).not.toHaveBeenCalled();
    expect(appendSystemMessage).toHaveBeenCalledWith(
      "Gemini uses API-key auth. Set GOOGLE_API_KEY or GEMINI_API_KEY in your environment."
    );
  });

  it("blocks unsupported logout and mcp commands by harness", () => {
    const runAgentCommand = vi.fn();
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: "claude-cli",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.LOGOUT, deps)).toBe(true);
    expect(appendSystemMessage).toHaveBeenCalledWith(
      "Logout is not supported for the active provider."
    );

    const codexDeps = createDeps({
      activeHarnessId: "codex-cli",
      runAgentCommand,
    });
    expect(runSlashCommand(SLASH_COMMAND.MCP, codexDeps.deps)).toBe(true);
    expect(codexDeps.appendSystemMessage).toHaveBeenCalledWith(
      "MCP command is not supported for the active provider."
    );
  });

  it("reports native command failures for /agent", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "permission denied",
      exitCode: 1,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: "cursor-cli",
      runAgentCommand,
    });

    expect(runSlashCommand("/agent status", deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Native agent command failed.")
    );
  });

  it("runs native status command for cursor harness", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "Model: Auto\nOS: linux",
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: "cursor-cli",
      activeAgentName: "Cursor CLI",
      connectionStatus: "connected",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.STATUS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["status"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Agent status (Cursor CLI):")
    );
  });

  it("runs codex status via login status command", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "logged in as codex@example.com",
      stderr: "",
      exitCode: 0,
    }));
    const { deps } = createDeps({
      activeHarnessId: "codex-cli",
      connectionStatus: "connected",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.STATUS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["login", "status"]);
  });
});

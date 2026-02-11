import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
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
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
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
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
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
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
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
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
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
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.MODEL, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["models"]);
  });

  it("reports /models command failures from native management command", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "models endpoint unavailable",
      exitCode: 1,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.MODELS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["models"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Model listing is not available for this provider.")
    );
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("models endpoint unavailable")
    );
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
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand("/agent status", deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Native agent command failed.")
    );
  });

  it("reports fallback exit code when /agent failure has no output", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "",
      exitCode: 1,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand("/agent status", deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Native agent command failed. (exit 1)")
    );
  });

  it("runs native status command for cursor harness", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "Model: Auto\nOS: linux",
      stderr: "",
      exitCode: 0,
    }));
    const listCloudAgents = vi.fn(async () => 4);
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      activeAgentName: "Cursor CLI",
      connectionStatus: "connected",
      runAgentCommand,
      listCloudAgents,
    });

    expect(runSlashCommand(SLASH_COMMAND.STATUS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["status"]);
    expect(listCloudAgents).toHaveBeenCalledTimes(1);
    expect(appendSystemMessage).toHaveBeenCalledWith("Cloud agents: 4");
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Agent status (Cursor CLI):")
    );
  });

  it("parses native status key-value output with equals separator", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "Model = Auto\nOS=linux",
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      activeAgentName: "Cursor CLI",
      connectionStatus: "connected",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.STATUS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["status"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Model: Auto"));
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("OS: linux"));
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

  it("parses codex status auth from stderr when stdout is empty", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "logged in as codex-stderr@example.com",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: "codex-cli",
      activeAgentName: "Codex CLI",
      connectionStatus: "connected",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.STATUS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["login", "status"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Agent status (Codex CLI):")
    );
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Authenticated: yes"));
  });

  it("fetches native cursor sessions for /sessions", async () => {
    const duplicated = "9b7418b2-5b71-4a12-97b4-64f2131e5241";
    const runAgentCommand = vi.fn(async () => ({
      stdout: `${duplicated}\n36bf2c71-c56a-4c0a-a2e6-f7d47c2cd2e7\n${duplicated}\nsession-resume-id Native title model: gpt-5 messages: 14 createdAt=2026-02-11T18:30:00Z`,
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.SESSIONS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["ls"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Agent sessions:"));
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining(duplicated));
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("session-resume-id"));
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Native title"));
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("created: 2026-02-11T18:30:00.000Z")
    );
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("model: gpt-5"));
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("messages: 14"));
    const lastMessage = appendSystemMessage.mock.calls.at(-1)?.[0];
    expect(typeof lastMessage).toBe("string");
    if (typeof lastMessage === "string") {
      expect(lastMessage.indexOf(duplicated)).toBeGreaterThanOrEqual(0);
      expect(lastMessage.lastIndexOf(duplicated)).toBe(lastMessage.indexOf(duplicated));
    }
  });

  it("orders fallback /sessions output by newest created timestamp", async () => {
    const newest = "session-newest-id";
    const oldest = "session-oldest-id";
    const runAgentCommand = vi.fn(async () => ({
      stdout: [
        `${oldest} Older title model: gpt-4 messages: 2 createdAt=2026-02-10T18:30:00Z`,
        `${newest} Newer title model: gpt-5 messages: 14 createdAt=2026-02-11T18:30:00Z`,
      ].join("\n"),
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.SESSIONS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    const lastMessage = appendSystemMessage.mock.calls.at(-1)?.[0];
    expect(typeof lastMessage).toBe("string");
    if (typeof lastMessage === "string") {
      const newestIndex = lastMessage.indexOf(newest);
      const oldestIndex = lastMessage.indexOf(oldest);
      expect(newestIndex).toBeGreaterThanOrEqual(0);
      expect(oldestIndex).toBeGreaterThanOrEqual(0);
      expect(newestIndex).toBeLessThan(oldestIndex);
    }
  });

  it("parses fallback /sessions output from stderr when stdout has warning noise", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "warning: sessions output redirected to stderr",
      stderr: "session-resume-id Native title model: gpt-5 messages: 14",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.SESSIONS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["ls"]);
    const lastMessage = appendSystemMessage.mock.calls.at(-1)?.[0];
    expect(typeof lastMessage).toBe("string");
    if (typeof lastMessage === "string") {
      expect(lastMessage).toContain("session-resume-id");
      expect(lastMessage).toContain("Native title");
      expect(lastMessage).toContain("model: gpt-5");
      expect(lastMessage).toContain("messages: 14");
    }
  });

  it("prefers runtime-native session listing for /sessions when available", async () => {
    const listAgentSessions = vi.fn(async () => [
      {
        id: "9b7418b2-5b71-4a12-97b4-64f2131e5241",
        title: "Old title",
      },
      {
        id: "9b7418b2-5b71-4a12-97b4-64f2131e5241",
        title: "Native runtime session",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
      { id: "36bf2c71-c56a-4c0a-a2e6-f7d47c2cd2e7" },
    ]);
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      listAgentSessions,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.SESSIONS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(listAgentSessions).toHaveBeenCalledTimes(1);
    expect(runAgentCommand).not.toHaveBeenCalled();
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Agent sessions:"));
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("9b7418b2-5b71-4a12-97b4-64f2131e5241")
    );
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("created: 2026-02-11T18:30:00.000Z")
    );
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("model: gpt-5"));
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("messages: 14"));
    const lastMessage = appendSystemMessage.mock.calls.at(-1)?.[0];
    expect(typeof lastMessage).toBe("string");
    if (typeof lastMessage === "string") {
      const id = "9b7418b2-5b71-4a12-97b4-64f2131e5241";
      expect(lastMessage.indexOf(id)).toBeGreaterThanOrEqual(0);
      expect(lastMessage.lastIndexOf(id)).toBe(lastMessage.indexOf(id));
    }
  });

  it("orders /sessions runtime-native output by newest created timestamp", async () => {
    const newest = "9b7418b2-5b71-4a12-97b4-64f2131e5241";
    const oldest = "36bf2c71-c56a-4c0a-a2e6-f7d47c2cd2e7";
    const listAgentSessions = vi.fn(async () => [
      {
        id: oldest,
        title: "Older session",
        createdAt: "2026-02-10T18:30:00.000Z",
      },
      {
        id: newest,
        title: "Newest session",
        createdAt: "2026-02-11T18:30:00.000Z",
      },
    ]);
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      listAgentSessions,
    });

    expect(runSlashCommand(SLASH_COMMAND.SESSIONS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    const lastMessage = appendSystemMessage.mock.calls.at(-1)?.[0];
    expect(typeof lastMessage).toBe("string");
    if (typeof lastMessage === "string") {
      const newestIndex = lastMessage.indexOf(newest);
      const oldestIndex = lastMessage.indexOf(oldest);
      expect(newestIndex).toBeGreaterThanOrEqual(0);
      expect(oldestIndex).toBeGreaterThanOrEqual(0);
      expect(newestIndex).toBeLessThan(oldestIndex);
    }
  });

  it("reports native session listing failures for /sessions", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "requires tty",
      exitCode: 1,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.SESSIONS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Session listing is not available")
    );
  });

  it("switches to provided session id via /sessions <id>", () => {
    const switchToSession = vi.fn(() => true);
    const { deps, appendSystemMessage } = createDeps({
      switchToSession,
    });

    expect(runSlashCommand("/sessions resumed-session-id", deps)).toBe(true);

    expect(switchToSession).toHaveBeenCalledWith("resumed-session-id");
    expect(appendSystemMessage).toHaveBeenCalledWith("Switched to session: resumed-session-id");
  });

  it("reports unsupported session switching when handler is unavailable", () => {
    const { deps, appendSystemMessage } = createDeps();

    expect(runSlashCommand("/sessions resumed-session-id", deps)).toBe(true);

    expect(appendSystemMessage).toHaveBeenCalledWith(
      "Session switching is not available for this provider."
    );
  });
});

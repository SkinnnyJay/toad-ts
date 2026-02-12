import { CURSOR_AUTH_GUIDANCE } from "@/constants/cursor-auth-guidance";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SESSION_MODE } from "@/constants/session-modes";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { type Session, SessionIdSchema } from "@/types/domain";
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

  it("lists cloud agents for cursor harness", async () => {
    const listCloudAgentItems = vi.fn(async () => [
      {
        id: "agent-1",
        status: "running",
        model: "auto",
        updatedAt: "2026-02-10T10:00:00.000Z",
      },
      {
        id: "agent-2",
        status: "completed",
        updatedAt: "2026-02-11T10:00:00.000Z",
      },
    ]);
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      listCloudAgentItems,
    });

    expect(runSlashCommand("/cloud list", deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(listCloudAgentItems).toHaveBeenCalledTimes(1);
    const cloudAgentsMessage = appendSystemMessage.mock.calls.find((call) =>
      call[0]?.includes("Cloud agents:")
    )?.[0];
    expect(cloudAgentsMessage).toBeDefined();
    expect(cloudAgentsMessage).toContain("agent-2 (completed, updated 2026-02-11T10:00:00.000Z)");
    expect(cloudAgentsMessage).toContain(
      "agent-1 (running, auto, updated 2026-02-10T10:00:00.000Z)"
    );
    expect(cloudAgentsMessage?.indexOf("agent-2")).toBeLessThan(
      cloudAgentsMessage?.indexOf("agent-1") ?? Number.POSITIVE_INFINITY
    );
  });

  it("opens cloud agents panel when /cloud has no subcommand and panel callback exists", () => {
    const openCloudAgents = vi.fn();
    const listCloudAgentItems = vi.fn();
    const { deps } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      openCloudAgents,
      listCloudAgentItems,
    });

    expect(runSlashCommand("/cloud", deps)).toBe(true);
    expect(openCloudAgents).toHaveBeenCalledTimes(1);
    expect(listCloudAgentItems).not.toHaveBeenCalled();
  });

  it("shows cloud status for a specific agent", async () => {
    const getCloudAgentItem = vi.fn(async () => ({
      id: "agent-1",
      status: "running",
      model: "auto",
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      getCloudAgentItem,
    });

    expect(runSlashCommand("/cloud status agent-1", deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(getCloudAgentItem).toHaveBeenCalledWith("agent-1");
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Cloud agent agent-1: running (auto)")
    );
  });

  it("stops cloud agent and reports completion", async () => {
    const stopCloudAgentItem = vi.fn(async () => ({ id: "agent-1" }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      stopCloudAgentItem,
    });

    expect(runSlashCommand("/cloud stop agent-1", deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(stopCloudAgentItem).toHaveBeenCalledWith("agent-1");
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Stop requested for cloud agent agent-1.")
    );
  });

  it("sends cloud follow-up prompt", async () => {
    const followupCloudAgentItem = vi.fn(async () => ({ id: "agent-1" }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      followupCloudAgentItem,
    });

    expect(runSlashCommand("/cloud followup agent-1 continue working", deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(followupCloudAgentItem).toHaveBeenCalledWith("agent-1", "continue working");
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Follow-up queued for cloud agent agent-1.")
    );
  });

  it("dispatches a new cloud agent prompt", async () => {
    const sessionId = SessionIdSchema.parse("cloud-dispatch-session");
    const launchCloudAgentItem = vi.fn(async () => ({ id: "agent-3", status: "queued" }));
    const { deps, appendSystemMessage } = createDeps({
      sessionId,
      getSession: () =>
        ({
          id: sessionId,
          title: "Cloud dispatch session",
          messageIds: [],
          createdAt: 1,
          updatedAt: 1,
          mode: SESSION_MODE.AUTO,
          metadata: { mcpServers: [], model: "auto" },
        }) satisfies Session,
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      launchCloudAgentItem,
      cloudDispatchContext: {
        repository: "owner/repo",
        branch: "feature/cloud-dispatch",
      },
    });

    expect(runSlashCommand("/cloud dispatch investigate flaky CI", deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(launchCloudAgentItem).toHaveBeenCalledWith({
      prompt: "investigate flaky CI",
      model: "auto",
      repository: "owner/repo",
      branch: "feature/cloud-dispatch",
    });
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining(
        "Cloud agent started: agent-3 (queued). [owner/repo @ feature/cloud-dispatch]"
      )
    );
  });

  it("shows auth guidance when cloud dispatch fails with unauthorized error", async () => {
    const sessionId = SessionIdSchema.parse("cloud-auth-session");
    const launchCloudAgentItem = vi.fn(async () => {
      throw new Error("Request failed with status 401");
    });
    const { deps, appendSystemMessage } = createDeps({
      sessionId,
      getSession: () =>
        ({
          id: sessionId,
          title: "Cloud auth session",
          messageIds: [],
          createdAt: 1,
          updatedAt: 1,
          mode: SESSION_MODE.AUTO,
          metadata: { mcpServers: [] },
        }) satisfies Session,
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      launchCloudAgentItem,
    });

    expect(runSlashCommand("/cloud dispatch check auth", deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(appendSystemMessage).toHaveBeenCalledWith(SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED);
  });

  const expectCloudAuthGuidance = async (
    command: string,
    overrides: Partial<SlashCommandDeps>
  ): Promise<void> => {
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      ...overrides,
    });

    expect(runSlashCommand(command, deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });
    expect(appendSystemMessage).toHaveBeenCalledWith(SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED);
  };

  it("shows auth guidance when cloud list fails with unauthorized error", async () => {
    await expectCloudAuthGuidance("/cloud list", {
      listCloudAgentItems: vi.fn(async () => {
        throw new Error("Request failed with status 401");
      }),
    });
  });

  it("shows auth guidance when cloud status fails with unauthorized error", async () => {
    await expectCloudAuthGuidance("/cloud status agent-1", {
      getCloudAgentItem: vi.fn(async () => {
        throw new Error("Request failed with status 401");
      }),
    });
  });

  it("shows auth guidance when cloud stop fails with unauthorized error", async () => {
    await expectCloudAuthGuidance("/cloud stop agent-1", {
      stopCloudAgentItem: vi.fn(async () => {
        throw new Error("Request failed with status 401");
      }),
    });
  });

  it("shows auth guidance when cloud follow-up fails with unauthorized error", async () => {
    await expectCloudAuthGuidance("/cloud followup agent-1 continue", {
      followupCloudAgentItem: vi.fn(async () => {
        throw new Error("Request failed with status 401");
      }),
    });
  });

  it("shows unsupported message for cloud command on non-cursor harness", () => {
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CLAUDE_CLI_ID,
    });

    expect(runSlashCommand("/cloud", deps)).toBe(true);
    expect(appendSystemMessage).toHaveBeenCalledWith(
      "Cloud commands are only available for the Cursor harness."
    );
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

  it("opens MCP panel when /mcp has no subcommand and panel callback exists", () => {
    const openMcpPanel = vi.fn();
    const runAgentCommand = vi.fn();
    const { deps } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      openMcpPanel,
      runAgentCommand,
    });

    expect(runSlashCommand("/mcp", deps)).toBe(true);
    expect(openMcpPanel).toHaveBeenCalledTimes(1);
    expect(runAgentCommand).not.toHaveBeenCalled();
  });

  it("formats MCP list-tools output when server id is provided", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "read_file\nwrite_file",
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand("/mcp list-tools github", deps)).toBe(true);
    await vi.waitFor(() => {
      expect(runAgentCommand.mock.calls.length).toBe(1);
    });

    expect(runAgentCommand).toHaveBeenCalledWith(["mcp", "list-tools", "github"]);
    expect(appendSystemMessage).toHaveBeenCalledWith("MCP tools for github: read_file, write_file");
  });

  it("shows usage when /mcp list-tools is missing server id", () => {
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand: vi.fn(),
    });

    expect(runSlashCommand("/mcp list-tools", deps)).toBe(true);
    expect(appendSystemMessage).toHaveBeenCalledWith("Usage: /mcp list-tools <server-id>");
  });

  it("delegates /mode updates to runtime setSessionMode when available", async () => {
    const sessionId = SessionIdSchema.parse("session-mode");
    const session: Session = {
      id: sessionId,
      title: "Mode session",
      messageIds: [],
      createdAt: 1,
      updatedAt: 1,
      mode: SESSION_MODE.AUTO,
      metadata: { mcpServers: [] },
    };
    const setSessionMode = vi.fn(async () => undefined);
    const { deps, appendSystemMessage } = createDeps({
      sessionId,
      getSession: () => session,
      setSessionMode,
    });

    expect(runSlashCommand("/mode read-only", deps)).toBe(true);
    await vi.waitFor(() => {
      expect(setSessionMode.mock.calls.length).toBe(1);
    });

    expect(setSessionMode).toHaveBeenCalledWith(SESSION_MODE.READ_ONLY);
    expect(appendSystemMessage).toHaveBeenCalledWith("Mode updated to read-only.");
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
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(runAgentCommand).toHaveBeenCalledWith(["models"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Available models"));
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("opus-4.6-thinking (Claude 4.6 Opus (Thinking)) (current)")
    );
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

  it("hydrates session availableModels from fetched /models output", async () => {
    const sessionId = SessionIdSchema.parse("session-model-metadata");
    const session: Session = {
      id: sessionId,
      title: "Model session",
      messageIds: [],
      createdAt: 1,
      updatedAt: 1,
      mode: SESSION_MODE.AUTO,
      metadata: {
        mcpServers: [],
        model: "auto",
        compactionSessionId: SessionIdSchema.parse("compaction-session-id"),
        compactionSummary: "Compaction summary",
      },
    };
    const runAgentCommand = vi.fn(async () => ({
      stdout: "auto - Auto (default)\nfast - Fast Model",
      stderr: "",
      exitCode: 0,
    }));
    const upsertSession = vi.fn();
    const { deps, appendSystemMessage } = createDeps({
      sessionId,
      getSession: () => session,
      upsertSession,
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.MODELS, deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(runAgentCommand).toHaveBeenCalledWith(["models"]);
    expect(upsertSession).toHaveBeenCalledWith({
      session: expect.objectContaining({
        id: sessionId,
        metadata: {
          mcpServers: [],
          model: "auto",
          compactionSessionId: SessionIdSchema.parse("compaction-session-id"),
          compactionSummary: "Compaction summary",
          availableModels: [
            { modelId: "auto", name: "Auto" },
            { modelId: "fast", name: "Fast Model" },
          ],
        },
      }),
    });
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Available models"));
  });

  it("normalizes blank active session model before hydrating /models defaults", async () => {
    const sessionId = SessionIdSchema.parse("session-model-blank");
    const session: Session = {
      id: sessionId,
      title: "Model session",
      messageIds: [],
      createdAt: 1,
      updatedAt: 1,
      mode: SESSION_MODE.AUTO,
      metadata: {
        mcpServers: [],
        model: "   ",
      },
    };
    const runAgentCommand = vi.fn(async () => ({
      stdout: "auto - Auto (default)\nfast - Fast Model",
      stderr: "",
      exitCode: 0,
    }));
    const upsertSession = vi.fn();
    const { deps } = createDeps({
      sessionId,
      getSession: () => session,
      upsertSession,
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.MODELS, deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(upsertSession).toHaveBeenCalledWith({
      session: expect.objectContaining({
        id: sessionId,
        metadata: expect.objectContaining({
          model: "auto",
          availableModels: [
            { modelId: "auto", name: "Auto" },
            { modelId: "fast", name: "Fast Model" },
          ],
        }),
      }),
    });
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
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(runAgentCommand).toHaveBeenCalledWith(["models"]);
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("Model listing is not available for this provider.")
    );
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("models endpoint unavailable")
    );
  });

  it("falls back to cloud models when /models command parsing fails", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "requires tty",
      exitCode: 1,
    }));
    const listCloudModels = vi.fn(async () => ({
      availableModels: [
        { modelId: "cloud-auto", name: "Cloud Auto" },
        { modelId: "cloud-fast", name: "Cloud Fast" },
      ],
      defaultModelId: "cloud-auto",
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
      listCloudModels,
    });

    expect(runSlashCommand(SLASH_COMMAND.MODELS, deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(runAgentCommand).toHaveBeenCalledWith(["models"]);
    expect(listCloudModels).toHaveBeenCalledTimes(1);
    expect(appendSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Available models"));
    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("cloud-auto (Cloud Auto) (current)")
    );
  });

  it("reports combined /models command and cloud fallback failures", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "requires tty",
      exitCode: 1,
    }));
    const listCloudModels = vi.fn(async () => {
      throw new Error("cloud unavailable");
    });
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      runAgentCommand,
      listCloudModels,
    });

    expect(runSlashCommand(SLASH_COMMAND.MODELS, deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(appendSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining("requires tty | cloud unavailable")
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

  it("shows auth guidance when cloud count fails during /status", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "Model: Auto\nOS: linux",
      stderr: "",
      exitCode: 0,
    }));
    const listCloudAgents = vi.fn(async () => {
      throw new Error("Request failed with status 401");
    });
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      activeAgentName: "Cursor CLI",
      connectionStatus: "connected",
      runAgentCommand,
      listCloudAgents,
    });

    expect(runSlashCommand(SLASH_COMMAND.STATUS, deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(appendSystemMessage).toHaveBeenCalledWith(SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED);
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

  it("shows cursor login guidance when /status reports unauthenticated", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "Authenticated: no",
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
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(appendSystemMessage).toHaveBeenCalledWith(CURSOR_AUTH_GUIDANCE.LOGIN_REQUIRED);
  });

  it("shows generic login guidance when non-cursor /status reports unauthenticated", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "Authenticated: no",
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CODEX_CLI_ID,
      activeAgentName: "Codex CLI",
      connectionStatus: "connected",
      runAgentCommand,
    });

    expect(runSlashCommand(SLASH_COMMAND.STATUS, deps)).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage.mock.calls.length).toBeGreaterThan(1);
    });

    expect(appendSystemMessage).toHaveBeenCalledWith(
      SLASH_COMMAND_MESSAGE.AUTH_REQUIRED_LOGIN_HINT
    );
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

  it("hydrates /sessions <id> switch with native seed metadata when available", async () => {
    const switchToSession = vi.fn(() => true);
    const listAgentSessions = vi.fn(async () => [
      {
        id: "resumed-session-id",
        title: "Recovered title",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
      },
    ]);
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      switchToSession,
      listAgentSessions,
    });

    expect(runSlashCommand("/sessions resumed-session-id", deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(switchToSession).toHaveBeenNthCalledWith(1, "resumed-session-id");
    expect(switchToSession).toHaveBeenNthCalledWith(2, "resumed-session-id", {
      title: "Recovered title",
      createdAt: "2026-02-11T18:30:00.000Z",
      model: "gpt-5",
    });
    expect(appendSystemMessage).toHaveBeenCalledWith("Switched to session: resumed-session-id");
  });

  it("skips hydration /sessions <id> follow-up when native seed has no metadata", async () => {
    const switchToSession = vi.fn(() => true);
    const listAgentSessions = vi.fn(async () => [
      {
        id: "resumed-session-id",
      },
    ]);
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      switchToSession,
      listAgentSessions,
    });

    expect(runSlashCommand("/sessions resumed-session-id", deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(switchToSession).toHaveBeenCalledTimes(1);
    expect(switchToSession).toHaveBeenCalledWith("resumed-session-id");
    expect(appendSystemMessage).toHaveBeenCalledWith("Switched to session: resumed-session-id");
  });

  it("hydrates /sessions <id> when native list id includes surrounding whitespace", async () => {
    const switchToSession = vi.fn(() => true);
    const listAgentSessions = vi.fn(async () => [
      {
        id: "  resumed-session-id  ",
        title: "Recovered title",
        model: "gpt-5",
      },
    ]);
    const { deps } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      switchToSession,
      listAgentSessions,
    });

    expect(runSlashCommand("/sessions resumed-session-id", deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(switchToSession).toHaveBeenNthCalledWith(1, "resumed-session-id");
    expect(switchToSession).toHaveBeenNthCalledWith(2, "resumed-session-id", {
      title: "Recovered title",
      model: "gpt-5",
    });
  });

  it("hydrates /sessions <id> from command fallback when list runtime is unavailable", async () => {
    const switchToSession = vi.fn(() => true);
    const runAgentCommand = vi.fn(async () => ({
      stdout:
        "resumed-session-id Recovered title model: gpt-5 messages: 14 createdAt=2026-02-11T18:30:00Z",
      stderr: "",
      exitCode: 0,
    }));
    const { deps, appendSystemMessage } = createDeps({
      activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      switchToSession,
      runAgentCommand,
    });

    expect(runSlashCommand("/sessions resumed-session-id", deps)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(runAgentCommand).toHaveBeenCalledWith(["ls"]);
    expect(switchToSession).toHaveBeenNthCalledWith(1, "resumed-session-id");
    expect(switchToSession).toHaveBeenNthCalledWith(2, "resumed-session-id", {
      title: "Recovered title",
      createdAt: "2026-02-11T18:30:00.000Z",
      model: "gpt-5",
    });
    expect(appendSystemMessage).toHaveBeenCalledWith("Switched to session: resumed-session-id");
  });

  it("reports when /sessions <id> fails to switch sessions", () => {
    const switchToSession = vi.fn(() => false);
    const { deps, appendSystemMessage } = createDeps({
      switchToSession,
    });

    expect(runSlashCommand("/sessions resumed-session-id", deps)).toBe(true);

    expect(switchToSession).toHaveBeenCalledWith("resumed-session-id");
    expect(appendSystemMessage).toHaveBeenCalledWith(
      "Unable to switch to session. resumed-session-id"
    );
  });

  it("reports unsupported session switching when handler is unavailable", () => {
    const { deps, appendSystemMessage } = createDeps();

    expect(runSlashCommand("/sessions resumed-session-id", deps)).toBe(true);

    expect(appendSystemMessage).toHaveBeenCalledWith(
      "Session switching is not available for this provider."
    );
  });
});

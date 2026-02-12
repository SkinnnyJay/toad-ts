import { readFileSync } from "node:fs";
import path from "node:path";
import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { ENV_KEY } from "@/constants/env-keys";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { AgentIdSchema, SessionIdSchema } from "@/types/domain";
import { runAgentCommand } from "@/ui/components/chat/agent-management-command-service";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

const getExecaMock = async () => {
  const module = await import("execa");
  return module.execa as unknown as ReturnType<typeof vi.fn>;
};

describe("agent-management-command-service", () => {
  const originalCursorApiKey = process.env[ENV_KEY.CURSOR_API_KEY];

  beforeEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
  });

  afterEach(() => {
    if (originalCursorApiKey === undefined) {
      delete process.env[ENV_KEY.CURSOR_API_KEY];
    } else {
      process.env[ENV_KEY.CURSOR_API_KEY] = originalCursorApiKey;
    }
    EnvManager.resetInstance();
  });

  it("returns fallback status lines when harness is unavailable", async () => {
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, {
      connectionStatus: "connected",
      activeAgentName: "Cursor",
      session: {
        id: SessionIdSchema.parse("session-1"),
        agentId: AgentIdSchema.parse("agent-1"),
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
        mode: "auto",
      },
    });

    expect(lines.some((line) => line.includes("Connection: connected"))).toBe(true);
    expect(lines.some((line) => line.includes("Agent: Cursor"))).toBe(true);
  });

  it("defaults /agent to status flow for active harness", async () => {
    const execaMock = await getExecaMock();
    const statusOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/status-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: statusOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.AGENT, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("Authenticated:");
    expect(execaMock).toHaveBeenCalled();
  });

  it("routes /agent status to status command flow", async () => {
    const execaMock = await getExecaMock();
    const statusOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/status-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: statusOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["status"]
    );

    expect(lines[0]).toContain("Authenticated:");
  });

  it("routes /agent models to models command flow", async () => {
    const execaMock = await getExecaMock();
    const modelsOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/models-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: modelsOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["models"]
    );

    expect(lines.some((line) => line.includes("opus-4.6-thinking"))).toBe(true);
  });

  it("routes /agent login to login command flow", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Opening browser for login...",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["login"]
    );

    expect(lines[0]).toContain("cursor-agent");
    expect(lines[0]).toContain("login");
    const args = execaMock.mock.calls[0]?.[1] as string[] | undefined;
    expect(args).toEqual(["login"]);
  });

  it("returns unsupported /agent subcommand guidance", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["unknown-subcommand"]
    );

    expect(lines[0]).toContain("Unsupported /agent subcommand");
  });

  it("parses cursor model output from native command", async () => {
    const execaMock = await getExecaMock();
    const modelsOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/models-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: modelsOutput,
      stderr: "",
      exitCode: 0,
    });

    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MODELS, {
      activeHarness: harness,
    });

    expect(lines.some((line) => line.includes("opus-4.6-thinking"))).toBe(true);
  });

  it("formats session model list when no harness is active", async () => {
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MODELS, {
      session: {
        id: SessionIdSchema.parse("session-models"),
        agentId: AgentIdSchema.parse("agent-1"),
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
        mode: "auto",
        metadata: {
          model: "gpt-5",
          availableModels: [{ modelId: "gpt-5" }, { modelId: "claude-sonnet-4" }],
          mcpServers: [],
        },
      },
    });

    expect(lines).toContain("- gpt-5");
    expect(lines).toContain("- claude-sonnet-4");
    expect(lines).toContain("Active model: gpt-5");
  });

  it("returns not-supported message when models command is unavailable", async () => {
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MODELS, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("models is not supported");
    expect(lines[1]).toContain("/model <id>");
  });

  it("returns login guidance command for active harness", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Opening browser for login...",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: ["--foo"],
      env: {},
    });
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.LOGIN, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("cursor-agent --foo login");
    expect(lines[1]).toContain("open a browser");
    expect(lines[2]).toContain("Opening browser for login");
  });

  it("formats cursor login output when already authenticated", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Authenticated as dev@example.com",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.LOGIN, {
      activeHarness: harness,
    });

    expect(lines).toEqual([
      "Run `cursor-agent login` in a terminal.",
      "Authenticated as dev@example.com",
    ]);
  });

  it("returns env guidance when gemini login is requested", async () => {
    const harness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {},
    });
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.LOGIN, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("GOOGLE_API_KEY");
  });

  it("runs codex status through login status command", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Authenticated as coder@example.com",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("Authenticated: yes");
    expect(lines[1]).toContain("coder@example.com");
    const args = execaMock.mock.calls[0]?.[1] as string[] | undefined;
    expect(args).toEqual(["login", "status"]);
  });

  it("derives gemini status from GOOGLE_API_KEY env", async () => {
    const harness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {
        GOOGLE_API_KEY: "google-key",
      },
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("Authenticated: yes");
    expect(lines[2]).toContain("GOOGLE_API_KEY");
  });

  it("appends gemini session count when list-sessions succeeds", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "1. sess-a\n2. sess-b",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {
        GOOGLE_API_KEY: "google-key",
      },
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, {
      activeHarness: harness,
    });

    expect(lines).toContain("Sessions: 2");
    const args = execaMock.mock.calls[0]?.[1] as string[] | undefined;
    expect(args).toEqual(["list-sessions"]);
  });

  it("returns not-supported message when logout is unavailable", async () => {
    const harness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {},
    });
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.LOGOUT, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("logout is not supported");
  });

  it("parses cursor logout output with structured formatter lines", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Logged out successfully",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.LOGOUT, {
      activeHarness: harness,
    });

    expect(lines).toEqual([
      "Logged out: yes",
      "Command: cursor-agent logout",
      "Logged out successfully",
    ]);
  });

  it("formats cursor logout failure output with logged-out false", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "",
      stderr: "Logout failed due to network error",
      exitCode: 1,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.LOGOUT, {
      activeHarness: harness,
    });

    expect(lines).toEqual([
      "Logged out: no",
      "Command: cursor-agent logout",
      "Logout failed due to network error",
    ]);
  });

  it("derives claude status from environment auth", async () => {
    const harness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {
        ANTHROPIC_API_KEY: "test-key",
      },
    });
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("Authenticated: yes");
    expect(lines[1]).toContain("Method: api_key");
  });

  it("parses cursor about output through /agent about", async () => {
    const execaMock = await getExecaMock();
    const aboutOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/about-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: aboutOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["about"]
    );

    expect(lines.some((line) => line.includes("Version: 2026.01.28-fd13201"))).toBe(true);
    expect(lines.some((line) => line.includes("User: netwearcdz@gmail.com"))).toBe(true);
  });

  it("supports direct about management command", async () => {
    const execaMock = await getExecaMock();
    const aboutOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/about-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: aboutOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.ABOUT, {
      activeHarness: harness,
    });

    expect(lines.some((line) => line.includes("Version: 2026.01.28-fd13201"))).toBe(true);
  });

  it("uses --version for non-cursor about commands", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "codex 0.1.0",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.ABOUT, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("Version: codex 0.1.0");
    const args = execaMock.mock.calls[0]?.[1] as string[] | undefined;
    expect(args).toEqual(["--version"]);
  });

  it("uses stderr fallback when non-cursor about has no stdout", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "",
      stderr: "codex 0.1.0",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.ABOUT, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("codex 0.1.0");
  });

  it("shows configured MCP servers for current session", async () => {
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MCP, {
      session: {
        id: SessionIdSchema.parse("session-1"),
        agentId: AgentIdSchema.parse("agent-1"),
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
        mode: "auto",
        metadata: {
          mcpServers: [
            {
              name: "filesystem",
              command: "mcp-server",
              args: [],
              env: [],
            },
          ],
        },
      },
    });

    expect(lines[0]).toContain("filesystem");
  });

  it("returns not-supported message when mcp command is unavailable for harness", async () => {
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });
    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MCP, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("mcp is not supported");
  });

  it("rejects unsupported MCP subcommands for claude harness", async () => {
    const harness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {},
    });
    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.MCP,
      {
        activeHarness: harness,
      },
      ["enable", "github"]
    );

    expect(lines[0]).toContain("MCP subcommand is not supported");
  });

  it("parses claude MCP list output through shared parser wrapper", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "filesystem: connected\nmemory: disabled (missing token)",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MCP, {
      activeHarness: harness,
    });

    expect(lines).toEqual(["- filesystem: connected", "- memory: disabled (missing token)"]);
  });

  it("runs native MCP list for active cursor harness", async () => {
    const execaMock = await getExecaMock();
    const mcpOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/mcp-list-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: mcpOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MCP, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("playwright");
    expect(lines[0]).toContain("needs approval");
  });

  it("runs MCP enable through native harness command", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Enabled github MCP server",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.MCP,
      {
        activeHarness: harness,
      },
      ["enable", "github"]
    );

    expect(lines[0]).toContain("Enabled github MCP server");
  });

  it("routes /agent mcp subcommands through native command execution", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Enabled context7 MCP server",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["mcp", "enable", "context7"]
    );

    expect(lines[0]).toContain("Enabled context7 MCP server");
  });

  it("shows MCP usage when subcommand is invalid", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.MCP,
      {
        activeHarness: harness,
      },
      ["invalid-subcommand"]
    );

    expect(lines[0]).toContain("Usage: /mcp");
  });

  it("requires server id for MCP commands that target a server", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.MCP,
      {
        activeHarness: harness,
      },
      ["enable"]
    );

    expect(lines[0]).toContain("Provide an MCP server id.");
  });

  it("lists cloud agents through /agent cloud list", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(async () => ({
        items: [{ id: "cloud-agent-1", status: "running" }],
      })),
      launchAgent: vi.fn(),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(),
      getConversation: vi.fn(),
      waitForAgentStatus: vi.fn(),
    };

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "list"]
    );

    expect(cloudClient.listAgents).toHaveBeenCalledWith({ limit: 10, cursor: undefined });
    expect(lines[0]).toContain("cloud-agent-1");
  });

  it("accepts cloud list pagination arguments", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(async () => ({
        items: [{ id: "cloud-agent-3", status: "queued" }],
        nextCursor: "cursor-next-1",
      })),
      launchAgent: vi.fn(),
      waitForAgentStatus: vi.fn(),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(),
      getConversation: vi.fn(),
    };

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "list", "25", "cursor-1"]
    );

    expect(cloudClient.listAgents).toHaveBeenCalledWith({
      limit: 25,
      cursor: "cursor-1",
    });
    expect(lines[0]).toContain("cloud-agent-3");
    expect(lines[1]).toContain("cursor-next-1");
  });

  it("treats non-numeric cloud list arg as cursor", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(async () => ({
        items: [{ id: "cloud-agent-4", status: "running" }],
      })),
      launchAgent: vi.fn(),
      waitForAgentStatus: vi.fn(),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(),
      getConversation: vi.fn(),
    };

    await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "list", "cursor-abc"]
    );

    expect(cloudClient.listAgents).toHaveBeenCalledWith({
      limit: 10,
      cursor: "cursor-abc",
    });
  });

  it("falls back to default cloud list limit for zero values", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(async () => ({
        items: [{ id: "cloud-agent-5", status: "running" }],
      })),
      launchAgent: vi.fn(),
      waitForAgentStatus: vi.fn(),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(),
      getConversation: vi.fn(),
    };

    await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "list", "0", "cursor-2"]
    );

    expect(cloudClient.listAgents).toHaveBeenCalledWith({
      limit: 10,
      cursor: "cursor-2",
    });
  });

  it("falls back to default cloud list limit for negative values", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(async () => ({
        items: [{ id: "cloud-agent-6", status: "running" }],
      })),
      launchAgent: vi.fn(),
      waitForAgentStatus: vi.fn(),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(),
      getConversation: vi.fn(),
    };

    await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "list", "-5", "cursor-3"]
    );

    expect(cloudClient.listAgents).toHaveBeenCalledWith({
      limit: 10,
      cursor: "cursor-3",
    });
  });

  it("dispatches cloud agent launch via /agent cloud launch", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(),
      launchAgent: vi.fn(async () => ({
        agent: { id: "cloud-agent-2", status: "queued" },
      })),
      waitForAgentStatus: vi.fn(async () => ({ id: "cloud-agent-2", status: "running" })),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(),
      getConversation: vi.fn(async () => ({ id: "conversation-2", messages: [{}] })),
    };

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
        session: {
          id: SessionIdSchema.parse("session-2"),
          agentId: AgentIdSchema.parse("cursor-cli"),
          messageIds: [],
          createdAt: 0,
          updatedAt: 0,
          mode: "auto",
          metadata: {
            mcpServers: [],
            model: "gpt-5",
          },
        },
      },
      ["cloud", "launch", "Investigate", "failing", "tests"]
    );

    expect(cloudClient.launchAgent).toHaveBeenCalledWith({
      prompt: "Investigate failing tests",
      model: "gpt-5",
    });
    expect(cloudClient.waitForAgentStatus).toHaveBeenCalledWith("cloud-agent-2");
    expect(cloudClient.getConversation).toHaveBeenCalledWith("cloud-agent-2");
    expect(lines.some((line) => line.includes("cloud-agent-2"))).toBe(true);
    expect(lines.some((line) => line.includes("Conversation messages: 1"))).toBe(true);
  });

  it("returns pending status when cloud launch polling fails", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(),
      launchAgent: vi.fn(async () => ({
        agent: { id: "cloud-agent-9", status: "queued" },
      })),
      waitForAgentStatus: vi.fn(async () => {
        throw new Error("Timed out waiting for cloud agent cloud-agent-9.");
      }),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(),
      getConversation: vi.fn(),
    };

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "launch", "Run", "full", "checks"]
    );

    expect(cloudClient.waitForAgentStatus).toHaveBeenCalledWith("cloud-agent-9");
    expect(cloudClient.getConversation).not.toHaveBeenCalled();
    expect(lines[0]).toContain("cloud-agent-9");
    expect(lines[1]).toContain("Status check pending.");
  });

  it("sends follow-up prompts to cloud agents", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(),
      launchAgent: vi.fn(),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(async () => ({ id: "cloud-agent-2", status: "running" })),
      getConversation: vi.fn(),
      waitForAgentStatus: vi.fn(),
    };

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "followup", "cloud-agent-2", "Please", "continue"]
    );

    expect(cloudClient.followupAgent).toHaveBeenCalledWith("cloud-agent-2", {
      prompt: "Please continue",
    });
    expect(lines.some((line) => line.includes("Follow-up sent"))).toBe(true);
  });

  it("shows cloud conversation summary details", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const cloudClient = {
      listAgents: vi.fn(),
      launchAgent: vi.fn(),
      stopAgent: vi.fn(),
      followupAgent: vi.fn(),
      getConversation: vi.fn(async () => ({
        id: "conversation-1",
        messages: [{ role: "user", content: "hello" }],
      })),
      waitForAgentStatus: vi.fn(),
    };

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "conversation", "cloud-agent-2"]
    );

    expect(cloudClient.getConversation).toHaveBeenCalledWith("cloud-agent-2");
    expect(lines[0]).toContain("conversation-1");
    expect(lines[1]).toContain("1");
  });

  it("returns followup usage without requiring cloud api key", async () => {
    delete process.env[ENV_KEY.CURSOR_API_KEY];
    EnvManager.resetInstance();
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["cloud", "followup", "cloud-agent-2"]
    );

    expect(lines).toEqual(["Usage: /agent cloud followup <agentId> <prompt>"]);
  });

  it("returns cloud usage for unknown subcommand without requiring api key", async () => {
    delete process.env[ENV_KEY.CURSOR_API_KEY];
    EnvManager.resetInstance();
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["cloud", "unknown-subcommand"]
    );

    expect(lines[0]).toContain("Usage: /agent cloud list [limit] [cursor]");
  });
});

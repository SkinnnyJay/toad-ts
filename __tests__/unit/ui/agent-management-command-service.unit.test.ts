import { readFileSync } from "node:fs";
import path from "node:path";
import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { AgentIdSchema, SessionIdSchema } from "@/types/domain";
import { runAgentCommand } from "@/ui/components/chat/agent-management-command-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
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

  it("returns login guidance command for active harness", async () => {
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
});

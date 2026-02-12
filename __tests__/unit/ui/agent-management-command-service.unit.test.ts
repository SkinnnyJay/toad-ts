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
    };

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
        cloudClient,
      },
      ["cloud", "list"]
    );

    expect(cloudClient.listAgents).toHaveBeenCalled();
    expect(lines[0]).toContain("cloud-agent-1");
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
      stopAgent: vi.fn(),
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
    expect(lines.some((line) => line.includes("cloud-agent-2"))).toBe(true);
  });
});

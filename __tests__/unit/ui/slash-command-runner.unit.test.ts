import { SESSION_MODE } from "@/constants/session-modes";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { AgentIdSchema, SessionIdSchema } from "@/types/domain";
import { type SlashCommandDeps, runSlashCommand } from "@/ui/components/chat/slash-command-runner";
import { describe, expect, it, vi } from "vitest";

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

const getExecaMock = async () => {
  const module = await import("execa");
  return module.execa as unknown as ReturnType<typeof vi.fn>;
};

const createDeps = (appendSystemMessage: (text: string) => void): SlashCommandDeps => {
  const sessionId = SessionIdSchema.parse("session-1");
  return {
    sessionId,
    appendSystemMessage,
    getSession: () => ({
      id: sessionId,
      agentId: AgentIdSchema.parse("agent-1"),
      messageIds: [],
      createdAt: 0,
      updatedAt: 0,
      mode: SESSION_MODE.AUTO,
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
    }),
    getMessagesForSession: () => [],
    getPlanBySession: () => undefined,
    listSessions: () => [],
    upsertSession: () => undefined,
    clearMessagesForSession: () => undefined,
    upsertPlan: () => undefined,
    activeAgentName: "Cursor",
    activeHarnessId: "cursor-cli",
    harnesses: {
      "cursor-cli": harnessConfigSchema.parse({
        id: "cursor-cli",
        name: "Cursor CLI",
        command: "cursor-agent",
        args: [],
        env: {},
      }),
    },
  };
};

describe("slash-command-runner", () => {
  it("handles /agent command", async () => {
    const appendSystemMessage = vi.fn();
    const handled = runSlashCommand(SLASH_COMMAND.AGENT, createDeps(appendSystemMessage));
    await Promise.resolve();

    expect(handled).toBe(true);
    expect(appendSystemMessage).toHaveBeenCalled();
  });

  it("handles /mcp command", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "filesystem: connected",
      stderr: "",
      exitCode: 0,
    });
    const appendSystemMessage = vi.fn();
    const handled = runSlashCommand(SLASH_COMMAND.MCP, createDeps(appendSystemMessage));
    await vi.waitFor(() => {
      expect(appendSystemMessage).toHaveBeenCalled();
    });

    expect(handled).toBe(true);
  });

  it("forwards /mcp subcommand arguments to native command", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Enabled github MCP server",
      stderr: "",
      exitCode: 0,
    });
    const appendSystemMessage = vi.fn();
    const handled = runSlashCommand("/mcp enable github", createDeps(appendSystemMessage));
    await vi.waitFor(() => {
      expect(appendSystemMessage).toHaveBeenCalled();
    });

    expect(handled).toBe(true);
    expect(execaMock).toHaveBeenCalled();
    const calledWithEnable = execaMock.mock.calls.some((call) => {
      const args = (call[1] as string[] | undefined) ?? [];
      return args.includes("mcp") && args.includes("enable") && args.includes("github");
    });
    expect(calledWithEnable).toBe(true);
  });

  it("handles /model alias command", () => {
    const appendSystemMessage = vi.fn();
    const handled = runSlashCommand("/model gpt-5", createDeps(appendSystemMessage));

    expect(handled).toBe(true);
    expect(appendSystemMessage).toHaveBeenCalledWith(SLASH_COMMAND_MESSAGE.NO_ACTIVE_CLIENT);
  });
});

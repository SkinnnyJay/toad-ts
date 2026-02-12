import { SESSION_MODE } from "@/constants/session-modes";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { AgentIdSchema, SessionIdSchema } from "@/types/domain";
import { type SlashCommandDeps, runSlashCommand } from "@/ui/components/chat/slash-command-runner";
import { describe, expect, it, vi } from "vitest";

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
    const appendSystemMessage = vi.fn();
    const handled = runSlashCommand(SLASH_COMMAND.MCP, createDeps(appendSystemMessage));
    await Promise.resolve();

    expect(handled).toBe(true);
    expect(appendSystemMessage).toHaveBeenCalled();
  });
});

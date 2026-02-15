import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENV_KEY } from "@/constants/env-keys";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { SESSION_MODE } from "@/constants/session-modes";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { AgentIdSchema, MessageIdSchema, SessionIdSchema } from "@/types/domain";
import { type SlashCommandDeps, runSlashCommand } from "@/ui/components/chat/slash-command-runner";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  const originalPlatform = process.platform;
  const originalDisplay = process.env[ENV_KEY.DISPLAY];
  const originalWaylandDisplay = process.env[ENV_KEY.WAYLAND_DISPLAY];
  const originalSessionType = process.env[ENV_KEY.XDG_SESSION_TYPE];

  const restoreEnvValue = (key: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  };

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    restoreEnvValue(ENV_KEY.DISPLAY, originalDisplay);
    restoreEnvValue(ENV_KEY.WAYLAND_DISPLAY, originalWaylandDisplay);
    restoreEnvValue(ENV_KEY.XDG_SESSION_TYPE, originalSessionType);
  });

  it("handles /agent command", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Logged in as dev@example.com",
      stderr: "",
      exitCode: 0,
    });
    const appendSystemMessage = vi.fn();
    const handled = runSlashCommand(SLASH_COMMAND.AGENT, createDeps(appendSystemMessage));
    await vi.waitFor(() => {
      expect(appendSystemMessage).toHaveBeenCalled();
    });

    expect(handled).toBe(true);
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

  it("reports headless linux clipboard unavailability for /copy", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    delete process.env[ENV_KEY.DISPLAY];
    delete process.env[ENV_KEY.WAYLAND_DISPLAY];
    delete process.env[ENV_KEY.XDG_SESSION_TYPE];

    const appendSystemMessage = vi.fn();
    const copyToClipboard = vi.fn(async () => true);
    const sessionId = SessionIdSchema.parse("session-copy-headless");

    const handled = runSlashCommand("/copy", {
      ...createDeps(appendSystemMessage),
      sessionId,
      copyToClipboard,
      getMessagesForSession: () => [
        {
          id: MessageIdSchema.parse("message-copy-headless"),
          sessionId,
          role: MESSAGE_ROLE.ASSISTANT,
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "copy me" }],
          createdAt: 0,
          isStreaming: false,
        },
      ],
    });

    expect(handled).toBe(true);
    await vi.waitFor(() => {
      expect(appendSystemMessage).toHaveBeenCalledWith(
        SLASH_COMMAND_MESSAGE.COPY_UNAVAILABLE_HEADLESS_LINUX
      );
    });
    expect(copyToClipboard).not.toHaveBeenCalled();
  });
});

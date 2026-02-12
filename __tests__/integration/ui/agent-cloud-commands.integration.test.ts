import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { ENV_KEY } from "@/constants/env-keys";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { AgentIdSchema, SessionIdSchema } from "@/types/domain";
import { runAgentCommand } from "@/ui/components/chat/agent-management-command-service";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createJsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("agent cloud commands integration", () => {
  const originalCursorApiKey = process.env[ENV_KEY.CURSOR_API_KEY];

  beforeEach(() => {
    process.env[ENV_KEY.CURSOR_API_KEY] = "cursor-cloud-test-key";
    EnvManager.resetInstance();
  });

  afterEach(() => {
    if (originalCursorApiKey) {
      process.env[ENV_KEY.CURSOR_API_KEY] = originalCursorApiKey;
    } else {
      delete process.env[ENV_KEY.CURSOR_API_KEY];
    }
    EnvManager.resetInstance();
    vi.restoreAllMocks();
  });

  it("executes launch -> status polling -> conversation workflow", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createJsonResponse({
          agent: { id: "cloud-agent-42", status: "queued" },
        })
      )
      .mockResolvedValueOnce(createJsonResponse({ id: "cloud-agent-42", status: "queued" }))
      .mockResolvedValueOnce(createJsonResponse({ id: "cloud-agent-42", status: "running" }))
      .mockResolvedValueOnce(createJsonResponse({ id: "conversation-42", messages: [{}, {}] }));
    vi.stubGlobal("fetch", fetchMock);

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
        session: {
          id: SessionIdSchema.parse("session-42"),
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
      ["cloud", "launch", "Investigate", "cloud", "queue"]
    );

    expect(lines).toContain("Dispatched cloud agent: cloud-agent-42");
    expect(lines).toContain("Status: running");
    expect(lines).toContain("Conversation messages: 2");
    expect(fetchMock.mock.calls).toHaveLength(4);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/agents");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/agents/cloud-agent-42/conversation");
  });

  it("passes list pagination arguments through to cloud api query params", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      createJsonResponse({
        items: [{ id: "cloud-agent-50", status: "running" }],
        nextCursor: "cursor-next-50",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "list", "25", "cursor-1"]
    );

    expect(lines[0]).toContain("cloud-agent-50");
    expect(lines[1]).toContain("cursor-next-50");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/agents?cursor=cursor-1&limit=25");
  });

  it("passes cursor-only list argument with default limit", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      createJsonResponse({
        items: [{ id: "cloud-agent-51", status: "queued" }],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "list", "cursor-abc"]
    );

    expect(lines[0]).toContain("cloud-agent-51");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/agents?cursor=cursor-abc&limit=10");
  });

  it("passes negative numeric limit as default limit with cursor", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      createJsonResponse({
        items: [{ id: "cloud-agent-52", status: "queued" }],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "list", "-5", "cursor-neg"]
    );

    expect(lines[0]).toContain("cloud-agent-52");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/agents?cursor=cursor-neg&limit=10");
  });

  it("returns pending status line when launch polling times out", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createJsonResponse({
          agent: { id: "cloud-agent-timeout", status: "queued" },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          id: "cloud-agent-timeout",
          status: "queued",
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const nowValues = [0, 0, 31_000];
    let nowIndex = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      const value = nowValues[nowIndex];
      nowIndex = Math.min(nowIndex + 1, nowValues.length - 1);
      return value ?? 31_000;
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
        session: {
          id: SessionIdSchema.parse("session-timeout"),
          agentId: AgentIdSchema.parse("cursor-cli"),
          messageIds: [],
          createdAt: 0,
          updatedAt: 0,
          mode: "auto",
          metadata: {
            mcpServers: [],
          },
        },
      },
      ["cloud", "launch", "Continue", "processing"]
    );

    expect(lines[0]).toContain("cloud-agent-timeout");
    expect(lines[1]).toContain("Status check pending.");
    expect(fetchMock.mock.calls).toHaveLength(2);
  });

  it("sends follow-up prompt to existing cloud agent", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      createJsonResponse({
        id: "cloud-agent-followup",
        status: "running",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "followup", "cloud-agent-followup", "Continue", "analysis"]
    );

    expect(lines).toContain("Follow-up sent to cloud agent: cloud-agent-followup");
    expect(lines).toContain("Status: running");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/agents/cloud-agent-followup/followup");
  });

  it("renders cloud conversation summary for agent id", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      createJsonResponse({
        id: "conversation-77",
        messages: [{}, {}, {}],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "conversation", "cloud-agent-77"]
    );

    expect(lines).toContain("Cloud conversation: conversation-77");
    expect(lines).toContain("Messages: 3");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/agents/cloud-agent-77/conversation");
  });

  it("stops cloud agent through pause endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      createJsonResponse({
        id: "cloud-agent-stop",
        status: "paused",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "stop", "cloud-agent-stop"]
    );

    expect(lines).toContain("Stopped cloud agent: cloud-agent-stop");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/agents/cloud-agent-stop/stop");
  });

  it("returns followup usage message when prompt is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "followup", "cloud-agent-missing"]
    );

    expect(lines).toEqual(["Usage: /agent cloud followup <agentId> <prompt>"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns conversation usage message when agent id is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "conversation"]
    );

    expect(lines).toEqual(["Usage: /agent cloud conversation <agentId>"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns stop usage message when agent id is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "stop"]
    );

    expect(lines).toEqual(["Provide an agent id to stop."]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns cloud usage message for unknown cloud subcommands", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

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
      ["cloud", "unknown"]
    );

    expect(lines[0]).toContain("Usage: /agent cloud list [limit] [cursor]");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

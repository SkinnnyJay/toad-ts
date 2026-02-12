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
});

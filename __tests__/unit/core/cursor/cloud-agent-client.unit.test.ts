import { CURSOR_CLOUD_AGENT_STATUS } from "@/constants/cursor-cloud-agent-status";
import { CursorCloudAgentClient } from "@/core/cursor/cloud-agent-client";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, describe, expect, it, vi } from "vitest";

const createJsonResponse = (
  payload: unknown,
  init: { status?: number; etag?: string } = {}
): Response => {
  const headers = new Headers();
  if (init.etag) {
    headers.set("etag", init.etag);
  }
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers,
  });
};

describe("CursorCloudAgentClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails fast when no cursor api key is configured", () => {
    const envManager = EnvManager.getInstance();
    vi.spyOn(envManager, "getSnapshot").mockReturnValue({});

    expect(() => new CursorCloudAgentClient({ baseUrl: "https://example.test" })).toThrow(
      "Missing CURSOR_API_KEY"
    );
  });

  it("supports ETag caching for repeated GET requests", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createJsonResponse({ items: [{ id: "agent-1" }], nextCursor: "next" }, { etag: '"v1"' })
      )
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      baseUrl: "https://example.test",
      fetchFn: fetchMock,
    });

    const first = await client.listAgents({ limit: 10 });
    const second = await client.listAgents({ limit: 10 });

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallHeaders = fetchMock.mock.calls[1]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(secondCallHeaders?.["If-None-Match"]).toBe('"v1"');
  });

  it("retries 5xx responses with exponential backoff", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("boom", { status: 500 }))
      .mockResolvedValueOnce(new Response("still boom", { status: 502 }))
      .mockResolvedValueOnce(createJsonResponse({ models: [{ id: "opus-4.6" }] }));

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      baseUrl: "https://example.test",
      fetchFn: fetchMock,
      baseRetryDelayMs: 0,
      maxRetries: 3,
    });

    const models = await client.listModels();
    expect(models.models).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("calls all CRUD-style cloud endpoints", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({ agent: { id: "a-1" } }))
      .mockResolvedValueOnce(createJsonResponse({ id: "a-1", status: "running" }))
      .mockResolvedValueOnce(createJsonResponse({ stopped: true }))
      .mockResolvedValueOnce(createJsonResponse({ deleted: true }))
      .mockResolvedValueOnce(createJsonResponse({ id: "a-1", messages: [] }))
      .mockResolvedValueOnce(createJsonResponse({ repos: [{ name: "repo-1" }] }))
      .mockResolvedValueOnce(createJsonResponse({ valid: true }));

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      baseUrl: "https://example.test",
      fetchFn: fetchMock,
    });

    await client.launchAgent({ prompt: "launch" });
    await client.followupAgent("a-1", { prompt: "continue" });
    await client.stopAgent("a-1");
    await client.deleteAgent("a-1");
    await client.getConversation("a-1");
    await client.listRepos();
    await client.getKeyInfo();

    const calledUrls = fetchMock.mock.calls.map((entry) => entry[0] as string);
    expect(calledUrls).toEqual([
      "https://example.test/agents",
      "https://example.test/agents/a-1/followup",
      "https://example.test/agents/a-1/stop",
      "https://example.test/agents/a-1",
      "https://example.test/agents/a-1/conversation",
      "https://example.test/repos",
      "https://example.test/key-info",
    ]);
  });

  it("polls cloud agent status until reaching a terminal state", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({ id: "a-1", status: "queued" }))
      .mockResolvedValueOnce(createJsonResponse({ id: "a-1", status: "running" }));

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      baseUrl: "https://example.test",
      fetchFn: fetchMock,
    });

    const agent = await client.waitForAgentStatus("a-1", {
      pollIntervalMs: 0,
      timeoutMs: 1_000,
      terminalStatuses: [CURSOR_CLOUD_AGENT_STATUS.RUNNING],
    });

    expect(agent.status).toBe(CURSOR_CLOUD_AGENT_STATUS.RUNNING);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails cloud agent status polling when timeout is reached", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(createJsonResponse({ id: "a-1", status: "queued" }));
    const nowValues = [0, 0, 1_000, 1_001];
    let nowIndex = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      const value = nowValues[nowIndex];
      nowIndex = Math.min(nowIndex + 1, nowValues.length - 1);
      return value ?? 1_001;
    });

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      baseUrl: "https://example.test",
      fetchFn: fetchMock,
    });

    await expect(
      client.waitForAgentStatus("a-1", {
        pollIntervalMs: 0,
        timeoutMs: 500,
      })
    ).rejects.toThrow("Timed out waiting for cloud agent a-1.");
  });
});

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
});

import { describe, expect, it, vi } from "vitest";
import { CURSOR_CLOUD_QUERY_KEY } from "../../../src/constants/cursor-cloud-api";
import { HTTP_METHOD } from "../../../src/constants/http-methods";
import {
  CursorCloudAgentClient,
  CursorCloudApiError,
} from "../../../src/core/cursor/cloud-agent-client";

const createJsonResponse = (
  status: number,
  payload: unknown,
  headers: Record<string, string> = {}
): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });

describe("CursorCloudAgentClient", () => {
  it("lists agents and applies pagination query parameters", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, {
        agents: [{ id: "agent-1", status: "running" }],
        next_cursor: "cursor-2",
      })
    );

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      fetchFn,
    });

    const result = await client.listAgents({
      limit: 5,
      cursor: "cursor-1",
    });

    expect(result.agents[0]?.id).toBe("agent-1");
    expect(result.nextCursor).toBe("cursor-2");
    const [requestUrl, requestInit] = fetchFn.mock.calls[0] ?? [];
    const url = new URL(String(requestUrl));
    expect(url.searchParams.get(CURSOR_CLOUD_QUERY_KEY.LIMIT)).toBe("5");
    expect(url.searchParams.get(CURSOR_CLOUD_QUERY_KEY.CURSOR)).toBe("cursor-1");
    expect(requestInit?.method).toBe(HTTP_METHOD.GET);
    const headers = requestInit?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-key");
  });

  it("launches agent and posts validated payload", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, {
        id: "agent-2",
        status: "queued",
      })
    );

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      fetchFn,
    });

    const result = await client.launchAgent({
      prompt: "refactor auth module",
      repository: "owner/repo",
      model: "opus-4.6-thinking",
      mode: "agent",
    });

    expect(result.id).toBe("agent-2");
    const [, requestInit] = fetchFn.mock.calls[0] ?? [];
    expect(requestInit?.method).toBe(HTTP_METHOD.POST);
    expect(requestInit?.body).toContain("refactor auth module");
  });

  it("handles followup, stop, delete, and metadata endpoints", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn
      .mockResolvedValueOnce(createJsonResponse(200, { id: "agent-3" }))
      .mockResolvedValueOnce(createJsonResponse(200, { id: "agent-3" }))
      .mockResolvedValueOnce(createJsonResponse(200, { id: "agent-3" }))
      .mockResolvedValueOnce(createJsonResponse(200, { email: "user@example.com" }))
      .mockResolvedValueOnce(createJsonResponse(200, { models: [{ id: "auto", name: "Auto" }] }))
      .mockResolvedValueOnce(
        createJsonResponse(200, { repositories: [{ name: "owner/repo", private: true }] })
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          messages: [{ role: "assistant", content: "done" }],
        })
      );

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      fetchFn,
    });

    await expect(client.addFollowup("agent-3", { prompt: "continue" })).resolves.toEqual({
      id: "agent-3",
    });
    await expect(client.stopAgent("agent-3")).resolves.toEqual({ id: "agent-3" });
    await expect(client.deleteAgent("agent-3")).resolves.toEqual({ id: "agent-3" });
    await expect(client.getApiKeyInfo()).resolves.toMatchObject({
      email: "user@example.com",
    });
    await expect(client.listModels()).resolves.toEqual({
      models: [{ id: "auto", name: "Auto" }],
    });
    await expect(client.listRepositories()).resolves.toEqual({
      repositories: [{ name: "owner/repo", private: true }],
    });
    await expect(client.getConversation("agent-3")).resolves.toEqual({
      messages: [{ role: "assistant", content: "done" }],
    });
  });

  it("retries retryable API failures and succeeds", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn
      .mockResolvedValueOnce(new Response("temporary", { status: 500 }))
      .mockResolvedValueOnce(createJsonResponse(200, { id: "agent-4", status: "running" }));

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      fetchFn,
      retryBaseMs: 1,
      retryCapMs: 2,
    });

    const result = await client.getAgent("agent-4");
    expect(result.id).toBe("agent-4");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("supports ETag caching for GET requests", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn
      .mockResolvedValueOnce(createJsonResponse(200, { models: [{ id: "auto" }] }, { etag: "abc" }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      fetchFn,
    });

    const first = await client.listModels();
    const second = await client.listModels();

    expect(first).toEqual({ models: [{ id: "auto" }] });
    expect(second).toEqual({ models: [{ id: "auto" }] });
    expect(client.getCachedEtagCount()).toBe(1);
    const [, secondRequestInit] = fetchFn.mock.calls[1] ?? [];
    const headers = secondRequestInit?.headers as Headers;
    expect(headers.get("If-None-Match")).toBe("abc");
  });

  it("throws explicit error when API key is missing", () => {
    expect(() => {
      new CursorCloudAgentClient({
        apiKey: "",
        fetchFn: vi.fn<typeof fetch>(),
      });
    }).toThrow("CURSOR_API_KEY");
  });

  it("throws CursorCloudApiError on non-retryable failures", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValue(new Response("forbidden", { status: 403 }));

    const client = new CursorCloudAgentClient({
      apiKey: "test-key",
      fetchFn,
      retryAttempts: 1,
    });

    await expect(client.getAgent("agent-5")).rejects.toBeInstanceOf(CursorCloudApiError);
  });
});

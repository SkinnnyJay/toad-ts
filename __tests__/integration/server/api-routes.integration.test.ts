import { useAppStore } from "@/store/app-store";
import { SessionIdSchema } from "@/types/domain";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  deleteSession,
  getConfig,
  getSession,
  listAgents,
  listMessages,
  listSessions,
  matchRoute,
} from "../../../src/server/api-routes";

/**
 * Integration test for API route handlers.
 * Tests handler logic via matchRoute and validates response payloads
 * using a lightweight response capture.
 */

interface CapturedResponse {
  status: number;
  body: unknown;
}

const captureResponse = (): {
  res: { writeHead: (s: number, h?: Record<string, string>) => void; end: (b?: string) => void };
  getResult: () => CapturedResponse;
} => {
  let status = 200;
  let body: unknown = null;
  return {
    res: {
      writeHead: (s: number) => {
        status = s;
      },
      end: (b?: string) => {
        if (b) body = JSON.parse(b);
      },
    },
    getResult: () => ({ status, body }),
  };
};

describe("API Routes Integration", () => {
  beforeAll(() => {
    useAppStore.getState().reset();
  });

  afterEach(() => {
    useAppStore.getState().reset();
  });

  it("GET /api/sessions should return empty sessions list", async () => {
    const matched = matchRoute("GET", "/api/sessions");
    expect(matched).not.toBeNull();

    const { res, getResult } = captureResponse();
    await matched?.handler({} as never, res as never, matched?.params);

    const result = getResult();
    expect(result.status).toBe(200);
    expect((result.body as { sessions: unknown[] }).sessions).toEqual([]);
  });

  it("GET /api/sessions/:id should return 404 for non-existent session", async () => {
    const matched = matchRoute("GET", "/api/sessions/nonexistent");
    expect(matched).not.toBeNull();

    const { res, getResult } = captureResponse();
    await matched?.handler({} as never, res as never, matched?.params);

    const result = getResult();
    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toContain("not found");
  });

  it("GET /api/sessions/:id should return session when it exists", async () => {
    const sessionId = SessionIdSchema.parse("test-api-session");
    useAppStore.getState().upsertSession({
      session: {
        id: sessionId,
        agentId: "agent-1",
        messageIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: "auto",
        title: "API Test",
      },
    });

    const matched = matchRoute("GET", "/api/sessions/test-api-session");
    const { res, getResult } = captureResponse();
    await matched?.handler({} as never, res as never, matched?.params);

    const result = getResult();
    expect(result.status).toBe(200);
    const session = (result.body as { session: { id: string; title: string } }).session;
    expect(session.id).toBe("test-api-session");
    expect(session.title).toBe("API Test");
  });

  it("GET /api/config should return config object", async () => {
    const matched = matchRoute("GET", "/api/config");
    const { res, getResult } = captureResponse();
    await matched?.handler({} as never, res as never, matched?.params);

    const result = getResult();
    expect(result.status).toBe(200);
    const config = (result.body as { config: Record<string, unknown> }).config;
    expect(config).toBeDefined();
    expect(config.keybinds).toBeDefined();
  });

  it("GET /api/agents should return agents array", async () => {
    const matched = matchRoute("GET", "/api/agents");
    const { res, getResult } = captureResponse();
    await matched?.handler({} as never, res as never, matched?.params);

    const result = getResult();
    expect(result.status).toBe(200);
    expect(Array.isArray((result.body as { agents: unknown[] }).agents)).toBe(true);
  });

  it("GET /api/sessions/:id/messages should return empty for new session", async () => {
    const sessionId = SessionIdSchema.parse("test-msg-session");
    useAppStore.getState().upsertSession({
      session: {
        id: sessionId,
        agentId: "agent-1",
        messageIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: "auto",
      },
    });

    const matched = matchRoute("GET", "/api/sessions/test-msg-session/messages");
    const { res, getResult } = captureResponse();
    await matched?.handler({} as never, res as never, matched?.params);

    const result = getResult();
    expect(result.status).toBe(200);
    expect((result.body as { messages: unknown[] }).messages).toEqual([]);
  });
});

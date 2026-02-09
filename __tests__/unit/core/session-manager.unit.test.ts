import type {
  NewSessionRequest,
  NewSessionResponse,
  SetSessionModeResponse,
  SetSessionModelResponse,
} from "@agentclientprotocol/sdk";
import { describe, expect, it, vi } from "vitest";
import { ENV_KEY } from "../../../src/constants/env-keys";
import { SESSION_MODE } from "../../../src/constants/session-modes";
import { SessionManager } from "../../../src/core/session-manager";
import type { AgentId, Session } from "../../../src/types/domain";
import { AgentIdSchema, SessionIdSchema } from "../../../src/types/domain";

describe("SessionManager", () => {
  const createMockClient = (): {
    newSession: (params: NewSessionRequest) => Promise<NewSessionResponse>;
  } => ({
    newSession: vi.fn().mockResolvedValue({
      sessionId: SessionIdSchema.parse("test-session-1"),
    }),
  });

  const createMockClientWithSessionOptions = (): {
    newSession: (params: NewSessionRequest) => Promise<NewSessionResponse>;
    setSessionMode: (params: {
      sessionId: string;
      modeId: string;
    }) => Promise<SetSessionModeResponse>;
    setSessionModel: (params: {
      sessionId: string;
      modelId: string;
    }) => Promise<SetSessionModelResponse>;
  } => ({
    newSession: vi.fn().mockResolvedValue({
      sessionId: SessionIdSchema.parse("test-session-1"),
    }),
    setSessionMode: vi.fn().mockResolvedValue({}),
    setSessionModel: vi.fn().mockResolvedValue({}),
  });

  const createMockStore = (): {
    upsertSession: (params: { session: Session }) => void;
    sessions: Map<string, Session>;
  } => {
    const sessions = new Map<string, Session>();
    return {
      upsertSession: vi.fn((params: { session: Session }) => {
        sessions.set(params.session.id, params.session);
      }),
      sessions,
    };
  };

  describe("createSession()", () => {
    it("should create session with basic parameters", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const session = await manager.createSession({
        cwd: "/test/path",
        agentId: AgentIdSchema.parse("agent-1"),
        title: "Test Session",
      });

      expect(session.id).toBeDefined();
      expect(session.title).toBe("Test Session");
      expect(session.agentId).toBe("agent-1");
      expect(session.mode).toBe(SESSION_MODE.AUTO);
      expect(store.upsertSession).toHaveBeenCalled();
      expect(client.newSession).toHaveBeenCalledWith({
        cwd: "/test/path",
        mcpServers: [],
      });
    });

    it("should parse session mode from environment variable", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const env = {
        [ENV_KEY.TOADSTOOL_SESSION_MODE]: SESSION_MODE.READ_ONLY,
      };

      const session = await manager.createSession({
        cwd: "/test",
        env,
      });

      expect(session.mode).toBe(SESSION_MODE.READ_ONLY);
    });

    it("should use provided mode over environment variable", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const env = {
        [ENV_KEY.TOADSTOOL_SESSION_MODE]: SESSION_MODE.READ_ONLY,
      };

      const session = await manager.createSession({
        cwd: "/test",
        mode: SESSION_MODE.FULL_ACCESS,
        env,
      });

      expect(session.mode).toBe(SESSION_MODE.FULL_ACCESS);
    });

    it("should default to AUTO mode when env var is invalid", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const env = {
        [ENV_KEY.TOADSTOOL_SESSION_MODE]: "invalid-mode",
      };

      const session = await manager.createSession({
        cwd: "/test",
        env,
      });

      expect(session.mode).toBe(SESSION_MODE.AUTO);
    });

    it("should parse MCP config from params", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const mcpConfig = {
        mcpServers: {
          "test-server": {
            command: "test-cmd",
          },
        },
      };

      await manager.createSession({
        cwd: "/test",
        mcpConfig,
      });

      const callArgs = (client.newSession as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs?.[0]?.mcpServers).toBeDefined();
    });

    it("should use provided timestamp", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const now = 1234567890;
      const session = await manager.createSession({
        cwd: "/test",
        now,
      });

      expect(session.createdAt).toBe(now);
      expect(session.updatedAt).toBe(now);
    });

    it("should use current time when now is not provided", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const before = Date.now();
      const session = await manager.createSession({
        cwd: "/test",
      });
      const after = Date.now();

      expect(session.createdAt).toBeGreaterThanOrEqual(before);
      expect(session.createdAt).toBeLessThanOrEqual(after);
    });

    it("should initialize session with empty messageIds", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const session = await manager.createSession({
        cwd: "/test",
      });

      expect(session.messageIds).toEqual([]);
    });

    it("should store session in store", async () => {
      const client = createMockClient();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const session = await manager.createSession({
        cwd: "/test",
        title: "Stored Session",
      });

      expect(store.upsertSession).toHaveBeenCalledWith({ session });
      expect(store.sessions.get(session.id)).toBeDefined();
    });

    it("sets model and mode when client supports it", async () => {
      const client = createMockClientWithSessionOptions();
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const session = await manager.createSession({
        cwd: "/test",
        mode: SESSION_MODE.READ_ONLY,
        model: "model-1",
        temperature: 0.3,
      });

      expect(session.metadata?.model).toBe("model-1");
      expect(session.metadata?.temperature).toBe(0.3);
      expect(client.setSessionMode).toHaveBeenCalledWith({
        sessionId: session.id,
        modeId: SESSION_MODE.READ_ONLY,
      });
      expect(client.setSessionModel).toHaveBeenCalledWith({
        sessionId: session.id,
        modelId: "model-1",
      });
    });
  });
});

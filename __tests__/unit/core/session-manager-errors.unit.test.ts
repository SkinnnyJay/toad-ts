import type { NewSessionRequest, NewSessionResponse } from "@agentclientprotocol/sdk";
import { describe, expect, it, vi } from "vitest";
import { SessionManager } from "../../../src/core/session-manager";
import { SessionIdSchema } from "../../../src/types/domain";

describe("SessionManager Error Handling", () => {
  const createMockStore = () => ({
    upsertSession: vi.fn(),
  });

  describe("createSession() error handling", () => {
    it("should propagate client errors", async () => {
      const client = {
        newSession: vi.fn().mockRejectedValue(new Error("Client error")),
      };
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      await expect(
        manager.createSession({
          cwd: "/test",
        })
      ).rejects.toThrow("Client error");
    });

    it("should handle invalid MCP config gracefully", async () => {
      const client = {
        newSession: vi.fn().mockResolvedValue({
          sessionId: SessionIdSchema.parse("test-session"),
        }),
      };
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      // Invalid MCP config should be handled by parseMcpConfig
      const session = await manager.createSession({
        cwd: "/test",
        mcpConfig: null,
      });

      expect(session).toBeDefined();
      expect(session.metadata.mcpServers).toEqual([]);
    });

    it("should handle missing environment gracefully", async () => {
      const client = {
        newSession: vi.fn().mockResolvedValue({
          sessionId: SessionIdSchema.parse("test-session"),
        }),
      };
      const store = createMockStore();
      const manager = new SessionManager(client, store);

      const session = await manager.createSession({
        cwd: "/test",
        env: {},
      });

      expect(session.mode).toBeDefined();
    });
  });
});

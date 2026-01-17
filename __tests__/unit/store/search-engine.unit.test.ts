import { describe, expect, it, vi } from "vitest";
import { CONTENT_BLOCK_TYPE } from "../../../src/constants/content-block-types";
import type { PersistenceProvider } from "../../../src/store/persistence/persistence-provider";
import { createSearchEngine } from "../../../src/store/persistence/search-engine";
import type { Message, Session } from "../../../src/types/domain";
import { MessageIdSchema, SessionIdSchema } from "../../../src/types/domain";

describe("SearchEngine", () => {
  const createMockProvider = (): PersistenceProvider => ({
    load: vi.fn(),
    save: vi.fn(),
    close: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    getSessionHistory: vi.fn().mockResolvedValue({
      id: "session-1",
      agentId: "agent-1",
      messageIds: [],
      createdAt: 0,
      updatedAt: 0,
      mode: "auto",
      messages: [],
    }),
  });

  describe("search()", () => {
    it("should forward search query to provider", async () => {
      const provider = createMockProvider();
      const engine = createSearchEngine(provider);

      const query = { text: "test query" };
      await engine.search(query);

      expect(provider.search).toHaveBeenCalledWith(query);
    });

    it("should return search results from provider", async () => {
      const provider = createMockProvider();
      const messages: Message[] = [
        {
          id: MessageIdSchema.parse("msg-1"),
          sessionId: SessionIdSchema.parse("session-1"),
          role: "user",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "test message" }],
          createdAt: Date.now(),
          isStreaming: false,
        },
      ];
      (provider.search as ReturnType<typeof vi.fn>).mockResolvedValue(messages);

      const engine = createSearchEngine(provider);
      const results = await engine.search({ text: "test" });

      expect(results).toEqual(messages);
    });

    it("should propagate errors from provider", async () => {
      const provider = createMockProvider();
      const error = new Error("Search failed");
      (provider.search as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      const engine = createSearchEngine(provider);

      await expect(engine.search({ text: "test" })).rejects.toThrow("Search failed");
    });
  });

  describe("getSessionHistory()", () => {
    it("should forward session history request to provider", async () => {
      const provider = createMockProvider();
      const engine = createSearchEngine(provider);

      const sessionId = "session-1";
      await engine.getSessionHistory(sessionId);

      expect(provider.getSessionHistory).toHaveBeenCalledWith(sessionId);
    });

    it("should return session with messages from provider", async () => {
      const provider = createMockProvider();
      const sessionWithMessages: Session & { messages: Message[] } = {
        id: SessionIdSchema.parse("session-1"),
        agentId: "agent-1",
        messageIds: [MessageIdSchema.parse("msg-1")],
        createdAt: 1000,
        updatedAt: 1000,
        mode: "auto",
        messages: [
          {
            id: MessageIdSchema.parse("msg-1"),
            sessionId: SessionIdSchema.parse("session-1"),
            role: "user",
            content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "message" }],
            createdAt: 1000,
            isStreaming: false,
          },
        ],
      };
      (provider.getSessionHistory as ReturnType<typeof vi.fn>).mockResolvedValue(
        sessionWithMessages
      );

      const engine = createSearchEngine(provider);
      const result = await engine.getSessionHistory("session-1");

      expect(result.id).toBe("session-1");
      expect(result.messages).toHaveLength(1);
    });

    it("should propagate errors from provider", async () => {
      const provider = createMockProvider();
      const error = new Error("History failed");
      (provider.getSessionHistory as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      const engine = createSearchEngine(provider);

      await expect(engine.getSessionHistory("session-1")).rejects.toThrow("History failed");
    });
  });
});

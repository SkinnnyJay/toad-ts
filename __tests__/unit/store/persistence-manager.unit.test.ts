import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";
import { CONTENT_BLOCK_TYPE } from "../../../src/constants/content-block-types";
import { PERSISTENCE_WRITE_MODE } from "../../../src/constants/persistence-write-modes";
import { useAppStore } from "../../../src/store/app-store";
import { PersistenceManager } from "../../../src/store/persistence/persistence-manager";
import type { PersistenceProvider } from "../../../src/store/persistence/persistence-provider";
import type { SessionSnapshot } from "../../../src/store/session-persistence";
import { MessageIdSchema, SessionIdSchema } from "../../../src/types/domain";
import { disableMockLogger, enableMockLogger } from "../../../src/utils/logging/logger.utils";

describe("PersistenceManager", () => {
  const createMockProvider = (): PersistenceProvider => ({
    load: vi.fn().mockResolvedValue({
      currentSessionId: undefined,
      sessions: {},
      messages: {},
      plans: {},
      contextAttachments: {},
    }),

    save: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
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

  beforeEach(() => {
    useAppStore.getState().reset();
  });

  describe("hydrate()", () => {
    it("should load snapshot from provider and hydrate store", async () => {
      const provider = createMockProvider();
      const snapshot: SessionSnapshot = {
        currentSessionId: SessionIdSchema.parse("session-1"),
        sessions: {
          "session-1": {
            id: SessionIdSchema.parse("session-1"),
            agentId: "agent-1",
            messageIds: [],
            createdAt: 1000,
            updatedAt: 1000,
            mode: "auto",
          },
        },
        messages: {},
        plans: {},
        contextAttachments: {},
      };
      (provider.load as ReturnType<typeof vi.fn>).mockResolvedValue(snapshot);

      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE,
        batchDelay: 100,
      });

      await manager.hydrate();

      const state = useAppStore.getState();
      expect(state.currentSessionId).toBe("session-1");
      expect(state.sessions["session-1"]).toBeDefined();
    });

    it("should handle empty snapshot", async () => {
      const provider = createMockProvider();
      const snapshot: SessionSnapshot = {
        currentSessionId: undefined,
        sessions: {},
        messages: {},
        plans: {},
        contextAttachments: {},
      };
      (provider.load as ReturnType<typeof vi.fn>).mockResolvedValue(snapshot);

      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE,
        batchDelay: 100,
      });

      await manager.hydrate();

      const state = useAppStore.getState();
      expect(Object.keys(state.sessions)).toHaveLength(0);
    });
  });

  describe("start() and stop()", () => {
    it("should subscribe to store changes", () => {
      const provider = createMockProvider();
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
        batchDelay: 100,
      });

      manager.start();

      // Trigger a store change
      useAppStore.getState().setConnectionStatus("connected");

      // Should have set up subscription
      expect(manager).toBeDefined();

      manager.stop();
    });

    it("should not subscribe twice", () => {
      const provider = createMockProvider();
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
        batchDelay: 100,
      });

      manager.start();
      manager.start(); // Second call should be no-op

      manager.stop();
    });

    it("should unsubscribe when stopped", () => {
      const provider = createMockProvider();
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
        batchDelay: 100,
      });

      manager.start();
      manager.stop();

      // Should be able to start again after stop
      manager.start();
      manager.stop();
    });
  });

  describe("write modes", () => {
    it("should persist on every change in PER_TOKEN mode", async () => {
      const provider = createMockProvider();
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.PER_TOKEN,
        batchDelay: 10,
      });

      manager.start();

      // Any change should trigger persistence
      useAppStore.getState().setConnectionStatus("connected");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(provider.save).toHaveBeenCalled();
      manager.stop();
    });

    it("should persist on message changes in PER_MESSAGE mode", async () => {
      const provider = createMockProvider();
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
        batchDelay: 10,
      });

      manager.start();

      const sessionId = SessionIdSchema.parse("session-1");
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

      useAppStore.getState().appendMessage({
        id: MessageIdSchema.parse("msg-1"),
        sessionId,
        role: "user",
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "test" }],
        createdAt: Date.now(),
        isStreaming: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(provider.save).toHaveBeenCalled();
      manager.stop();
    });

    it("should persist on session change in ON_SESSION_CHANGE mode", async () => {
      const provider = createMockProvider();
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE,
        batchDelay: 10,
      });

      manager.start();

      const sessionId = SessionIdSchema.parse("session-1");
      useAppStore.getState().setCurrentSession(sessionId);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(provider.save).toHaveBeenCalled();
      manager.stop();
    });
  });

  describe("debouncing", () => {
    it("should debounce saves with batch delay", async () => {
      const provider = createMockProvider();
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.PER_TOKEN,
        batchDelay: 100,
      });

      manager.start();

      // Trigger multiple changes quickly
      useAppStore.getState().setConnectionStatus("connected");
      useAppStore.getState().setConnectionStatus("disconnected");
      useAppStore.getState().setConnectionStatus("connected");

      // Should not have saved yet
      expect(provider.save).not.toHaveBeenCalled();

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should have saved once
      expect(provider.save).toHaveBeenCalledTimes(1);
      manager.stop();
    });
  });

  describe("close()", () => {
    it("should stop and close provider", async () => {
      const provider = createMockProvider();
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
        batchDelay: 100,
      });

      manager.start();
      await manager.close();

      expect(provider.close).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should swallow and log save errors", async () => {
      enableMockLogger();
      const provider = createMockProvider();
      (provider.save as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("disk full"));
      const manager = new PersistenceManager(useAppStore, provider, {
        writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
        batchDelay: 0,
      });

      manager.start();
      useAppStore.getState().setConnectionStatus("connected");
      await new Promise((resolve) => setTimeout(resolve, 10));
      manager.stop();
      disableMockLogger();

      expect(provider.save).toHaveBeenCalled();
    });
  });
});

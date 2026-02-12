import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_CONFIG } from "../../../src/config/app-config";
import { useAppStore } from "../../../src/store/app-store";
import { SessionIdSchema } from "../../../src/types/domain";
import { HelpModal } from "../../../src/ui/components/HelpModal";
import { SessionsPopup } from "../../../src/ui/components/SessionsPopup";
import { SettingsModal } from "../../../src/ui/components/SettingsModal";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk, setupSession, waitFor } from "../../utils/ink-test-helpers";
import { keyboardRuntime } from "../../utils/opentui-test-runtime";

afterEach(() => {
  cleanup();
});

describe("UI Modals", () => {
  describe("SettingsModal", () => {
    it("should render when open", () => {
      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SettingsModal, {
            isOpen: true,
            onClose: () => {},
            agents: [],
            keybinds: DEFAULT_APP_CONFIG.keybinds,
            onUpdateKeybinds: () => {},
          })
        )
      );

      expect(lastFrame()).toContain("Settings");
    });

    it("should not render when closed", () => {
      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SettingsModal, {
            isOpen: false,
            onClose: () => {},
            agents: [],
            keybinds: DEFAULT_APP_CONFIG.keybinds,
            onUpdateKeybinds: () => {},
          })
        )
      );

      expect(lastFrame()).not.toContain("Settings");
    });

    it("renders mode and model settings tabs, plus model refresh action", async () => {
      const onRefreshModels = vi.fn(async () => undefined);
      const onSelectMode = vi.fn(async () => undefined);
      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SettingsModal, {
            isOpen: true,
            onClose: () => {},
            agents: [],
            keybinds: DEFAULT_APP_CONFIG.keybinds,
            onUpdateKeybinds: () => {},
            currentMode: "auto",
            onSelectMode,
            availableModels: [{ modelId: "auto", name: "Auto" }],
            currentModelId: "auto",
            onSelectModel: async () => undefined,
            onRefreshModels,
          })
        )
      );

      expect(lastFrame()).toContain("Model");
      stdin.write("\x1B[C");
      await waitFor(() => lastFrame().includes("Session Mode"));
      expect(lastFrame()).toContain("Session Mode");
      stdin.write("\x1B[B");
      stdin.write("\r");
      await waitFor(() => onSelectMode.mock.calls.length === 1);
      expect(onSelectMode).toHaveBeenCalledWith("read-only");
      stdin.write("\x1B[C");
      await waitFor(() => lastFrame().includes("Session Model"));
      expect(lastFrame()).toContain("Session Model");
      expect(lastFrame()).toContain("Auto");
      keyboardRuntime.emit("r", { ctrl: true });
      await waitFor(() => onRefreshModels.mock.calls.length === 1);
      await waitFor(() => lastFrame().includes("Refreshed model list."));
    });
  });

  describe("HelpModal", () => {
    it("should render help content when open", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(HelpModal, {
            isOpen: true,
            onClose: () => {},
          })
        )
      );

      expect(lastFrame()).toContain("Available Commands");
    });

    it("should not render when closed", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(HelpModal, {
            isOpen: false,
            onClose: () => {},
          })
        )
      );

      expect(lastFrame()).not.toContain("Available Commands");
    });
  });

  describe("SessionsPopup", () => {
    it("should render sessions list when open", () => {
      const sessionId = setupSession({ mode: "auto" });
      const store = useAppStore.getState();

      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
          })
        )
      );

      expect(lastFrame()).toContain("Sessions");
    });

    it("filters sessions based on typed input", () => {
      const sessionId = setupSession({ sessionId: "session-alpha", mode: "auto" });
      const store = useAppStore.getState();
      const baseSession = store.getSession(sessionId);
      if (!baseSession) {
        throw new Error("Missing base session");
      }
      store.upsertSession({
        session: {
          ...baseSession,
          title: "Alpha Session",
          createdAt: 1,
          updatedAt: 1,
        },
      });
      const betaSessionId = SessionIdSchema.parse("session-beta");
      store.upsertSession({
        session: {
          id: betaSessionId,
          agentId: baseSession.agentId,
          messageIds: [],
          createdAt: 2,
          updatedAt: 2,
          mode: baseSession.mode,
          metadata: baseSession.metadata,
          title: "Beta Session",
        },
      });

      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
          })
        )
      );

      stdin.write("Alpha");

      const frame = lastFrame();
      expect(frame).toContain("Filter: Alpha");
      expect(frame).toContain("Alpha Session");
      expect(frame).not.toContain("Beta Session");
    });

    it("should show empty state when no sessions", () => {
      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
          })
        )
      );

      expect(lastFrame()).toContain("No sessions");
    });

    it("renders external native-session loading state", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
            externalSessionLoading: true,
          })
        )
      );

      expect(lastFrame()).toContain("Loading native Cursor sessions");
    });

    it("triggers native-session refresh on Ctrl+R", () => {
      const onRefreshExternalSessions = vi.fn();
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
            onRefreshExternalSessions,
          })
        )
      );

      keyboardRuntime.emit("r", { ctrl: true });
      expect(onRefreshExternalSessions).toHaveBeenCalledTimes(1);
      expect(lastFrame()).toContain("Ctrl+R: Refresh native");
    });

    it("renders external native-session error details", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
            externalSessionError: "agent ls failed: requires tty in this terminal",
          })
        )
      );

      expect(lastFrame()).toContain("Native sessions unavailable:");
      expect(lastFrame()).toContain("requires tty");
    });

    it("shows external cursor sessions in the popup list", () => {
      const nativeSessionId = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");

      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
            externalSessions: [
              {
                id: nativeSessionId,
                title: "Native title",
                createdAt: "2026-02-11T18:30:00.000Z",
                model: "gpt-5",
                messageCount: 14,
              },
            ],
          })
        )
      );

      expect(lastFrame()).toContain("Native: 123e4567");
      expect(lastFrame()).toContain("Native title");
      stdin.write("gpt-5");
      expect(lastFrame()).toContain("Filter: gpt-5");
      expect(lastFrame()).toContain("Native: 123e4567");
    });

    it("filters external cursor sessions by created timestamp metadata", () => {
      const nativeSessionId = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");

      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
            externalSessions: [
              {
                id: nativeSessionId,
                title: "Native title",
                createdAt: "2026-02-11T18:30:00.000Z",
                model: "gpt-5",
                messageCount: 14,
              },
            ],
          })
        )
      );

      stdin.write("2026");
      expect(lastFrame()).toContain("Filter: 2026");
      expect(lastFrame()).toContain("Native: 123e4567");
    });

    it("keeps invalid external createdAt metadata searchable", () => {
      const nativeSessionId = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");

      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
            externalSessions: [
              {
                id: nativeSessionId,
                title: "Native title",
                createdAt: "invalid-timestamp",
              },
            ],
          })
        )
      );

      stdin.write("invalid-timestamp");
      expect(lastFrame()).toContain("Filter: invalid-timestamp");
      expect(lastFrame()).toContain("Native: 123e4567");
    });

    it("orders external cursor sessions by newest created timestamp first", () => {
      const newestSessionId = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");
      const oldestSessionId = SessionIdSchema.parse("223e4567-e89b-12d3-a456-426614174000");

      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
            externalSessions: [
              {
                id: oldestSessionId,
                title: "Old session",
                createdAt: "2026-02-10T10:00:00.000Z",
              },
              {
                id: newestSessionId,
                title: "New session",
                createdAt: "2026-02-11T10:00:00.000Z",
              },
            ],
          })
        )
      );

      const frame = lastFrame();
      const newestIndex = frame.indexOf("Native: 123e4567");
      const oldestIndex = frame.indexOf("Native: 223e4567");

      expect(newestIndex).toBeGreaterThanOrEqual(0);
      expect(oldestIndex).toBeGreaterThanOrEqual(0);
      expect(newestIndex).toBeLessThan(oldestIndex);
    });

    it("deduplicates external cursor sessions by id", () => {
      const duplicatedSessionId = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");
      const { lastFrame, stdin } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SessionsPopup, {
            isOpen: true,
            onClose: () => {},
            onSelectSession: () => {},
            externalSessions: [
              { id: duplicatedSessionId, title: "Old title" },
              {
                id: duplicatedSessionId,
                title: "Recovered title",
                model: "gpt-5",
                messageCount: 14,
              },
            ],
          })
        )
      );

      const frame = lastFrame();
      const nativeLabel = "Native: 123e4567";
      expect(frame.indexOf(nativeLabel)).toBeGreaterThanOrEqual(0);
      expect(frame.lastIndexOf(nativeLabel)).toBe(frame.indexOf(nativeLabel));
      stdin.write("gpt-5");
      expect(lastFrame()).toContain("Filter: gpt-5");
      expect(lastFrame()).toContain(nativeLabel);
    });
  });
});

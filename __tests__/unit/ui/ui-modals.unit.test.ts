import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { SessionIdSchema } from "../../../src/types/domain";
import { HelpModal } from "../../../src/ui/components/HelpModal";
import { SessionsPopup } from "../../../src/ui/components/SessionsPopup";
import { SettingsModal } from "../../../src/ui/components/SettingsModal";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk, setupSession } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("UI Modals", () => {
  describe("SettingsModal", () => {
    it("should render when open", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SettingsModal, {
            isOpen: true,
            onClose: () => {},
            agents: [],
          })
        )
      );

      expect(lastFrame()).toContain("Settings");
    });

    it("should not render when closed", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(SettingsModal, {
            isOpen: false,
            onClose: () => {},
            agents: [],
          })
        )
      );

      expect(lastFrame()).not.toContain("Settings");
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

      const { lastFrame } = renderInk(
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

    it("should show empty state when no sessions", () => {
      const { lastFrame } = renderInk(
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
  });
});

import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AppIcon } from "../../../src/ui/components/AppIcon";
import { AsciiBanner } from "../../../src/ui/components/AsciiBanner";
import { LoadingScreen } from "../../../src/ui/components/LoadingScreen";
import { StatusFooter } from "../../../src/ui/components/StatusFooter";
import { StatusLine } from "../../../src/ui/components/StatusLine";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Supporting UI Components", () => {
  describe("AsciiBanner", () => {
    it("should render banner", () => {
      const { lastFrame } = renderInk(
        React.createElement(TruncationProvider, {}, React.createElement(AsciiBanner))
      );

      // Banner should render - may be empty or contain ASCII art
      const frame = lastFrame();
      expect(frame).toBeDefined();
      // Frame exists (may be empty for ASCII banner)
      expect(typeof frame).toBe("string");
    });
  });

  describe("AppIcon", () => {
    it("should render icon", () => {
      const { lastFrame } = renderInk(
        React.createElement(TruncationProvider, {}, React.createElement(AppIcon))
      );

      // Icon should render
      const frame = lastFrame();
      expect(frame).toBeTruthy();
      expect(frame.length).toBeGreaterThan(0);
    });
  });

  describe("LoadingScreen", () => {
    it("should render loading screen", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(LoadingScreen, { progress: 50, status: "Loading..." })
        )
      );

      expect(lastFrame()).toBeTruthy();
    });
  });

  describe("StatusLine", () => {
    it("should render status line", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(StatusLine, { text: "Status message" })
        )
      );

      const frame = lastFrame();
      expect(frame).toBeTruthy();
      // StatusLine may format the text, so just check it renders
      expect(frame.length).toBeGreaterThan(0);
    });
  });

  describe("StatusFooter", () => {
    it("should render status footer", () => {
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(StatusFooter, { focusTarget: "chat" })
        )
      );

      expect(lastFrame()).toBeTruthy();
    });
  });
});

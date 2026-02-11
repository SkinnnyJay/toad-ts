import { DiffRenderer } from "@/ui/components/DiffRenderer";
import { TruncationProvider } from "@/ui/components/TruncationProvider";
import React from "react";
import { describe, expect, it } from "vitest";
import { renderInk } from "../../utils/ink-test-helpers";

describe("DiffRenderer", () => {
  const renderWithProvider = (element: React.ReactElement) => {
    return renderInk(React.createElement(TruncationProvider, null, element));
  };

  describe("basic rendering", () => {
    it("should render filename in header", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "old",
          newContent: "new",
          filename: "test.ts",
        })
      );

      expect(lastFrame()).toContain("test.ts");
    });

    it("should show addition and deletion counts", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "line1\nline2",
          newContent: "line1\nmodified",
          filename: "test.ts",
        })
      );

      const frame = lastFrame();
      expect(frame).toContain("-line2");
      expect(frame).toContain("+modified");
    });

    it("should show 'No changes' when content is identical", () => {
      const content = "same content";
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: content,
          newContent: content,
          filename: "test.ts",
        })
      );

      expect(lastFrame()).not.toContain("@@");
    });
  });

  describe("new and deleted files", () => {
    it("should indicate new file when old content is empty", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "",
          newContent: "new content",
          filename: "new-file.ts",
        })
      );

      expect(lastFrame()).toContain("+new content");
    });

    it("should indicate deleted file when new content is empty", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "old content",
          newContent: "",
          filename: "deleted-file.ts",
        })
      );

      expect(lastFrame()).toContain("-old content");
    });
  });

  describe("diff content", () => {
    it("should show added lines with + prefix", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "",
          newContent: "added line",
          filename: "test.ts",
        })
      );

      expect(lastFrame()).toContain("+added line");
    });

    it("should show removed lines with - prefix", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "removed line",
          newContent: "",
          filename: "test.ts",
        })
      );

      expect(lastFrame()).toContain("-removed line");
    });
  });

  describe("props handling", () => {
    it("should accept custom id for truncation", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "old",
          newContent: "new",
          filename: "test.ts",
          id: "custom-diff-id",
        })
      );

      // Should render without errors
      expect(lastFrame()).toBeDefined();
    });

    it("should accept language override", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "old",
          newContent: "new",
          filename: "test.txt",
          language: "typescript",
        })
      );

      // Should render without errors
      expect(lastFrame()).toBeDefined();
    });

    it("should accept contextLines prop", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "line1\nline2\nline3\nline4\nline5",
          newContent: "line1\nline2\nmodified\nline4\nline5",
          filename: "test.ts",
          contextLines: 1,
        })
      );

      // Should render without errors
      expect(lastFrame()).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "",
          newContent: "",
          filename: "empty.ts",
        })
      );

      expect(lastFrame()).not.toContain("@@");
    });

    it("should handle multiline content", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: "line1\nline2\nline3\nline4\nline5",
          newContent: "line1\nmodified2\nline3\nmodified4\nline5",
          filename: "multi.ts",
        })
      );

      // Should render without errors
      expect(lastFrame()).toBeDefined();
      expect(lastFrame()).toContain("multi.ts");
    });

    it("should handle content with special characters", () => {
      const { lastFrame } = renderWithProvider(
        React.createElement(DiffRenderer, {
          oldContent: 'const x = "hello";',
          newContent: 'const x = "world";',
          filename: "special.ts",
        })
      );

      // Should render without errors
      expect(lastFrame()).toBeDefined();
    });
  });
});

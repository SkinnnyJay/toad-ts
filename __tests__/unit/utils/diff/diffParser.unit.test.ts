import { DIFF_LINE_TYPE } from "@/constants/diff-types";
import type { DiffHunk, DiffLine } from "@/types/diff.types";
import {
  computeDiff,
  computeStats,
  detectLanguage,
  formatHunkHeader,
  formatLineNumbers,
  getLinePrefix,
  groupIntoHunks,
  parseDiffLines,
} from "@/utils/diff/diffParser";
import { describe, expect, it } from "vitest";

describe("diffParser", () => {
  describe("detectLanguage", () => {
    it("should detect TypeScript files", () => {
      expect(detectLanguage("file.ts")).toBe("typescript");
      expect(detectLanguage("component.tsx")).toBe("tsx");
    });

    it("should detect JavaScript files", () => {
      expect(detectLanguage("script.js")).toBe("javascript");
      expect(detectLanguage("component.jsx")).toBe("jsx");
    });

    it("should detect other common languages", () => {
      expect(detectLanguage("app.py")).toBe("python");
      expect(detectLanguage("main.go")).toBe("go");
      expect(detectLanguage("lib.rs")).toBe("rust");
      expect(detectLanguage("config.json")).toBe("json");
      expect(detectLanguage("styles.css")).toBe("css");
      expect(detectLanguage("index.html")).toBe("html");
      expect(detectLanguage("config.yaml")).toBe("yaml");
      expect(detectLanguage("config.yml")).toBe("yaml");
      expect(detectLanguage("script.sh")).toBe("bash");
    });

    it("should return undefined for unknown extensions", () => {
      expect(detectLanguage("file.xyz")).toBeUndefined();
      expect(detectLanguage("noextension")).toBeUndefined();
    });
  });

  describe("parseDiffLines", () => {
    it("should parse added lines", () => {
      const changes = [{ value: "new line\n", added: true }];
      const lines = parseDiffLines(changes);

      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({
        type: DIFF_LINE_TYPE.ADDED,
        content: "new line",
        newLineNumber: 1,
      });
    });

    it("should parse removed lines", () => {
      const changes = [{ value: "old line\n", removed: true }];
      const lines = parseDiffLines(changes);

      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({
        type: DIFF_LINE_TYPE.REMOVED,
        content: "old line",
        oldLineNumber: 1,
      });
    });

    it("should parse unchanged lines", () => {
      const changes = [{ value: "same line\n" }];
      const lines = parseDiffLines(changes);

      expect(lines).toHaveLength(1);
      expect(lines[0]).toEqual({
        type: DIFF_LINE_TYPE.UNCHANGED,
        content: "same line",
        oldLineNumber: 1,
        newLineNumber: 1,
      });
    });

    it("should handle multiple lines in a single change", () => {
      const changes = [{ value: "line1\nline2\nline3\n", added: true }];
      const lines = parseDiffLines(changes);

      expect(lines).toHaveLength(3);
      expect(lines[0]?.newLineNumber).toBe(1);
      expect(lines[1]?.newLineNumber).toBe(2);
      expect(lines[2]?.newLineNumber).toBe(3);
    });

    it("should track line numbers correctly across mixed changes", () => {
      const changes = [
        { value: "unchanged\n" },
        { value: "removed\n", removed: true },
        { value: "added\n", added: true },
        { value: "unchanged2\n" },
      ];
      const lines = parseDiffLines(changes);

      expect(lines).toHaveLength(4);
      // First unchanged: old=1, new=1
      expect(lines[0]).toMatchObject({
        type: DIFF_LINE_TYPE.UNCHANGED,
        oldLineNumber: 1,
        newLineNumber: 1,
      });
      // Removed: old=2, no new
      expect(lines[1]).toMatchObject({
        type: DIFF_LINE_TYPE.REMOVED,
        oldLineNumber: 2,
      });
      expect(lines[1]?.newLineNumber).toBeUndefined();
      // Added: no old, new=2
      expect(lines[2]).toMatchObject({
        type: DIFF_LINE_TYPE.ADDED,
        newLineNumber: 2,
      });
      expect(lines[2]?.oldLineNumber).toBeUndefined();
      // Second unchanged: old=3, new=3
      expect(lines[3]).toMatchObject({
        type: DIFF_LINE_TYPE.UNCHANGED,
        oldLineNumber: 3,
        newLineNumber: 3,
      });
    });
  });

  describe("groupIntoHunks", () => {
    it("should return empty array for no changes", () => {
      const lines: DiffLine[] = [
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "line1", oldLineNumber: 1, newLineNumber: 1 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "line2", oldLineNumber: 2, newLineNumber: 2 },
      ];
      const hunks = groupIntoHunks(lines, 3);
      expect(hunks).toHaveLength(0);
    });

    it("should create a single hunk for a single change", () => {
      const lines: DiffLine[] = [
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "context1", oldLineNumber: 1, newLineNumber: 1 },
        { type: DIFF_LINE_TYPE.ADDED, content: "added", newLineNumber: 2 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "context2", oldLineNumber: 2, newLineNumber: 3 },
      ];
      const hunks = groupIntoHunks(lines, 3);

      expect(hunks).toHaveLength(1);
      expect(hunks[0]?.lines).toHaveLength(3);
    });

    it("should include context lines around changes", () => {
      const lines: DiffLine[] = [
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "far", oldLineNumber: 1, newLineNumber: 1 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "far", oldLineNumber: 2, newLineNumber: 2 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "far", oldLineNumber: 3, newLineNumber: 3 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "context", oldLineNumber: 4, newLineNumber: 4 },
        { type: DIFF_LINE_TYPE.ADDED, content: "added", newLineNumber: 5 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "context", oldLineNumber: 5, newLineNumber: 6 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "far", oldLineNumber: 6, newLineNumber: 7 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "far", oldLineNumber: 7, newLineNumber: 8 },
      ];

      // With context of 1, should only include immediate neighbors
      const hunks = groupIntoHunks(lines, 1);
      expect(hunks).toHaveLength(1);
      // Should include: context (line 4), added, context (line 5)
      expect(hunks[0]?.lines.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("computeStats", () => {
    it("should count additions and deletions", () => {
      const lines: DiffLine[] = [
        { type: DIFF_LINE_TYPE.ADDED, content: "new1", newLineNumber: 1 },
        { type: DIFF_LINE_TYPE.ADDED, content: "new2", newLineNumber: 2 },
        { type: DIFF_LINE_TYPE.REMOVED, content: "old1", oldLineNumber: 1 },
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "same", oldLineNumber: 2, newLineNumber: 3 },
      ];

      const stats = computeStats(lines);
      expect(stats.additions).toBe(2);
      expect(stats.deletions).toBe(1);
      expect(stats.totalChanges).toBe(3);
    });

    it("should return zeros for no changes", () => {
      const lines: DiffLine[] = [
        { type: DIFF_LINE_TYPE.UNCHANGED, content: "same", oldLineNumber: 1, newLineNumber: 1 },
      ];

      const stats = computeStats(lines);
      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(0);
      expect(stats.totalChanges).toBe(0);
    });
  });

  describe("computeDiff", () => {
    it("should compute diff between two strings", () => {
      const oldContent = "line1\nline2\nline3";
      const newContent = "line1\nmodified\nline3";

      const diff = computeDiff(oldContent, newContent, "test.ts");

      expect(diff.filename).toBe("test.ts");
      expect(diff.language).toBe("typescript");
      expect(diff.additions).toBeGreaterThan(0);
      expect(diff.deletions).toBeGreaterThan(0);
      expect(diff.hunks.length).toBeGreaterThan(0);
    });

    it("should detect new files", () => {
      const diff = computeDiff("", "new content", "new.ts");
      expect(diff.isNewFile).toBe(true);
      expect(diff.isDeleted).toBe(false);
    });

    it("should detect deleted files", () => {
      const diff = computeDiff("old content", "", "deleted.ts");
      expect(diff.isNewFile).toBe(false);
      expect(diff.isDeleted).toBe(true);
    });

    it("should handle identical content", () => {
      const content = "same\ncontent";
      const diff = computeDiff(content, content, "same.ts");

      expect(diff.additions).toBe(0);
      expect(diff.deletions).toBe(0);
      expect(diff.hunks).toHaveLength(0);
    });
  });

  describe("formatHunkHeader", () => {
    it("should format hunk header in git style", () => {
      const hunk: DiffHunk = {
        oldStart: 10,
        oldCount: 5,
        newStart: 12,
        newCount: 7,
        lines: [],
      };

      expect(formatHunkHeader(hunk)).toBe("@@ -10,5 +12,7 @@");
    });
  });

  describe("getLinePrefix", () => {
    it("should return correct prefixes for each line type", () => {
      expect(getLinePrefix(DIFF_LINE_TYPE.ADDED)).toBe("+");
      expect(getLinePrefix(DIFF_LINE_TYPE.REMOVED)).toBe("-");
      expect(getLinePrefix(DIFF_LINE_TYPE.UNCHANGED)).toBe(" ");
      expect(getLinePrefix(DIFF_LINE_TYPE.HEADER)).toBe("");
    });
  });

  describe("formatLineNumbers", () => {
    it("should format line numbers with proper padding", () => {
      const line: DiffLine = {
        type: DIFF_LINE_TYPE.UNCHANGED,
        content: "test",
        oldLineNumber: 5,
        newLineNumber: 10,
      };

      const [oldStr, newStr] = formatLineNumbers(line, 100, 100);
      expect(oldStr).toBe("  5");
      expect(newStr).toBe(" 10");
    });

    it("should handle missing line numbers", () => {
      const addedLine: DiffLine = {
        type: DIFF_LINE_TYPE.ADDED,
        content: "new",
        newLineNumber: 5,
      };

      const [oldStr, newStr] = formatLineNumbers(addedLine, 10, 10);
      expect(oldStr).toBe("  "); // 2 spaces for width of "10"
      expect(newStr).toBe(" 5");
    });
  });
});

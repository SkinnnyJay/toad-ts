import { describe, expect, it } from "vitest";
import { cleanPrompt } from "../../../src/utils/token-optimizer/cleaner";

describe("Cleaner", () => {
  describe("cleanPrompt()", () => {
    it("should trim leading and trailing whitespace", () => {
      const result = cleanPrompt({
        text: "  text with spaces  ",
        options: { trim: true },
      });

      expect(result.output).toBe("text with spaces");
      expect(result.appliedTransforms.find((t) => t.name === "trim")?.applied).toBe(true);
    });

    it("should not trim when trim option is false", () => {
      const result = cleanPrompt({
        text: "  text with spaces  ",
        options: {
          trim: false,
          collapseWhitespace: false,
          normalizeNewlines: false,
          jsonFlatten: false,
        },
      });

      expect(result.output).toBe("  text with spaces  ");
      expect(result.appliedTransforms.find((t) => t.name === "trim")?.applied).toBe(false);
    });

    it("should collapse multiple whitespace characters", () => {
      const result = cleanPrompt({
        text: "text   with    multiple     spaces",
        options: { collapseWhitespace: true },
      });

      expect(result.output).toBe("text with multiple spaces");
      expect(result.appliedTransforms.find((t) => t.name === "collapseWhitespace")?.applied).toBe(
        true
      );
    });

    it("should not collapse whitespace when option is false", () => {
      const result = cleanPrompt({
        text: "text   with    multiple     spaces",
        options: { collapseWhitespace: false },
      });

      expect(result.output).toBe("text   with    multiple     spaces");
      expect(result.appliedTransforms.find((t) => t.name === "collapseWhitespace")?.applied).toBe(
        false
      );
    });

    it("should normalize newlines", () => {
      const result = cleanPrompt({
        text: "line1\r\nline2\rline3\nline4",
        options: { normalizeNewlines: true },
      });

      expect(result.output).toBe("line1\nline2\nline3\nline4");
      expect(result.appliedTransforms.find((t) => t.name === "normalizeNewlines")?.applied).toBe(
        true
      );
    });

    it("should flatten JSON when jsonFlatten is enabled", () => {
      const input = '{\n  "key": "value",\n  "nested": {\n    "inner": "data"\n  }\n}';
      const result = cleanPrompt({
        text: input,
        options: { jsonFlatten: true },
      });

      expect(result.output).not.toContain("\n  ");
      expect(result.output).toContain('"key"');
      expect(result.appliedTransforms.find((t) => t.name === "jsonFlatten")?.applied).toBe(true);
    });

    it("should not flatten non-JSON text when jsonFlatten is enabled", () => {
      const input = "This is not JSON text";
      const result = cleanPrompt({
        text: input,
        options: { jsonFlatten: true },
      });

      expect(result.output).toBe(input);
      expect(result.appliedTransforms.find((t) => t.name === "jsonFlatten")?.applied).toBe(false);
    });

    it("should apply all transforms in sequence", () => {
      const result = cleanPrompt({
        text: "  text   with   spaces  \r\n",
        options: {
          trim: true,
          collapseWhitespace: true,
          normalizeNewlines: true,
          jsonFlatten: false,
        },
      });

      // After trim (removes leading/trailing including \r\n), collapseWhitespace, normalizeNewlines
      // Trim removes the trailing \r\n, so final result is "text with spaces" (no newline)
      expect(result.output).toBe("text with spaces");
      expect(result.appliedTransforms.find((t) => t.name === "trim")?.applied).toBe(true);
      expect(result.appliedTransforms.find((t) => t.name === "collapseWhitespace")?.applied).toBe(
        true
      );
      // normalizeNewlines may not apply if trim already removed the newlines
      expect(result.appliedTransforms.find((t) => t.name === "jsonFlatten")?.applied).toBe(false);
    });

    it("should use default options when not provided", () => {
      const result = cleanPrompt({
        text: "  text   with   spaces  ",
      });

      // Defaults should apply trim and collapseWhitespace
      expect(result.output).toBe("text with spaces");
    });

    it("should handle empty string", () => {
      const result = cleanPrompt({
        text: "",
        options: {
          trim: true,
          collapseWhitespace: true,
          normalizeNewlines: true,
          jsonFlatten: false,
        },
      });

      expect(result.output).toBe("");
      expect(result.appliedTransforms.length).toBe(4);
    });

    it("should handle JSON array flattening", () => {
      const input = '[\n  "item1",\n  "item2"\n]';
      const result = cleanPrompt({
        text: input,
        options: { jsonFlatten: true },
      });

      expect(result.output).not.toContain("\n  ");
      expect(result.appliedTransforms.find((t) => t.name === "jsonFlatten")?.applied).toBe(true);
    });

    it("should handle invalid JSON gracefully when jsonFlatten is enabled", () => {
      const input = "{ invalid json }";
      const result = cleanPrompt({
        text: input,
        options: { jsonFlatten: true },
      });

      expect(result.output).toBe(input);
      expect(result.appliedTransforms.find((t) => t.name === "jsonFlatten")?.applied).toBe(false);
    });
  });
});

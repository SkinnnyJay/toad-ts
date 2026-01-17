import { describe, expect, it } from "vitest";
import { createDefaultTokenizerAdapter } from "../../../src/utils/token-optimizer/tokenizer";

describe("Tokenizer", () => {
  describe("createDefaultTokenizerAdapter()", () => {
    it("should create a tokenizer adapter", () => {
      const tokenizer = createDefaultTokenizerAdapter();

      expect(tokenizer).toBeDefined();
      expect(tokenizer.name).toBeTruthy();
      expect(typeof tokenizer.estimate).toBe("function");
    });

    it("should estimate tokens for simple text", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      const result = tokenizer.estimate("Hello world");

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.charCount).toBe(11);
      expect(result.byteSize).toBe(11);
    });

    it("should estimate tokens for empty string", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      const result = tokenizer.estimate("");

      expect(result.tokenCount).toBe(0);
      expect(result.charCount).toBe(0);
      expect(result.byteSize).toBe(0);
    });

    it("should estimate tokens for unicode characters", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      const result = tokenizer.estimate("Hello 世界");

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.charCount).toBe(8); // "Hello " + "世界" (2 chars)
      expect(result.byteSize).toBeGreaterThan(8); // UTF-8 encoding
    });

    it("should estimate tokens for long text", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      const longText = "word ".repeat(100);
      const result = tokenizer.estimate(longText);

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.charCount).toBe(longText.length);
      expect(result.byteSize).toBe(longText.length);
    });

    it("should estimate tokens for code-like text", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      const code = "function test() { return 42; }";
      const result = tokenizer.estimate(code);

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.charCount).toBe(code.length);
      expect(result.byteSize).toBe(code.length);
    });

    it("should estimate tokens consistently", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      const text = "Consistent text for testing";
      const result1 = tokenizer.estimate(text);
      const result2 = tokenizer.estimate(text);

      expect(result1.tokenCount).toBe(result2.tokenCount);
      expect(result1.charCount).toBe(result2.charCount);
      expect(result1.byteSize).toBe(result2.byteSize);
    });

    it("should handle newlines in text", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      const text = "line1\nline2\nline3";
      const result = tokenizer.estimate(text);

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.charCount).toBe(text.length);
      expect(result.byteSize).toBe(text.length);
    });

    it("should handle special characters", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      const text = "Special: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const result = tokenizer.estimate(text);

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.charCount).toBe(text.length);
      expect(result.byteSize).toBe(text.length);
    });

    it("should provide reasonable token estimates", () => {
      const tokenizer = createDefaultTokenizerAdapter();
      // Typical approximation is ~4 chars per token
      const text = "a".repeat(100);
      const result = tokenizer.estimate(text);

      // Should be approximately 25 tokens (100/4), but at least 1
      expect(result.tokenCount).toBeGreaterThanOrEqual(1);
      expect(result.tokenCount).toBeLessThanOrEqual(100);
    });
  });
});

import { DEBOUNCE_MS, LIMIT, MENTION_QUERY_REGEX } from "@/constants/mention-suggestions";
import { extractMentionQuery } from "@/ui/hooks/useMentionSuggestions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useMentionSuggestions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("extractMentionQuery", () => {
    it("extracts query after @ symbol", () => {
      expect(extractMentionQuery("Hello @src", 10)).toBe("src");
      expect(extractMentionQuery("@file", 5)).toBe("file");
    });

    it("extracts partial query before cursor", () => {
      expect(extractMentionQuery("@src/components/App", 5)).toBe("src/");
      expect(extractMentionQuery("Hello @test more text", 11)).toBe("test");
    });

    it("returns null when no @ mention", () => {
      expect(extractMentionQuery("Hello world", 11)).toBeNull();
      expect(extractMentionQuery("", 0)).toBeNull();
    });

    it("returns empty string for @ with no query", () => {
      expect(extractMentionQuery("Hello @", 7)).toBe("");
    });

    it("handles @ in middle of text", () => {
      expect(extractMentionQuery("prefix @query suffix", 13)).toBe("query");
    });

    it("handles paths with dots", () => {
      expect(extractMentionQuery("@src/file.ts", 12)).toBe("src/file.ts");
    });

    it("handles paths with hyphens", () => {
      expect(extractMentionQuery("@my-file", 8)).toBe("my-file");
    });

    it("handles nested paths", () => {
      expect(extractMentionQuery("@src/components/ui/Button.tsx", 29)).toBe(
        "src/components/ui/Button.tsx"
      );
    });

    it("returns null when cursor is before @", () => {
      expect(extractMentionQuery("Hello @world", 5)).toBeNull();
    });

    it("only matches last @ mention before cursor", () => {
      expect(extractMentionQuery("@first @second", 14)).toBe("second");
    });
  });

  describe("hook export", () => {
    it("exports useMentionSuggestions function", async () => {
      const { useMentionSuggestions } = await import("@/ui/hooks/useMentionSuggestions");
      expect(typeof useMentionSuggestions).toBe("function");
    });

    it("exports extractMentionQuery function", async () => {
      const { extractMentionQuery } = await import("@/ui/hooks/useMentionSuggestions");
      expect(typeof extractMentionQuery).toBe("function");
    });
  });

  describe("mention regex pattern", () => {
    it("matches @ followed by word characters", () => {
      expect("@test".match(MENTION_QUERY_REGEX)?.[1]).toBe("test");
    });

    it("matches @ followed by path with slashes", () => {
      expect("@src/file".match(MENTION_QUERY_REGEX)?.[1]).toBe("src/file");
    });

    it("matches @ followed by filename with dots", () => {
      expect("@file.ts".match(MENTION_QUERY_REGEX)?.[1]).toBe("file.ts");
    });

    it("matches @ followed by hyphenated name", () => {
      expect("@my-component".match(MENTION_QUERY_REGEX)?.[1]).toBe("my-component");
    });

    it("matches @ at end of string only", () => {
      expect("@first @second".match(MENTION_QUERY_REGEX)?.[1]).toBe("second");
    });

    it("matches empty string after @", () => {
      expect("@".match(MENTION_QUERY_REGEX)?.[1]).toBe("");
    });
  });

  describe("debounce behavior", () => {
    it("debounce delay is reasonable", () => {
      expect(DEBOUNCE_MS).toBeGreaterThan(50);
      expect(DEBOUNCE_MS).toBeLessThan(500);
    });
  });

  describe("suggestion limit", () => {
    it("default suggestion limit is reasonable", () => {
      expect(LIMIT).toBeGreaterThan(0);
      expect(LIMIT).toBeLessThanOrEqual(20);
    });
  });
});

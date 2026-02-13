import {
  DEBOUNCE_MS,
  LIMIT,
  MENTION_QUERY_REGEX,
  MENTION_SUGGESTION,
} from "@/constants/mention-suggestions";
import { describe, expect, it } from "vitest";

describe("mention-suggestions constants", () => {
  it("exports canonical suggestion defaults", () => {
    expect(MENTION_SUGGESTION.LIMIT).toBe(8);
    expect(MENTION_SUGGESTION.DEBOUNCE_MS).toBe(150);
  });

  it("re-exports convenience aliases", () => {
    expect(LIMIT).toBe(MENTION_SUGGESTION.LIMIT);
    expect(DEBOUNCE_MS).toBe(MENTION_SUGGESTION.DEBOUNCE_MS);
  });

  it("matches trailing mention path queries", () => {
    expect("@src/components/Button.tsx".match(MENTION_QUERY_REGEX)?.[1]).toBe(
      "src/components/Button.tsx"
    );
  });
});

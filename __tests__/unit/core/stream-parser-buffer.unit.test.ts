import { appendChunkToParserBuffer } from "@/core/providers/stream-parser-buffer";
import { describe, expect, it } from "vitest";

describe("stream parser buffer", () => {
  it("splits complete lines and keeps trailing remainder", () => {
    const result = appendChunkToParserBuffer("par", "tial\nline-two\ntail", 256);

    expect(result.lines).toEqual(["partial", "line-two"]);
    expect(result.remainder).toBe("tail");
    expect(result.overflowed).toBe(false);
  });

  it("drops oversized non-newline buffers to prevent unbounded growth", () => {
    const result = appendChunkToParserBuffer("", "x".repeat(64), 16);

    expect(result.lines).toEqual([]);
    expect(result.remainder).toBe("");
    expect(result.overflowed).toBe(true);
  });

  it("resynchronizes at the first newline after overflow", () => {
    const result = appendChunkToParserBuffer("", "1234567890\nok\nrem", 12);

    expect(result.lines).toEqual(["ok"]);
    expect(result.remainder).toBe("rem");
    expect(result.overflowed).toBe(true);
  });
});

import {
  CURSOR_ACCUMULATED_TEXT_MAX_BYTES,
  STREAM_SIZE_LIMIT,
  TOOL_RESULT_MAX_BYTES,
} from "@/constants/stream-size-limits";
import { describe, expect, it } from "vitest";

describe("STREAM_SIZE_LIMIT", () => {
  it("exports stable byte-limit constants", () => {
    expect(TOOL_RESULT_MAX_BYTES).toBe(50 * 1024);
    expect(CURSOR_ACCUMULATED_TEXT_MAX_BYTES).toBe(50 * 1024);
  });

  it("keeps limits in typed constant map", () => {
    expect(STREAM_SIZE_LIMIT).toEqual({
      TOOL_RESULT_MAX_BYTES: 50 * 1024,
      CURSOR_ACCUMULATED_TEXT_MAX_BYTES: 50 * 1024,
    });
  });
});

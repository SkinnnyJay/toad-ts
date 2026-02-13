import { INDENT_SPACES, JSON_FORMAT } from "@/constants/json-format";
import { describe, expect, it } from "vitest";

describe("json-format constants", () => {
  it("exports canonical json indentation settings", () => {
    expect(JSON_FORMAT).toEqual({
      INDENT_SPACES: 2,
    });
  });

  it("re-exports convenience aliases", () => {
    expect(INDENT_SPACES).toBe(2);
  });
});

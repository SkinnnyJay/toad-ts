import { normalizeHttpMethod } from "@/server/http-method-normalization";
import { describe, expect, it } from "vitest";

describe("normalizeHttpMethod", () => {
  it("uppercases lowercase methods", () => {
    expect(normalizeHttpMethod("get")).toBe("GET");
  });

  it("trims surrounding whitespace before uppercasing", () => {
    expect(normalizeHttpMethod("  post  ")).toBe("POST");
  });

  it("preserves canonical uppercase methods", () => {
    expect(normalizeHttpMethod("PATCH")).toBe("PATCH");
  });
});

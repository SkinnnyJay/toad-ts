import { normalizeRoutePathname } from "@/server/pathname-normalization";
import { describe, expect, it } from "vitest";

describe("normalizeRoutePathname", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeRoutePathname(" /api/config ")).toBe("/api/config");
  });

  it("strips query suffix from pathname", () => {
    expect(normalizeRoutePathname("/api/config?view=compact")).toBe("/api/config");
  });

  it("strips hash suffix from pathname", () => {
    expect(normalizeRoutePathname("/api/config#summary")).toBe("/api/config");
  });

  it("strips suffix from the earliest query/hash delimiter", () => {
    expect(normalizeRoutePathname("/api/config#summary?view=compact")).toBe("/api/config");
  });

  it("strips trailing slashes from non-root paths", () => {
    expect(normalizeRoutePathname("/api/config/")).toBe("/api/config");
    expect(normalizeRoutePathname("/api/config///")).toBe("/api/config");
  });

  it("normalizes non-root paths with combined trailing-slash and suffix forms", () => {
    expect(normalizeRoutePathname("/api/config/?view=compact")).toBe("/api/config");
    expect(normalizeRoutePathname("/api/config/#summary")).toBe("/api/config");
    expect(normalizeRoutePathname(" /api/config/?view=compact ")).toBe("/api/config");
  });

  it("preserves malformed inner separators while normalizing suffixes", () => {
    expect(normalizeRoutePathname("/api//config/?view=compact")).toBe("/api//config");
    expect(normalizeRoutePathname("/sessions//prompt/#summary")).toBe("/sessions//prompt");
  });

  it("retains root path while normalizing", () => {
    expect(normalizeRoutePathname("/")).toBe("/");
    expect(normalizeRoutePathname("/?check=true")).toBe("/");
    expect(normalizeRoutePathname("/#status")).toBe("/");
  });

  it("normalizes slash-only paths to root", () => {
    expect(normalizeRoutePathname("///")).toBe("/");
    expect(normalizeRoutePathname("////?check=true")).toBe("/");
    expect(normalizeRoutePathname("////#status")).toBe("/");
  });

  it("normalizes blank and suffix-only paths to root", () => {
    expect(normalizeRoutePathname("")).toBe("/");
    expect(normalizeRoutePathname("   ")).toBe("/");
    expect(normalizeRoutePathname("?scope=all")).toBe("/");
    expect(normalizeRoutePathname("#summary")).toBe("/");
    expect(normalizeRoutePathname(" ?scope=all ")).toBe("/");
    expect(normalizeRoutePathname(" #summary ")).toBe("/");
  });
});

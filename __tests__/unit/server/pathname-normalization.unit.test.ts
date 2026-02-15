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

  it("retains root path while normalizing", () => {
    expect(normalizeRoutePathname("/")).toBe("/");
    expect(normalizeRoutePathname("/?check=true")).toBe("/");
    expect(normalizeRoutePathname("/#status")).toBe("/");
  });
});

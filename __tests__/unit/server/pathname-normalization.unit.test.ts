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

  it("normalizes known-route double-trailing forms including whitespace-padding", () => {
    expect(normalizeRoutePathname("/api/config//")).toBe("/api/config");
    expect(normalizeRoutePathname("/api/config//?view=compact")).toBe("/api/config");
    expect(normalizeRoutePathname("/api/config//#summary")).toBe("/api/config");
    expect(normalizeRoutePathname(" /api/config// ")).toBe("/api/config");
    expect(normalizeRoutePathname(" /api/config//?view=compact ")).toBe("/api/config");
    expect(normalizeRoutePathname(" /api/config//#summary ")).toBe("/api/config");
    expect(normalizeRoutePathname("/health//")).toBe("/health");
    expect(normalizeRoutePathname("/health//?probe=1")).toBe("/health");
    expect(normalizeRoutePathname("/health//#summary")).toBe("/health");
    expect(normalizeRoutePathname(" /health// ")).toBe("/health");
    expect(normalizeRoutePathname(" /health//?probe=1 ")).toBe("/health");
    expect(normalizeRoutePathname(" /health//#summary ")).toBe("/health");
  });

  it("preserves malformed inner separators while normalizing suffixes", () => {
    expect(normalizeRoutePathname("/api//config/?view=compact")).toBe("/api//config");
    expect(normalizeRoutePathname("/sessions//prompt/#summary")).toBe("/sessions//prompt");
  });

  it("preserves whitespace-padded malformed api separators while normalizing suffixes", () => {
    expect(normalizeRoutePathname(" /api//config/?scope=all ")).toBe("/api//config");
    expect(normalizeRoutePathname(" /api//config//#summary ")).toBe("/api//config");
    expect(normalizeRoutePathname(" /api/sessions//messages/?scope=all ")).toBe(
      "/api/sessions//messages"
    );
    expect(normalizeRoutePathname(" /api/sessions//messages//#summary ")).toBe(
      "/api/sessions//messages"
    );
  });

  it("normalizes unknown api route trailing and double-trailing forms", () => {
    expect(normalizeRoutePathname("/api/unknown/")).toBe("/api/unknown");
    expect(normalizeRoutePathname("/api/unknown/?scope=all")).toBe("/api/unknown");
    expect(normalizeRoutePathname("/api/unknown/#summary")).toBe("/api/unknown");
    expect(normalizeRoutePathname("/api/unknown//")).toBe("/api/unknown");
    expect(normalizeRoutePathname("/api/unknown//?scope=all")).toBe("/api/unknown");
    expect(normalizeRoutePathname("/api/unknown//#summary")).toBe("/api/unknown");
  });

  it("normalizes whitespace-padded api root malformed forms", () => {
    expect(normalizeRoutePathname(" /api ")).toBe("/api");
    expect(normalizeRoutePathname(" /api?scope=all ")).toBe("/api");
    expect(normalizeRoutePathname(" /api#summary ")).toBe("/api");
    expect(normalizeRoutePathname(" /api/ ")).toBe("/api");
    expect(normalizeRoutePathname(" /api/?scope=all ")).toBe("/api");
    expect(normalizeRoutePathname(" /api/#summary ")).toBe("/api");
    expect(normalizeRoutePathname(" /api// ")).toBe("/api");
    expect(normalizeRoutePathname(" /api//?scope=all ")).toBe("/api");
    expect(normalizeRoutePathname(" /api//#summary ")).toBe("/api");
  });

  it("normalizes unknown core and missing-action session trailing forms", () => {
    expect(normalizeRoutePathname("/unknown-endpoint//?scope=all")).toBe("/unknown-endpoint");
    expect(normalizeRoutePathname("/unknown-endpoint//#summary")).toBe("/unknown-endpoint");
    expect(normalizeRoutePathname("/sessions/session-1//?view=full")).toBe("/sessions/session-1");
    expect(normalizeRoutePathname("/sessions/session-1//#latest")).toBe("/sessions/session-1");
    expect(normalizeRoutePathname("/sessions//prompt//?tail=1")).toBe("/sessions//prompt");
    expect(normalizeRoutePathname("/sessions//prompt//#latest")).toBe("/sessions//prompt");
  });

  it("normalizes blank-session base double-trailing forms to /sessions", () => {
    expect(normalizeRoutePathname("/sessions//")).toBe("/sessions");
    expect(normalizeRoutePathname("/sessions//?scope=all")).toBe("/sessions");
    expect(normalizeRoutePathname("/sessions//#summary")).toBe("/sessions");
    expect(normalizeRoutePathname(" /sessions// ")).toBe("/sessions");
    expect(normalizeRoutePathname(" /sessions//?scope=all ")).toBe("/sessions");
    expect(normalizeRoutePathname(" /sessions//#summary ")).toBe("/sessions");
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

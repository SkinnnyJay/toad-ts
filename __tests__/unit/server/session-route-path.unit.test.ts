import { parseSessionRoutePath } from "@/server/session-route-path";
import { describe, expect, it } from "vitest";

describe("parseSessionRoutePath", () => {
  it("parses session id and action from session subroute", () => {
    expect(parseSessionRoutePath("/sessions/session-1/prompt")).toEqual({
      sessionId: "session-1",
      action: "prompt",
    });
  });

  it("returns session id with undefined action for single-segment session path", () => {
    expect(parseSessionRoutePath("/sessions/session-1")).toEqual({
      sessionId: "session-1",
      action: undefined,
    });
  });

  it("returns null for non-session paths", () => {
    expect(parseSessionRoutePath("/health")).toBeNull();
    expect(parseSessionRoutePath("/api/sessions")).toBeNull();
  });

  it("returns null for session paths with extra segments", () => {
    expect(parseSessionRoutePath("/sessions/session-1/prompt/extra")).toBeNull();
    expect(parseSessionRoutePath("/sessions/session-1/messages/extra")).toBeNull();
  });

  it("returns null for missing or blank session id segment", () => {
    expect(parseSessionRoutePath("/sessions//prompt")).toBeNull();
    expect(parseSessionRoutePath("/sessions/   /prompt")).toBeNull();
  });

  it("normalizes trailing separators on session-id routes", () => {
    expect(parseSessionRoutePath("/sessions/session-1/")).toEqual({
      sessionId: "session-1",
      action: undefined,
    });
    expect(parseSessionRoutePath("/sessions/session-1/   ")).toEqual({
      sessionId: "session-1",
      action: undefined,
    });
  });

  it("returns null for routes with explicit blank action segment in-path", () => {
    expect(parseSessionRoutePath("/sessions/session-1//prompt")).toBeNull();
  });

  it("parses session route paths with surrounding whitespace", () => {
    expect(parseSessionRoutePath("   /sessions/session-1/prompt   ")).toEqual({
      sessionId: "session-1",
      action: "prompt",
    });
  });

  it("parses session route paths with query or hash suffixes", () => {
    expect(parseSessionRoutePath("/sessions/session-1/prompt?view=full")).toEqual({
      sessionId: "session-1",
      action: "prompt",
    });
    expect(parseSessionRoutePath("/sessions/session-1/messages#tail")).toEqual({
      sessionId: "session-1",
      action: "messages",
    });
  });

  it("parses trailing-slash prompt and messages routes", () => {
    expect(parseSessionRoutePath("/sessions/session-1/prompt/")).toEqual({
      sessionId: "session-1",
      action: "prompt",
    });
    expect(parseSessionRoutePath("/sessions/session-1/messages/")).toEqual({
      sessionId: "session-1",
      action: "messages",
    });
  });
});

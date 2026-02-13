import {
  parseClaudeMcpListOutput,
  parseClaudeVersionOutput,
  parseCliVersionOutput,
  parseCodexLoginStatusOutput,
  parseCodexVersionOutput,
  parseGeminiListSessionsOutput,
  parseGeminiVersionOutput,
  parseMcpListOutput,
} from "@/core/cli-agent/agent-command-parsers";
import { describe, expect, it } from "vitest";

describe("agent-command-parsers", () => {
  it("parses version output first non-empty line", () => {
    const parsed = parseCliVersionOutput("\n  codex-cli 1.2.3  \nextra");
    expect(parsed).toBe("codex-cli 1.2.3");
    expect(parseCliVersionOutput("\n\n  ")).toBeUndefined();
  });

  it("parses claude and gemini version wrappers", () => {
    expect(parseClaudeVersionOutput("claude 3.0.0")).toBe("claude 3.0.0");
    expect(parseGeminiVersionOutput("\n gemini 2.2.0")).toBe("gemini 2.2.0");
    expect(parseCodexVersionOutput("codex 0.1.0")).toBe("codex 0.1.0");
  });

  it("parses generic mcp list output lines", () => {
    const parsed = parseMcpListOutput(
      "filesystem: connected\nmemory: disabled (missing token)\ninvalid line"
    );

    expect(parsed).toEqual([
      { name: "filesystem", status: "connected" },
      { name: "memory", status: "disabled", reason: "missing token" },
    ]);
    expect(parseClaudeMcpListOutput("filesystem: connected")).toEqual([
      { name: "filesystem", status: "connected" },
    ]);
  });

  it("parses codex authenticated status with email", () => {
    const parsed = parseCodexLoginStatusOutput("Authenticated as dev@example.com", "");

    expect(parsed.authenticated).toBe(true);
    expect(parsed.email).toBe("dev@example.com");
  });

  it("parses codex unauthenticated status", () => {
    const parsed = parseCodexLoginStatusOutput("", "Not logged in. Please login required.");

    expect(parsed.authenticated).toBe(false);
    expect(parsed.message).toBe("Not authenticated");
  });

  it("parses gemini list-sessions text output", () => {
    const parsed = parseGeminiListSessionsOutput(
      "Sessions\n1. sess-1 updated today\n2. sess-2 updated yesterday"
    );

    expect(parsed.sessionIds).toEqual(["sess-1", "sess-2"]);
    expect(parsed.count).toBe(2);
  });

  it("parses gemini list-sessions json output", () => {
    const parsed = parseGeminiListSessionsOutput(
      JSON.stringify([{ id: "sess-a" }, { sessionId: "sess-b" }])
    );

    expect(parsed.sessionIds).toEqual(["sess-a", "sess-b"]);
    expect(parsed.count).toBe(2);
  });

  it("parses gemini list-sessions object payload and dedupes ids", () => {
    const parsed = parseGeminiListSessionsOutput(
      JSON.stringify({
        sessions: [{ id: "sess-a" }, { sessionId: "sess-b" }, { id: "sess-a" }],
      })
    );

    expect(parsed.sessionIds).toEqual(["sess-a", "sess-b"]);
    expect(parsed.count).toBe(2);
  });

  it("falls back to text parsing when gemini JSON is invalid", () => {
    const parsed = parseGeminiListSessionsOutput(
      "Sessions\n1. session\n2. name\n- sess-1\n- sess-2\n- sess-1\nid: ignored"
    );

    expect(parsed.sessionIds).toEqual(["sess-1", "sess-2"]);
    expect(parsed.count).toBe(2);
  });

  it("handles gemini JSON edge cases by returning empty sessions", () => {
    const fromNumberJson = parseGeminiListSessionsOutput("123");
    const fromObjectWithoutArray = parseGeminiListSessionsOutput(
      JSON.stringify({
        sessions: "not-an-array",
      })
    );
    const fromArrayWithUnsupportedEntries = parseGeminiListSessionsOutput(
      JSON.stringify({
        sessions: [null, 123, { unknown: "field" }],
      })
    );
    const fromTextWithOnlyHeaders = parseGeminiListSessionsOutput("Sessions\n:\n- \nname\nid:");

    expect(fromNumberJson).toEqual({ sessionIds: ["123"], count: 1 });
    expect(fromObjectWithoutArray).toEqual({
      sessionIds: ['{"sessions":"not-an-array"}'],
      count: 1,
    });
    expect(fromArrayWithUnsupportedEntries).toEqual({
      sessionIds: ['{"sessions":[null,123,{"unknown":"field"}]}'],
      count: 1,
    });
    expect(fromTextWithOnlyHeaders).toEqual({ sessionIds: [], count: 0 });
  });

  it("parses codex unknown auth status with fallback first line", () => {
    const parsed = parseCodexLoginStatusOutput("Codex auth state unavailable", "");

    expect(parsed.authenticated).toBe(false);
    expect(parsed.message).toBe("Codex auth state unavailable");
  });

  it("parses codex unknown auth status with hard fallback message", () => {
    const parsed = parseCodexLoginStatusOutput("", "");

    expect(parsed.authenticated).toBe(false);
    expect(parsed.message).toBe("Unknown auth status");
  });
});

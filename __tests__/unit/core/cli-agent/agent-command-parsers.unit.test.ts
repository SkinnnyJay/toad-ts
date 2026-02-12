import {
  parseClaudeMcpListOutput,
  parseClaudeVersionOutput,
  parseCliVersionOutput,
  parseCodexLoginStatusOutput,
  parseGeminiListSessionsOutput,
  parseGeminiVersionOutput,
  parseMcpListOutput,
} from "@/core/cli-agent/agent-command-parsers";
import { describe, expect, it } from "vitest";

describe("agent-command-parsers", () => {
  it("parses version output first non-empty line", () => {
    const parsed = parseCliVersionOutput("\n  codex-cli 1.2.3  \nextra");
    expect(parsed).toBe("codex-cli 1.2.3");
  });

  it("parses claude and gemini version wrappers", () => {
    expect(parseClaudeVersionOutput("claude 3.0.0")).toBe("claude 3.0.0");
    expect(parseGeminiVersionOutput("\n gemini 2.2.0")).toBe("gemini 2.2.0");
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
});

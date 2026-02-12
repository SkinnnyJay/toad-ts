import {
  parseCliVersionOutput,
  parseCodexLoginStatusOutput,
  parseMcpListOutput,
} from "@/core/cli-agent/agent-command-parsers";
import { describe, expect, it } from "vitest";

describe("agent-command-parsers", () => {
  it("parses version output first non-empty line", () => {
    const parsed = parseCliVersionOutput("\n  codex-cli 1.2.3  \nextra");
    expect(parsed).toBe("codex-cli 1.2.3");
  });

  it("parses generic mcp list output lines", () => {
    const parsed = parseMcpListOutput(
      "filesystem: connected\nmemory: disabled (missing token)\ninvalid line"
    );

    expect(parsed).toEqual([
      { name: "filesystem", status: "connected" },
      { name: "memory", status: "disabled", reason: "missing token" },
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
});

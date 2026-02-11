import { parseAuthStatusCommandResult } from "@/core/agent-management/auth-status-command-result";
import { describe, expect, it } from "vitest";

describe("auth-status-command-result", () => {
  it("parses authenticated status from stdout output", () => {
    const parsed = parseAuthStatusCommandResult({
      stdout: "✓ Logged in as user@example.com",
      stderr: "",
      exitCode: 0,
    });

    expect(parsed).toEqual({
      authenticated: true,
      method: "browser_login",
      email: "user@example.com",
    });
  });

  it("falls back to stderr when stdout is empty", () => {
    const parsed = parseAuthStatusCommandResult({
      stdout: "",
      stderr: "✓ Logged in as stderr-user@example.com",
      exitCode: 0,
    });

    expect(parsed).toEqual({
      authenticated: true,
      method: "browser_login",
      email: "stderr-user@example.com",
    });
  });

  it("throws stderr message when status command fails", () => {
    expect(() =>
      parseAuthStatusCommandResult({
        stdout: "",
        stderr: "requires tty",
        exitCode: 1,
      })
    ).toThrow("requires tty");
  });
});

import { parseSessionListCommandResult } from "@/core/agent-management/session-list-command-result";
import { describe, expect, it } from "vitest";

describe("session-list-command-result", () => {
  it("parses successful list command output into session summaries", () => {
    const parsed = parseSessionListCommandResult({
      stdout: "session-resume-id Native title model: gpt-5 messages: 14",
      stderr: "",
      exitCode: 0,
    });

    expect(parsed).toEqual([
      {
        id: "session-resume-id",
        title: "Native title",
        model: "gpt-5",
        messageCount: 14,
      },
    ]);
  });

  it("throws command stderr when list command fails", () => {
    expect(() =>
      parseSessionListCommandResult({
        stdout: "",
        stderr: "requires tty",
        exitCode: 1,
      })
    ).toThrow("requires tty");
  });
});

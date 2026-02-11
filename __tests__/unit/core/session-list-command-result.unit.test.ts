import {
  parseAgentManagementSessionsFromCommandResult,
  parseNormalizedAgentManagementSessionsFromCommandResult,
  parseSessionListCommandResult,
} from "@/core/agent-management/session-list-command-result";
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

  it("maps successful command output to agent-management sessions", () => {
    const mapped = parseAgentManagementSessionsFromCommandResult({
      stdout: "session-resume-id Native title model: gpt-5 messages: 14",
      stderr: "",
      exitCode: 0,
    });

    expect(mapped).toEqual([
      {
        id: "session-resume-id",
        title: "Native title",
        model: "gpt-5",
        messageCount: 14,
      },
    ]);
  });

  it("returns normalized deduplicated sessions from command output", () => {
    const normalized = parseNormalizedAgentManagementSessionsFromCommandResult({
      stdout: [
        "session-old Older title createdAt=2026-02-10T18:30:00Z",
        "session-new Newer title createdAt=2026-02-11T18:30:00Z",
        "session-new Newer title model: gpt-5 messages: 12",
      ].join("\n"),
      stderr: "",
      exitCode: 0,
    });

    expect(normalized).toEqual([
      {
        id: "session-new",
        title: "Newer title",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 12,
      },
      {
        id: "session-old",
        title: "Older title",
        createdAt: "2026-02-10T18:30:00.000Z",
      },
    ]);
  });

  it("prefers stdout parsing and ignores stderr noise when stdout is present", () => {
    const parsed = parseSessionListCommandResult({
      stdout: "No sessions found.",
      stderr: "warning: reused session id session-noise-id",
      exitCode: 0,
    });

    expect(parsed).toEqual([]);
  });

  it("falls back to combined output when stdout has warning noise", () => {
    const parsed = parseSessionListCommandResult({
      stdout: "warning: sessions output redirected to stderr",
      stderr: "session-resume-id Native title model: gpt-5 messages: 14",
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
});

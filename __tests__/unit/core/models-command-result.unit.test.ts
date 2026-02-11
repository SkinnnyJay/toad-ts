import { parseModelsCommandResult } from "@/core/agent-management/models-command-result";
import { describe, expect, it } from "vitest";

describe("models-command-result", () => {
  it("parses successful models command output", () => {
    const parsed = parseModelsCommandResult({
      stdout: "auto - Auto\nopus-4.6-thinking - Claude 4.6 Opus (Thinking) (default)",
      stderr: "",
      exitCode: 0,
    });

    expect(parsed.defaultModel).toBe("opus-4.6-thinking");
    expect(parsed.models).toEqual([
      { id: "auto", name: "Auto", isDefault: false, supportsThinking: false },
      {
        id: "opus-4.6-thinking",
        name: "Claude 4.6 Opus (Thinking)",
        isDefault: true,
        supportsThinking: true,
      },
    ]);
  });

  it("throws command stderr when models command fails", () => {
    expect(() =>
      parseModelsCommandResult({
        stdout: "",
        stderr: "requires tty",
        exitCode: 1,
      })
    ).toThrow("requires tty");
  });

  it("throws fallback message when models command fails without output", () => {
    expect(() =>
      parseModelsCommandResult({
        stdout: "",
        stderr: "",
        exitCode: 1,
      })
    ).toThrow("CLI models command failed.");
  });

  it("falls back to stderr when stdout is empty", () => {
    const parsed = parseModelsCommandResult({
      stdout: "",
      stderr: "auto - Auto\nopus-4.6-thinking - Claude 4.6 Opus (Thinking) (default)",
      exitCode: 0,
    });

    expect(parsed.defaultModel).toBe("opus-4.6-thinking");
    expect(parsed.models).toEqual([
      { id: "auto", name: "Auto", isDefault: false, supportsThinking: false },
      {
        id: "opus-4.6-thinking",
        name: "Claude 4.6 Opus (Thinking)",
        isDefault: true,
        supportsThinking: true,
      },
    ]);
  });

  it("falls back to combined output when stdout has warning noise", () => {
    const parsed = parseModelsCommandResult({
      stdout: "warning: models command switched output stream",
      stderr: "auto - Auto\nopus-4.6-thinking - Claude 4.6 Opus (Thinking) (default)",
      exitCode: 0,
    });

    expect(parsed.defaultModel).toBe("opus-4.6-thinking");
    expect(parsed.models).toEqual([
      { id: "auto", name: "Auto", isDefault: false, supportsThinking: false },
      {
        id: "opus-4.6-thinking",
        name: "Claude 4.6 Opus (Thinking)",
        isDefault: true,
        supportsThinking: true,
      },
    ]);
  });
});

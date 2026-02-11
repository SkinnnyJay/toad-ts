import {
  assertCommandSucceeded,
  toCombinedCommandOutput,
  toCommandFailureMessage,
} from "@/core/agent-management/command-result-utils";
import { describe, expect, it } from "vitest";

describe("command-result-utils", () => {
  it("combines stdout and stderr using newline separator", () => {
    const combined = toCombinedCommandOutput({
      stdout: "first line",
      stderr: "second line",
      exitCode: 0,
    });

    expect(combined).toBe("first line\nsecond line");
  });

  it("prefers command output content for failure messages", () => {
    const message = toCommandFailureMessage(
      {
        stdout: "stdout message",
        stderr: "stderr message",
        exitCode: 1,
      },
      "fallback failure"
    );

    expect(message).toContain("stdout message");
    expect(message).toContain("stderr message");
  });

  it("falls back to provided message when command output is empty", () => {
    const message = toCommandFailureMessage(
      {
        stdout: "",
        stderr: "",
        exitCode: 1,
      },
      "fallback failure"
    );

    expect(message).toBe("fallback failure");
  });

  it("throws with computed message when command fails", () => {
    expect(() =>
      assertCommandSucceeded(
        {
          stdout: "",
          stderr: "requires tty",
          exitCode: 1,
        },
        "fallback failure"
      )
    ).toThrow("requires tty");
  });

  it("does not throw when command exits successfully", () => {
    expect(() =>
      assertCommandSucceeded(
        {
          stdout: "",
          stderr: "",
          exitCode: 0,
        },
        "fallback failure"
      )
    ).not.toThrow();
  });
});

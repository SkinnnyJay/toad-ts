import {
  appendAgentManagementCommandRuntimeError,
  buildAgentManagementCommandFailureMessage,
  buildAgentManagementCommandResultMessage,
} from "@/ui/components/chat/slash-command-agent-management-formatters";
import { describe, expect, it, vi } from "vitest";

describe("slash-command-agent-management-formatters", () => {
  it("formats result previews and exit fallback", () => {
    expect(
      buildAgentManagementCommandResultMessage("Agent command result:", {
        stdout: "ok",
        stderr: "",
        exitCode: 0,
      })
    ).toBe("Agent command result:\nok");

    expect(
      buildAgentManagementCommandResultMessage("Agent command result:", {
        stdout: "",
        stderr: "",
        exitCode: 0,
      })
    ).toBe("Agent command result:\n(exit 0)");
  });

  it("limits result preview lines and drops blank output lines", () => {
    const stdout = Array.from({ length: 12 }, (_, index) => `line-${index + 1}`).join("\n");
    const message = buildAgentManagementCommandResultMessage("Agent command result:", {
      stdout: `\n${stdout}\n`,
      stderr: "",
      exitCode: 0,
    });

    expect(message).toContain("line-1");
    expect(message).toContain("line-8");
    expect(message).not.toContain("line-9");
    expect(message).not.toContain("\n\n");
  });

  it("formats failure message with output or exit fallback", () => {
    expect(
      buildAgentManagementCommandFailureMessage({
        stdout: "",
        stderr: "permission denied",
        exitCode: 1,
      })
    ).toContain("Native agent command failed. permission denied");

    expect(
      buildAgentManagementCommandFailureMessage({
        stdout: "",
        stderr: "",
        exitCode: 2,
      })
    ).toBe("Native agent command failed. (exit 2)");
  });

  it("formats runtime error message through callback", () => {
    const appendSystemMessage = vi.fn();
    appendAgentManagementCommandRuntimeError(appendSystemMessage, new Error("boom"));
    expect(appendSystemMessage).toHaveBeenCalledWith("Native agent command failed. boom");
  });

  it("formats runtime non-error values through callback", () => {
    const appendSystemMessage = vi.fn();
    appendAgentManagementCommandRuntimeError(appendSystemMessage, "runtime failure");
    expect(appendSystemMessage).toHaveBeenCalledWith(
      "Native agent command failed. runtime failure"
    );
  });
});

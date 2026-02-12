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
});

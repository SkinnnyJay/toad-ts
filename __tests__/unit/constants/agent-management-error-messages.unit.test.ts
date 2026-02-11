import {
  AGENT_MANAGEMENT_ERROR_MESSAGE,
  AUTH_STATUS_COMMAND_FAILED,
  MODELS_COMMAND_FAILED,
  SESSION_LIST_COMMAND_FAILED,
} from "@/constants/agent-management-error-messages";
import { describe, expect, it } from "vitest";

describe("AGENT_MANAGEMENT_ERROR_MESSAGE", () => {
  it("exports stable command failure messages", () => {
    expect(AUTH_STATUS_COMMAND_FAILED).toBe("CLI auth status command failed.");
    expect(MODELS_COMMAND_FAILED).toBe("CLI models command failed.");
    expect(SESSION_LIST_COMMAND_FAILED).toBe("CLI session listing command failed.");
  });

  it("keeps command failure messages in a typed constant map", () => {
    expect(Object.values(AGENT_MANAGEMENT_ERROR_MESSAGE)).toEqual([
      "CLI auth status command failed.",
      "CLI models command failed.",
      "CLI session listing command failed.",
    ]);
  });
});

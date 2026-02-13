import { CONNECTION_STATUS } from "@/constants/connection-status";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { shouldPollCursorCloudAgentCount } from "@/ui/components/cloud-status.utils";
import { describe, expect, it } from "vitest";

describe("cloud-status utils", () => {
  it("returns true only for connected cursor harness", () => {
    expect(
      shouldPollCursorCloudAgentCount(HARNESS_DEFAULT.CURSOR_CLI_ID, CONNECTION_STATUS.CONNECTED)
    ).toBe(true);
  });

  it("returns false for non-cursor harnesses", () => {
    expect(
      shouldPollCursorCloudAgentCount(HARNESS_DEFAULT.CLAUDE_CLI_ID, CONNECTION_STATUS.CONNECTED)
    ).toBe(false);
  });

  it("returns false when cursor harness is not connected", () => {
    expect(
      shouldPollCursorCloudAgentCount(HARNESS_DEFAULT.CURSOR_CLI_ID, CONNECTION_STATUS.CONNECTING)
    ).toBe(false);
    expect(
      shouldPollCursorCloudAgentCount(HARNESS_DEFAULT.CURSOR_CLI_ID, CONNECTION_STATUS.DISCONNECTED)
    ).toBe(false);
  });
});

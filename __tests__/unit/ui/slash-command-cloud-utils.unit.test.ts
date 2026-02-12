import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { resolveCloudCommandErrorMessage } from "@/ui/components/chat/slash-command-cloud-utils";
import { describe, expect, it } from "vitest";

describe("slash-command-cloud-utils", () => {
  it("maps CURSOR_API_KEY errors to auth guidance", () => {
    const result = resolveCloudCommandErrorMessage(
      new Error("Cursor cloud API requires CURSOR_API_KEY."),
      "Cloud dispatch failed"
    );

    expect(result).toBe(SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED);
  });

  it("maps unauthorized errors to auth guidance", () => {
    const result = resolveCloudCommandErrorMessage(
      new Error("Request failed with status 401"),
      "Cloud status unavailable"
    );

    expect(result).toBe(SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED);
  });

  it("returns prefixed fallback for non-auth errors", () => {
    const result = resolveCloudCommandErrorMessage(
      new Error("network timeout"),
      "Cloud agents unavailable"
    );

    expect(result).toBe("Cloud agents unavailable: network timeout");
  });
});

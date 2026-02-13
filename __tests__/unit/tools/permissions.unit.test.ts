import { PERMISSION_OPTION_KIND } from "@/constants/permission-option-kinds";
import { PERMISSION } from "@/constants/permissions";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { setRulesState } from "@/rules/rules-service";
import { createPermissionHandler } from "@/tools/permissions";
import type { RequestPermissionRequest } from "@agentclientprotocol/sdk";
import { describe, expect, it } from "vitest";

describe("createPermissionHandler", () => {
  it("prefers global permission rules over overrides", async () => {
    setRulesState({
      rules: [],
      permissions: { [TOOL_KIND.EXECUTE]: PERMISSION.DENY },
    });

    const handler = createPermissionHandler({
      [TOOL_KIND.EXECUTE]: PERMISSION.ALLOW,
    });

    const request: RequestPermissionRequest = {
      sessionId: "session-1",
      toolCall: {
        toolCallId: "tool-1",
        kind: TOOL_KIND.EXECUTE,
      },
      options: [
        { optionId: "allow", kind: PERMISSION_OPTION_KIND.ALLOW_ONCE },
        { optionId: "deny", kind: PERMISSION_OPTION_KIND.REJECT_ONCE },
      ],
    };

    const response = await handler(request);

    expect(response.outcome.outcome).toBe("selected");
    if ("optionId" in response.outcome) {
      expect(response.outcome.optionId).toBe("deny");
    }

    setRulesState({ rules: [], permissions: {} });
  });
});

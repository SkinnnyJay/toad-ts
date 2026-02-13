import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { ToolCallIdSchema } from "@/types/domain";
import { TruncationProvider } from "@/ui/components/TruncationProvider";
import { ToolCallResult } from "@/ui/components/tool-calls/ToolCallResult";
import React from "react";
import { describe, expect, it } from "vitest";
import { renderInk } from "../../utils/ink-test-helpers";

describe("ToolCallResult", () => {
  it("renders inline diff for file edit tool output", () => {
    const tool = {
      id: ToolCallIdSchema.parse("tool-1"),
      name: "edit_file",
      arguments: {
        path: "src/example.ts",
        old_string: "const a = 1;",
        new_string: "const a = 2;",
      },
      status: TOOL_CALL_STATUS.SUCCEEDED,
      result: "Updated file",
    };

    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        null,
        React.createElement(ToolCallResult, {
          tool,
        })
      )
    );

    const frame = lastFrame();
    expect(frame).toContain("src/example.ts");
    expect(frame).toContain("-const a = 1;");
    expect(frame).toContain("+const a = 2;");
  });
});

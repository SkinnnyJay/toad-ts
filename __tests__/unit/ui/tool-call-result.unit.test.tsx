import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { ToolCallIdSchema } from "@/types/domain";
import { TruncationProvider } from "@/ui/components/TruncationProvider";
import { ToolCallResult } from "@/ui/components/tool-calls/ToolCallResult";
import React from "react";
import { describe, expect, it } from "vitest";
import { renderInk } from "../../utils/ink-test-helpers";

describe("ToolCallResult", () => {
  it("renders diff output from hook-style file edit result payload", () => {
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(ToolCallResult, {
          tool: {
            id: ToolCallIdSchema.parse("tool-file-edit"),
            name: "File edit: src/example.ts",
            arguments: {},
            status: TOOL_CALL_STATUS.SUCCEEDED,
            result: {
              path: "src/example.ts",
              edits: [
                {
                  path: "src/example.ts",
                  old_string: "const value = 1;",
                  new_string: "const value = 2;",
                },
              ],
            },
          },
        })
      )
    );

    const frame = lastFrame();
    expect(frame).toContain("src/example.ts");
    expect(frame).toContain("const value");
  });
});

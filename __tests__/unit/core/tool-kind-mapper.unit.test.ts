import { TOOL_KIND } from "@/constants/tool-kinds";
import { inferToolKindFromName } from "@/core/cli-agent/tool-kind-mapper";
import { describe, expect, it } from "vitest";

describe("inferToolKindFromName", () => {
  it("maps common tool name families", () => {
    expect(inferToolKindFromName("ReadFile")).toBe(TOOL_KIND.READ);
    expect(inferToolKindFromName("glob")).toBe(TOOL_KIND.SEARCH);
    expect(inferToolKindFromName("apply_patch")).toBe(TOOL_KIND.EDIT);
    expect(inferToolKindFromName("delete_file")).toBe(TOOL_KIND.DELETE);
    expect(inferToolKindFromName("rename_file")).toBe(TOOL_KIND.MOVE);
    expect(inferToolKindFromName("shell")).toBe(TOOL_KIND.EXECUTE);
    expect(inferToolKindFromName("fetch_url")).toBe(TOOL_KIND.FETCH);
    expect(inferToolKindFromName("thinking")).toBe(TOOL_KIND.THINK);
  });

  it("falls back to other for unrecognized tool names", () => {
    expect(inferToolKindFromName("unknown_tool")).toBe(TOOL_KIND.OTHER);
  });
});

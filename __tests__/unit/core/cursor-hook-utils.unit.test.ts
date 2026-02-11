import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { TOOL_KIND } from "@/constants/tool-kinds";
import {
  asNonEmptyString,
  inferCursorToolKind,
  mapCursorPermissionRequestMetadata,
  normalizeCursorFileEdits,
} from "@/core/cursor/cursor-hook-utils";
import { describe, expect, it } from "vitest";

describe("cursor-hook-utils", () => {
  it("maps shell permission events to execute metadata", () => {
    const metadata = mapCursorPermissionRequestMetadata({
      conversation_id: "session-1",
      hook_event_name: CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
      command: "npm run test",
      workspace_roots: ["/workspace"],
    });

    expect(metadata.toolCallKey).toBe("shell:npm run test");
    expect(metadata.kind).toBe(TOOL_KIND.EXECUTE);
    expect(metadata.title).toContain("Shell");
  });

  it("normalizes file edits with fallback path", () => {
    const edits = normalizeCursorFileEdits(
      [{ old_string: "a", new_string: "b" }, "invalid"],
      "src/example.ts"
    );

    expect(edits).toEqual([
      { path: "src/example.ts", old_string: "a", new_string: "b" },
      { path: "src/example.ts" },
    ]);
  });

  it("infers tool kind and trims strings safely", () => {
    expect(inferCursorToolKind("read_file")).toBe(TOOL_KIND.READ);
    expect(inferCursorToolKind("glob")).toBe(TOOL_KIND.SEARCH);
    expect(inferCursorToolKind("unknown_tool")).toBe(TOOL_KIND.OTHER);
    expect(asNonEmptyString("  value ")).toBe("value");
    expect(asNonEmptyString("   ")).toBeNull();
  });
});

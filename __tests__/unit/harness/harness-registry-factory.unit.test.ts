import {
  createHarnessAdapterList,
  createHarnessRegistry,
  isCursorHarnessEnabled,
} from "@/harness/harnessRegistryFactory";
import { describe, expect, it } from "vitest";

describe("harnessRegistryFactory", () => {
  it("includes cursor adapter only when enabled", () => {
    const enabled = createHarnessAdapterList({ enableCursor: true });
    const disabled = createHarnessAdapterList({ enableCursor: false });

    expect(enabled.some((adapter) => adapter.id === "cursor-cli")).toBe(true);
    expect(disabled.some((adapter) => adapter.id === "cursor-cli")).toBe(false);
  });

  it("creates registry with expected adapters", () => {
    const registry = createHarnessRegistry({ enableCursor: true });
    expect(registry.get("cursor-cli")).toBeDefined();
    expect(registry.get("claude-cli")).toBeDefined();
    expect(registry.get("gemini-cli")).toBeDefined();
    expect(registry.get("codex-cli")).toBeDefined();
  });

  it("parses cursor env flags with fallback default", () => {
    expect(isCursorHarnessEnabled({}, false)).toBe(false);
    expect(isCursorHarnessEnabled({}, true)).toBe(true);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "true" })).toBe(true);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "1" })).toBe(true);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "false" }, true)).toBe(false);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "0" }, true)).toBe(false);
  });
});

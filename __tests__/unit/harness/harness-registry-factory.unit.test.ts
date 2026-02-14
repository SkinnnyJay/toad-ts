import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
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

    expect(enabled.some((adapter) => adapter.id === HARNESS_DEFAULT.CURSOR_CLI_ID)).toBe(true);
    expect(disabled.some((adapter) => adapter.id === HARNESS_DEFAULT.CURSOR_CLI_ID)).toBe(false);
  });

  it("can omit mock adapter when includeMock is false", () => {
    const adapters = createHarnessAdapterList({ enableCursor: true, includeMock: false });

    expect(adapters.some((adapter) => adapter.id === HARNESS_DEFAULT.MOCK_ID)).toBe(false);
    expect(adapters.some((adapter) => adapter.id === HARNESS_DEFAULT.CLAUDE_CLI_ID)).toBe(true);
  });

  it("creates registry with expected adapters", () => {
    const registry = createHarnessRegistry({ enableCursor: true });
    expect(registry.get(HARNESS_DEFAULT.CURSOR_CLI_ID)).toBeDefined();
    expect(registry.get(HARNESS_DEFAULT.CLAUDE_CLI_ID)).toBeDefined();
    expect(registry.get(HARNESS_DEFAULT.GEMINI_CLI_ID)).toBeDefined();
    expect(registry.get(HARNESS_DEFAULT.CODEX_CLI_ID)).toBeDefined();
  });

  it("creates registry without mock adapter when includeMock is false", () => {
    const registry = createHarnessRegistry({ enableCursor: false, includeMock: false });

    expect(registry.get(HARNESS_DEFAULT.MOCK_ID)).toBeUndefined();
    expect(registry.get(HARNESS_DEFAULT.CLAUDE_CLI_ID)).toBeDefined();
    expect(registry.get(HARNESS_DEFAULT.GEMINI_CLI_ID)).toBeDefined();
    expect(registry.get(HARNESS_DEFAULT.CODEX_CLI_ID)).toBeDefined();
  });

  it("parses cursor env flags with fallback default", () => {
    expect(isCursorHarnessEnabled({}, false)).toBe(false);
    expect(isCursorHarnessEnabled({}, true)).toBe(true);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "true" })).toBe(true);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "1" })).toBe(true);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "false" }, true)).toBe(false);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "0" }, true)).toBe(false);
  });

  it("uses provided default when cursor env flag is unsupported", () => {
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "maybe" }, false)).toBe(false);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "maybe" }, true)).toBe(true);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: "  " }, true)).toBe(true);
  });

  it("parses padded and case-insensitive cursor env flags", () => {
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: " TRUE " }, false)).toBe(true);
    expect(isCursorHarnessEnabled({ TOADSTOOL_CURSOR_CLI_ENABLED: " FaLsE " }, true)).toBe(false);
  });
});

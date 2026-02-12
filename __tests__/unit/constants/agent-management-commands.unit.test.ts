import {
  AGENT_MANAGEMENT_CAPABILITY,
  HARNESS_ID,
  HARNESS_MANAGEMENT_CAPABILITIES,
} from "@/constants/agent-management-commands";
import { describe, expect, it } from "vitest";

describe("agent-management-commands constants", () => {
  it("defines capability support for every managed harness id", () => {
    const harnessIds = Object.values(HARNESS_ID);
    for (const harnessId of harnessIds) {
      expect(HARNESS_MANAGEMENT_CAPABILITIES[harnessId]).toBeDefined();
    }
  });

  it("includes expected cursor command capabilities", () => {
    const cursorCapabilities = HARNESS_MANAGEMENT_CAPABILITIES[HARNESS_ID.CURSOR_CLI] ?? [];

    expect(cursorCapabilities).toContain(AGENT_MANAGEMENT_CAPABILITY.LOGIN);
    expect(cursorCapabilities).toContain(AGENT_MANAGEMENT_CAPABILITY.LOGOUT);
    expect(cursorCapabilities).toContain(AGENT_MANAGEMENT_CAPABILITY.STATUS);
    expect(cursorCapabilities).toContain(AGENT_MANAGEMENT_CAPABILITY.ABOUT);
    expect(cursorCapabilities).toContain(AGENT_MANAGEMENT_CAPABILITY.MODELS);
    expect(cursorCapabilities).toContain(AGENT_MANAGEMENT_CAPABILITY.MCP);
  });

  it("omits unsupported capabilities for codex and gemini harnesses", () => {
    const codexCapabilities = HARNESS_MANAGEMENT_CAPABILITIES[HARNESS_ID.CODEX_CLI] ?? [];
    const geminiCapabilities = HARNESS_MANAGEMENT_CAPABILITIES[HARNESS_ID.GEMINI_CLI] ?? [];

    expect(codexCapabilities).not.toContain(AGENT_MANAGEMENT_CAPABILITY.MCP);
    expect(codexCapabilities).not.toContain(AGENT_MANAGEMENT_CAPABILITY.MODELS);
    expect(geminiCapabilities).not.toContain(AGENT_MANAGEMENT_CAPABILITY.LOGIN);
    expect(geminiCapabilities).not.toContain(AGENT_MANAGEMENT_CAPABILITY.MCP);
  });
});

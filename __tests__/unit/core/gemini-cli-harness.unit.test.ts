import { CONNECTION_STATUS } from "@/constants/connection-status";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { ClaudeCliHarnessAdapter } from "@/core/claude-cli-harness";
import { geminiCliHarnessAdapter } from "@/core/gemini-cli-harness";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { describe, expect, it } from "vitest";

describe("geminiCliHarnessAdapter", () => {
  it("builds gemini runtime through the shared cli harness adapter factory", () => {
    const config = harnessConfigSchema.parse({
      id: HARNESS_DEFAULT.GEMINI_CLI_ID,
      name: HARNESS_DEFAULT.GEMINI_CLI_NAME,
      command: HARNESS_DEFAULT.GEMINI_COMMAND,
      args: HARNESS_DEFAULT.GEMINI_ARGS,
      env: {},
    });

    const runtime = geminiCliHarnessAdapter.createHarness(config);

    expect(geminiCliHarnessAdapter.id).toBe(HARNESS_DEFAULT.GEMINI_CLI_ID);
    expect(geminiCliHarnessAdapter.name).toBe(HARNESS_DEFAULT.GEMINI_CLI_NAME);
    expect(runtime).toBeInstanceOf(ClaudeCliHarnessAdapter);
    expect(runtime.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
  });
});

import { CONNECTION_STATUS } from "@/constants/connection-status";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { ClaudeCliHarnessAdapter } from "@/core/claude-cli-harness";
import { codexCliHarnessAdapter } from "@/core/codex-cli-harness";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { describe, expect, it } from "vitest";

describe("codexCliHarnessAdapter", () => {
  it("builds codex runtime through the shared cli harness adapter factory", () => {
    const config = harnessConfigSchema.parse({
      id: HARNESS_DEFAULT.CODEX_CLI_ID,
      name: HARNESS_DEFAULT.CODEX_CLI_NAME,
      command: HARNESS_DEFAULT.CODEX_COMMAND,
      args: HARNESS_DEFAULT.CODEX_ARGS,
      env: {},
    });

    const runtime = codexCliHarnessAdapter.createHarness(config);

    expect(codexCliHarnessAdapter.id).toBe(HARNESS_DEFAULT.CODEX_CLI_ID);
    expect(codexCliHarnessAdapter.name).toBe(HARNESS_DEFAULT.CODEX_CLI_NAME);
    expect(runtime).toBeInstanceOf(ClaudeCliHarnessAdapter);
    expect(runtime.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
  });
});

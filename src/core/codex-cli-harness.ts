import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { createCliHarnessRuntime } from "@/core/claude-cli-harness";
import type { HarnessAdapter } from "@/harness/harnessAdapter";
import { harnessConfigSchema } from "@/harness/harnessConfig";

export const codexCliHarnessAdapter: HarnessAdapter = {
  id: HARNESS_DEFAULT.CODEX_CLI_ID,
  name: HARNESS_DEFAULT.CODEX_CLI_NAME,
  configSchema: harnessConfigSchema,
  createHarness: (config) => createCliHarnessRuntime(config),
};

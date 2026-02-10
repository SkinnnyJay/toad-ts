import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { createCliHarnessRuntime } from "@/core/claude-cli-harness";
import type { HarnessAdapter } from "@/harness/harnessAdapter";
import { harnessConfigSchema } from "@/harness/harnessConfig";

export const geminiCliHarnessAdapter: HarnessAdapter = {
  id: HARNESS_DEFAULT.GEMINI_CLI_ID,
  name: HARNESS_DEFAULT.GEMINI_CLI_NAME,
  configSchema: harnessConfigSchema,
  createHarness: (config) => createCliHarnessRuntime(config),
};

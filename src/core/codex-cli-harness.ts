import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { createAcpCliHarnessRuntime } from "@/core/claude-cli-harness";
import { createCliHarnessAdapter } from "@/core/cli-agent/create-cli-harness-adapter";
import type { HarnessAdapter } from "@/harness/harnessAdapter";
import { type HarnessConfig, harnessConfigSchema } from "@/harness/harnessConfig";

export const codexCliHarnessAdapter: HarnessAdapter = createCliHarnessAdapter({
  id: HARNESS_DEFAULT.CODEX_CLI_ID,
  name: HARNESS_DEFAULT.CODEX_CLI_NAME,
  configSchema: harnessConfigSchema,
  createRuntime: (config: HarnessConfig) => createAcpCliHarnessRuntime(config),
});

import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import type { HarnessConfig, HarnessConfigResult } from "@/harness/harnessConfig";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { EnvManager } from "@/utils/env/env.utils";

const DEFAULT_ARGS: string[] = [];

const parseArgs = (rawValue: string): string[] => {
  return rawValue
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

export const createDefaultHarnessConfig = (
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot()
): HarnessConfigResult => {
  const command = env[ENV_KEY.TOADSTOOL_CLAUDE_COMMAND] ?? HARNESS_DEFAULT.CLAUDE_COMMAND;
  const argsRaw = env[ENV_KEY.TOADSTOOL_CLAUDE_ARGS];
  const args = argsRaw ? parseArgs(argsRaw) : [...DEFAULT_ARGS];

  const claudeHarness: HarnessConfig = harnessConfigSchema.parse({
    id: HARNESS_DEFAULT.CLAUDE_CLI_ID,
    name: HARNESS_DEFAULT.CLAUDE_CLI_NAME,
    command,
    args,
    env: {},
    cwd: process.cwd(),
  });

  const mockHarness: HarnessConfig = harnessConfigSchema.parse({
    id: HARNESS_DEFAULT.MOCK_ID,
    name: HARNESS_DEFAULT.MOCK_NAME,
    command: HARNESS_DEFAULT.MOCK_ID,
    args: [],
    env: {},
  });

  return {
    harnessId: HARNESS_DEFAULT.CLAUDE_CLI_ID,
    harness: claudeHarness,
    harnesses: {
      [HARNESS_DEFAULT.CLAUDE_CLI_ID]: claudeHarness,
      [HARNESS_DEFAULT.MOCK_ID]: mockHarness,
    },
  };
};

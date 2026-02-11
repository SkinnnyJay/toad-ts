import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import type { HarnessConfig, HarnessConfigResult } from "@/harness/harnessConfig";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { EnvManager } from "@/utils/env/env.utils";

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
  const args = argsRaw ? parseArgs(argsRaw) : [...HARNESS_DEFAULT.CLAUDE_ARGS];

  const geminiCommand = env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] ?? HARNESS_DEFAULT.GEMINI_COMMAND;
  const geminiArgsRaw = env[ENV_KEY.TOADSTOOL_GEMINI_ARGS];
  const geminiArgs = geminiArgsRaw ? parseArgs(geminiArgsRaw) : [...HARNESS_DEFAULT.GEMINI_ARGS];

  const codexCommand = env[ENV_KEY.TOADSTOOL_CODEX_COMMAND] ?? HARNESS_DEFAULT.CODEX_COMMAND;
  const codexArgsRaw = env[ENV_KEY.TOADSTOOL_CODEX_ARGS];
  const codexArgs = codexArgsRaw ? parseArgs(codexArgsRaw) : [...HARNESS_DEFAULT.CODEX_ARGS];

  const cursorCommand = env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] ?? HARNESS_DEFAULT.CURSOR_COMMAND;
  const cursorArgsRaw = env[ENV_KEY.TOADSTOOL_CURSOR_ARGS];
  const cursorArgs = cursorArgsRaw ? parseArgs(cursorArgsRaw) : [...HARNESS_DEFAULT.CURSOR_ARGS];

  const claudeHarness: HarnessConfig = harnessConfigSchema.parse({
    id: HARNESS_DEFAULT.CLAUDE_CLI_ID,
    name: HARNESS_DEFAULT.CLAUDE_CLI_NAME,
    command,
    args,
    env: {},
    cwd: process.cwd(),
  });

  const geminiHarness: HarnessConfig = harnessConfigSchema.parse({
    id: HARNESS_DEFAULT.GEMINI_CLI_ID,
    name: HARNESS_DEFAULT.GEMINI_CLI_NAME,
    command: geminiCommand,
    args: geminiArgs,
    env: {},
    cwd: process.cwd(),
  });

  const codexHarness: HarnessConfig = harnessConfigSchema.parse({
    id: HARNESS_DEFAULT.CODEX_CLI_ID,
    name: HARNESS_DEFAULT.CODEX_CLI_NAME,
    command: codexCommand,
    args: codexArgs,
    env: {},
    cwd: process.cwd(),
  });

  const cursorHarness: HarnessConfig = harnessConfigSchema.parse({
    id: HARNESS_DEFAULT.CURSOR_CLI_ID,
    name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
    command: cursorCommand,
    args: cursorArgs,
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
      [HARNESS_DEFAULT.GEMINI_CLI_ID]: geminiHarness,
      [HARNESS_DEFAULT.CODEX_CLI_ID]: codexHarness,
      [HARNESS_DEFAULT.CURSOR_CLI_ID]: cursorHarness,
      [HARNESS_DEFAULT.MOCK_ID]: mockHarness,
    },
  };
};

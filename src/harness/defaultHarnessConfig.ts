import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import type { HarnessConfig, HarnessConfigResult } from "@/harness/harnessConfig";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { parseBooleanEnvFlag } from "@/utils/env/boolean-flags";
import { EnvManager } from "@/utils/env/env.utils";

const parseArgs = (rawValue: string): string[] => {
  if (rawValue.trim().length === 0) {
    return [];
  }
  return rawValue
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const resolveCommand = (value: string | undefined, defaultCommand: string): string => {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : defaultCommand;
};

const resolveArgs = (value: string | undefined, defaultArgs: readonly string[]): string[] =>
  value === undefined ? [...defaultArgs] : parseArgs(value);

export const createDefaultHarnessConfig = (
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot()
): HarnessConfigResult => {
  const command = resolveCommand(
    env[ENV_KEY.TOADSTOOL_CLAUDE_COMMAND],
    HARNESS_DEFAULT.CLAUDE_COMMAND
  );
  const args = resolveArgs(env[ENV_KEY.TOADSTOOL_CLAUDE_ARGS], HARNESS_DEFAULT.CLAUDE_ARGS);

  const geminiCommand = resolveCommand(
    env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND],
    HARNESS_DEFAULT.GEMINI_COMMAND
  );
  const geminiArgs = resolveArgs(env[ENV_KEY.TOADSTOOL_GEMINI_ARGS], HARNESS_DEFAULT.GEMINI_ARGS);

  const codexCommand = resolveCommand(
    env[ENV_KEY.TOADSTOOL_CODEX_COMMAND],
    HARNESS_DEFAULT.CODEX_COMMAND
  );
  const codexArgs = resolveArgs(env[ENV_KEY.TOADSTOOL_CODEX_ARGS], HARNESS_DEFAULT.CODEX_ARGS);

  const cursorEnabled = parseBooleanEnvFlag(env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]) ?? false;
  const cursorCommand = resolveCommand(
    env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND],
    HARNESS_DEFAULT.CURSOR_COMMAND
  );
  const cursorArgs = resolveArgs(env[ENV_KEY.TOADSTOOL_CURSOR_ARGS], HARNESS_DEFAULT.CURSOR_ARGS);

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

  const cursorHarness: HarnessConfig | null = cursorEnabled
    ? harnessConfigSchema.parse({
        id: HARNESS_DEFAULT.CURSOR_CLI_ID,
        name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
        command: cursorCommand,
        args: cursorArgs,
        env: {},
        cwd: process.cwd(),
      })
    : null;

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
      ...(cursorHarness ? { [HARNESS_DEFAULT.CURSOR_CLI_ID]: cursorHarness } : {}),
      [HARNESS_DEFAULT.MOCK_ID]: mockHarness,
    },
  };
};

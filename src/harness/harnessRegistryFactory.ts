import { ENV_KEY } from "@/constants/env-keys";
import { claudeCliHarnessAdapter } from "@/core/claude-cli-harness";
import { codexCliHarnessAdapter } from "@/core/codex-cli-harness";
import { cursorCliHarnessAdapter } from "@/core/cursor/cursor-cli-harness";
import { geminiCliHarnessAdapter } from "@/core/gemini-cli-harness";
import { mockHarnessAdapter } from "@/core/mock-harness";
import type { HarnessAdapter } from "@/harness/harnessAdapter";
import { HarnessRegistry } from "@/harness/harnessRegistry";
import { parseBooleanEnvFlag } from "@/utils/env/boolean-flags";

export interface HarnessAdapterListOptions {
  enableCursor: boolean;
  includeMock?: boolean;
}

export const createHarnessAdapterList = ({
  enableCursor,
  includeMock = true,
}: HarnessAdapterListOptions): HarnessAdapter[] => {
  const adapters: HarnessAdapter[] = [
    claudeCliHarnessAdapter,
    geminiCliHarnessAdapter,
    codexCliHarnessAdapter,
  ];
  if (enableCursor) {
    adapters.push(cursorCliHarnessAdapter);
  }
  if (includeMock) {
    adapters.push(mockHarnessAdapter);
  }
  return adapters;
};

export const createHarnessRegistry = (options: HarnessAdapterListOptions): HarnessRegistry => {
  return new HarnessRegistry(createHarnessAdapterList(options));
};

export const isCursorHarnessEnabled = (env: NodeJS.ProcessEnv, defaultValue = false): boolean => {
  const parsed = parseBooleanEnvFlag(env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]);
  return parsed ?? defaultValue;
};

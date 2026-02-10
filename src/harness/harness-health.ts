import type { HarnessConfig } from "@/harness/harnessConfig";
import { commandExists } from "@/utils/command-exists";
import { EnvManager } from "@/utils/env/env.utils";

export interface HarnessHealth {
  id: string;
  name: string;
  command: string;
  available: boolean;
}

export const checkHarnessHealth = (
  harnesses: Record<string, HarnessConfig>,
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot()
): HarnessHealth[] => {
  return Object.values(harnesses).map((harness) => ({
    id: harness.id,
    name: harness.name,
    command: harness.command,
    available: commandExists(harness.command, { env, baseDir: harness.cwd }),
  }));
};

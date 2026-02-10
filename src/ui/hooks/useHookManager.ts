import type { AgentInfo } from "@/agents/agent-manager";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import type { HooksConfig } from "@/config/app-config";
import { HookManager } from "@/hooks/hook-manager";
import { createPromptHookRunner } from "@/hooks/hook-prompt-runner";
import { setHookManager } from "@/hooks/hook-service";
import { useAppStore } from "@/store/app-store";
import { EnvManager } from "@/utils/env/env.utils";
import { useEffect, useMemo } from "react";

export interface UseHookManagerOptions {
  hooks: HooksConfig;
  agentInfoMap: Map<AgentInfo["id"], AgentInfo>;
  subAgentRunner?: SubAgentRunner;
}

export const useHookManager = ({
  hooks,
  agentInfoMap,
  subAgentRunner,
}: UseHookManagerOptions): void => {
  const promptRunner = useMemo(
    () =>
      createPromptHookRunner({
        subAgentRunner,
        agentInfoMap,
        store: useAppStore,
      }),
    [agentInfoMap, subAgentRunner]
  );

  const hookManager = useMemo(
    () =>
      new HookManager({
        hooks,
        baseDir: process.cwd(),
        env: EnvManager.getInstance().getSnapshot(),
        promptRunner,
      }),
    [hooks, promptRunner]
  );

  useEffect(() => {
    setHookManager(hookManager);
    return () => setHookManager(null);
  }, [hookManager]);
};

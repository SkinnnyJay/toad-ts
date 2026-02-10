import type { AgentInfo } from "@/agents/agent-manager";
import { ExecutionEngine } from "@/agents/execution-engine";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { useAppStore } from "@/store/app-store";
import type { AgentId } from "@/types/domain";
import { useEffect, useMemo } from "react";

export interface UseExecutionEngineOptions {
  subAgentRunner?: SubAgentRunner;
  agentInfoMap: Map<AgentId, AgentInfo>;
}

export const useExecutionEngine = ({
  subAgentRunner,
  agentInfoMap,
}: UseExecutionEngineOptions): ExecutionEngine | null => {
  const engine = useMemo(() => {
    if (!subAgentRunner) {
      return null;
    }
    return new ExecutionEngine({ store: useAppStore, subAgentRunner, agentInfoMap });
  }, [agentInfoMap, subAgentRunner]);

  useEffect(() => {
    if (!engine) {
      return;
    }
    engine.start();
    return () => engine.stop();
  }, [engine]);

  return engine;
};

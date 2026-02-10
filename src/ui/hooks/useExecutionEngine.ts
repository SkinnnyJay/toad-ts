import type { AgentInfo } from "@/agents/agent-manager";
import { createRoutingPolicy } from "@/agents/agent-routing";
import { ExecutionEngine } from "@/agents/execution-engine";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import type { RoutingRule } from "@/config/app-config";
import { useAppStore } from "@/store/app-store";
import type { AgentId } from "@/types/domain";
import { useEffect, useMemo } from "react";

export interface UseExecutionEngineOptions {
  subAgentRunner?: SubAgentRunner;
  agentInfoMap: Map<AgentId, AgentInfo>;
  routingRules?: RoutingRule[];
}

export const useExecutionEngine = ({
  subAgentRunner,
  agentInfoMap,
  routingRules,
}: UseExecutionEngineOptions): ExecutionEngine | null => {
  const routingPolicy = useMemo(
    () => createRoutingPolicy(routingRules ?? [], agentInfoMap),
    [agentInfoMap, routingRules]
  );
  const engine = useMemo(() => {
    if (!subAgentRunner) {
      return null;
    }
    return new ExecutionEngine({
      store: useAppStore,
      subAgentRunner,
      agentInfoMap,
      routingPolicy,
    });
  }, [agentInfoMap, routingPolicy, subAgentRunner]);

  useEffect(() => {
    if (!engine) {
      return;
    }
    engine.start();
    return () => engine.stop();
  }, [engine]);

  return engine;
};

import type { AgentInfo } from "@/agents/agent-manager";
import { findAgentBySuffix } from "@/agents/agent-utils";
import type { RoutingRule } from "@/config/app-config";
import { AGENT_ID_SEPARATOR, BUILD } from "@/constants/agent-ids";
import type { AgentId, Session, Task } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";

export interface AgentRoutingPolicy {
  selectAgent: (params: {
    session: Session;
    task: Task;
    agents: AgentInfo[];
  }) => AgentInfo | null;
}

const extractHarnessId = (agentId?: AgentId): string | undefined => {
  if (!agentId) {
    return undefined;
  }
  const raw = String(agentId);
  const separatorIndex = raw.indexOf(AGENT_ID_SEPARATOR);
  if (separatorIndex < 0) {
    return raw;
  }
  return raw.slice(0, separatorIndex);
};

const resolveDefaultAgent = (session: Session, agents: AgentInfo[]): AgentInfo | null => {
  const preferredHarness = extractHarnessId(session.agentId);
  return (
    findAgentBySuffix(agents, BUILD, preferredHarness) ??
    agents.find((agent) => agent.harnessId === preferredHarness && !agent.hidden) ??
    agents.find((agent) => !agent.hidden) ??
    null
  );
};

const matchTask = (rule: RoutingRule, task: Task): boolean => {
  try {
    const regex = new RegExp(rule.matcher);
    return regex.test(task.title) || regex.test(task.description);
  } catch (_error) {
    return false;
  }
};

export const createRoutingPolicy = (
  rules: RoutingRule[],
  agentInfoMap: Map<AgentId, AgentInfo>
): AgentRoutingPolicy => {
  return {
    selectAgent: ({ session, task, agents }) => {
      for (const rule of rules) {
        if (!matchTask(rule, task)) {
          continue;
        }
        const parsed = AgentIdSchema.safeParse(rule.agentId);
        if (!parsed.success) {
          continue;
        }
        const resolved = agentInfoMap.get(parsed.data);
        if (resolved && !resolved.hidden) {
          return resolved;
        }
      }
      return resolveDefaultAgent(session, agents);
    },
  };
};

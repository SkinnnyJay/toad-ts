import type { AgentInfo } from "@/agents/agent-manager";
import { AGENT_ID_SEPARATOR } from "@/constants/agent-ids";

const hasSuffix = (agentId: AgentInfo["id"], suffix: string): boolean => {
  const exactSuffix = `${AGENT_ID_SEPARATOR}${suffix}`;
  return String(agentId).endsWith(exactSuffix);
};

export const findAgentBySuffix = (
  agents: AgentInfo[],
  suffix: string,
  preferredHarnessId?: string,
  options: { requireHidden?: boolean } = {}
): AgentInfo | null => {
  const matchesVisibility = (agent: AgentInfo): boolean =>
    options.requireHidden ? Boolean(agent.hidden) : !agent.hidden;
  return (
    agents.find(
      (candidate) =>
        matchesVisibility(candidate) &&
        hasSuffix(candidate.id, suffix) &&
        (!preferredHarnessId || candidate.harnessId === preferredHarnessId)
    ) ??
    agents.find((candidate) => matchesVisibility(candidate) && hasSuffix(candidate.id, suffix)) ??
    null
  );
};

export const findHiddenAgentBySuffix = (
  agents: AgentInfo[],
  suffix: string,
  preferredHarnessId?: string
): AgentInfo | null => {
  return findAgentBySuffix(agents, suffix, preferredHarnessId, { requireHidden: true });
};

import type { AgentInfo } from "@/agents/agent-manager";
import { AGENT_ID_SEPARATOR } from "@/constants/agent-ids";

export const findHiddenAgentBySuffix = (
  agents: AgentInfo[],
  suffix: string,
  preferredHarnessId?: string
): AgentInfo | null => {
  const exactSuffix = `${AGENT_ID_SEPARATOR}${suffix}`;
  return (
    agents.find(
      (candidate) =>
        candidate.hidden &&
        String(candidate.id).endsWith(exactSuffix) &&
        (!preferredHarnessId || candidate.harnessId === preferredHarnessId)
    ) ??
    agents.find((candidate) => candidate.hidden && String(candidate.id).endsWith(exactSuffix)) ??
    null
  );
};

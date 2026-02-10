import type { AgentInfo } from "@/agents/agent-manager";

export interface AgentMentionResult {
  agent: AgentInfo;
  prompt: string;
}

const AGENT_MENTION_REGEX = /^@(\S+)(?:\s+([\s\S]+))?$/;

const normalizeToken = (value: string): string => value.trim().toLowerCase();

const normalizeName = (value: string): string => normalizeToken(value).replace(/[^a-z0-9]+/g, "-");

const findAgentByToken = (
  token: string,
  agents: AgentInfo[],
  currentAgent?: AgentInfo | null
): AgentInfo | undefined => {
  const normalized = normalizeToken(token);
  const byId = agents.find((agent) => normalizeToken(String(agent.id)) === normalized);
  if (byId) return byId;
  const byName = agents.find((agent) => normalizeName(agent.name) === normalized);
  if (byName) return byName;
  if (currentAgent) {
    const candidateId = `${currentAgent.harnessId}:${normalized}`;
    const bySuffix = agents.find((agent) => String(agent.id) === candidateId);
    if (bySuffix) return bySuffix;
  }
  return undefined;
};

export const parseAgentMention = (
  value: string,
  agents: AgentInfo[],
  currentAgent?: AgentInfo | null
): AgentMentionResult | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("@")) {
    return null;
  }
  const match = trimmed.match(AGENT_MENTION_REGEX);
  if (!match) {
    return null;
  }
  const token = match[1];
  const prompt = match[2]?.trim();
  if (!token || !prompt) {
    return null;
  }
  const agent = findAgentByToken(token, agents, currentAgent);
  if (!agent || agent.hidden) {
    return null;
  }
  return { agent, prompt };
};

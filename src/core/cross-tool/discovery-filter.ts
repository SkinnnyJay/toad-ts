/**
 * Filter discovery items (skills, commands, rules) by the selected provider/agent.
 * Items with no agent tag are shown for all providers; items with agent tag are shown
 * only when the tag matches the selected agent's id, name, or harnessId.
 */

import type { LoadedCommand, LoadedRule, LoadedSkill } from "./universal-loader";

/** Minimal agent shape for filtering; avoids coupling to AgentInfo. */
export interface AgentFilterContext {
  id: string;
  name: string;
  harnessId: string;
}

function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase();
}

function agentTagMatches(tag: string | undefined, agent: AgentFilterContext | null): boolean {
  if (agent === null) return true;
  if (tag === undefined || tag === "") return true;
  const t = normalizeForMatch(tag);
  return (
    t === normalizeForMatch(agent.id) ||
    t === normalizeForMatch(agent.name) ||
    t === normalizeForMatch(agent.harnessId)
  );
}

/**
 * Return skills that apply to the given agent. Skills without an agent tag apply to all.
 */
export function filterSkillsForAgent(
  skills: LoadedSkill[],
  agent: AgentFilterContext | null
): LoadedSkill[] {
  return skills.filter((s) => agentTagMatches(s.agent, agent));
}

/**
 * Return commands that apply to the given agent. Commands without an agent tag apply to all.
 */
export function filterCommandsForAgent(
  commands: LoadedCommand[],
  agent: AgentFilterContext | null
): LoadedCommand[] {
  return commands.filter((c) => agentTagMatches(c.agent, agent));
}

/**
 * Return Cursor rules that apply to the given agent. Rules without an agent tag apply to all.
 */
export function filterRulesForAgent(
  rules: LoadedRule[],
  agent: AgentFilterContext | null
): LoadedRule[] {
  return rules.filter((r) => agentTagMatches(r.agent, agent));
}

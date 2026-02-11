/**
 * Sub-path names for cross-tool discovery (skills, commands, agents, hooks).
 */
export const DISCOVERY_SUBPATH = {
  SKILLS: "skills",
  COMMANDS: "commands",
  AGENTS: "agents",
  HOOKS: "hooks",
} as const;

export type DiscoverySubpath = (typeof DISCOVERY_SUBPATH)[keyof typeof DISCOVERY_SUBPATH];

export const { SKILLS, COMMANDS, AGENTS, HOOKS } = DISCOVERY_SUBPATH;

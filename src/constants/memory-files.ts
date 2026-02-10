export const MEMORY_TARGET = {
  AGENTS: "agents",
  CLAUDE: "claude",
  BOTH: "both",
} as const;

export type MemoryTarget = (typeof MEMORY_TARGET)[keyof typeof MEMORY_TARGET];

export const MEMORY_FILE = {
  AGENTS: "AGENTS.md",
  CLAUDE: "CLAUDE.md",
} as const;

export type MemoryFile = (typeof MEMORY_FILE)[keyof typeof MEMORY_FILE];

export const {
  AGENTS: MEMORY_TARGET_AGENTS,
  CLAUDE: MEMORY_TARGET_CLAUDE,
  BOTH: MEMORY_TARGET_BOTH,
} = MEMORY_TARGET;

export const { AGENTS: MEMORY_FILE_AGENTS, CLAUDE: MEMORY_FILE_CLAUDE } = MEMORY_FILE;

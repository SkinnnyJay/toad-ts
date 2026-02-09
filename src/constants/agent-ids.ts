export const AGENT_ID_SUFFIX = {
  BUILD: "build",
  PLAN: "plan",
  COMPACTION: "compaction",
  TITLE: "title",
  SUMMARY: "summary",
} as const;

export type AgentIdSuffix = (typeof AGENT_ID_SUFFIX)[keyof typeof AGENT_ID_SUFFIX];

export const { BUILD, PLAN, COMPACTION, TITLE, SUMMARY } = AGENT_ID_SUFFIX;

export const AGENT_ID_SEPARATOR = ":" as const;

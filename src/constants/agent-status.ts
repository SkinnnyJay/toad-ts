export const AGENT_STATUS = {
  IDLE: "idle",
  WORKING: "working",
  WAITING: "waiting",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

// Re-export for convenience
export const { IDLE, WORKING, WAITING, COMPLETED, ERROR } = AGENT_STATUS;

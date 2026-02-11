export const TODO_PRIORITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type TodoPriority = (typeof TODO_PRIORITY)[keyof typeof TODO_PRIORITY];

export const { HIGH, MEDIUM, LOW } = TODO_PRIORITY;

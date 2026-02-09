export const SIDEBAR_TAB = {
  FILES: "files",
  PLAN: "plan",
  CONTEXT: "context",
  SESSIONS: "sessions",
  AGENT: "agent",
} as const;

export type SidebarTab = (typeof SIDEBAR_TAB)[keyof typeof SIDEBAR_TAB];

export const SIDEBAR_TAB_VALUES = [
  SIDEBAR_TAB.FILES,
  SIDEBAR_TAB.PLAN,
  SIDEBAR_TAB.CONTEXT,
  SIDEBAR_TAB.SESSIONS,
  SIDEBAR_TAB.AGENT,
] as const;

export const { FILES, PLAN, CONTEXT, SESSIONS, AGENT } = SIDEBAR_TAB;

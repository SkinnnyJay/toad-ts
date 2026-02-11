export const SIDEBAR_TAB = {
  FILES: "files",
  PLAN: "plan",
  CONTEXT: "context",
  SESSIONS: "sessions",
  AGENT: "agent",
  TODOS: "todos",
} as const;

export type SidebarTab = (typeof SIDEBAR_TAB)[keyof typeof SIDEBAR_TAB];

export const SIDEBAR_TAB_VALUES = [
  SIDEBAR_TAB.FILES,
  SIDEBAR_TAB.PLAN,
  SIDEBAR_TAB.CONTEXT,
  SIDEBAR_TAB.SESSIONS,
  SIDEBAR_TAB.AGENT,
  SIDEBAR_TAB.TODOS,
] as const;

export const { FILES, PLAN, CONTEXT, SESSIONS, AGENT, TODOS } = SIDEBAR_TAB;

export const SIDEBAR_TAB_LABEL: Record<SidebarTab, string> = {
  [SIDEBAR_TAB.FILES]: "Files",
  [SIDEBAR_TAB.PLAN]: "Plan",
  [SIDEBAR_TAB.CONTEXT]: "Context",
  [SIDEBAR_TAB.SESSIONS]: "Sessions",
  [SIDEBAR_TAB.AGENT]: "Sub-agents",
  [SIDEBAR_TAB.TODOS]: "Todos",
};

/** Short labels for the top tab bar (horizontal squares). */
export const SIDEBAR_TAB_SHORT_LABEL: Record<SidebarTab, string> = {
  [SIDEBAR_TAB.FILES]: "Files",
  [SIDEBAR_TAB.PLAN]: "Plan",
  [SIDEBAR_TAB.CONTEXT]: "Ctx",
  [SIDEBAR_TAB.SESSIONS]: "Sess",
  [SIDEBAR_TAB.AGENT]: "Agent",
  [SIDEBAR_TAB.TODOS]: "Todos",
};

/** Unicode icons for each sidebar tab; tooltip shows full name. (FILES: U+1F5C0 folder.) */
export const SIDEBAR_TAB_ICON: Record<SidebarTab, string> = {
  [SIDEBAR_TAB.FILES]: "\u{1F5C0}",
  [SIDEBAR_TAB.PLAN]: "\u{2261}",
  [SIDEBAR_TAB.CONTEXT]: "\u{2394}",
  [SIDEBAR_TAB.SESSIONS]: "\u{2630}",
  [SIDEBAR_TAB.AGENT]: "\u{2699}",
  [SIDEBAR_TAB.TODOS]: "\u{2610}",
};

/** Single letter shown in each tab square (icon + letter). */
export const SIDEBAR_TAB_LETTER: Record<SidebarTab, string> = {
  [SIDEBAR_TAB.FILES]: "F",
  [SIDEBAR_TAB.PLAN]: "P",
  [SIDEBAR_TAB.CONTEXT]: "C",
  [SIDEBAR_TAB.SESSIONS]: "S",
  [SIDEBAR_TAB.AGENT]: "A",
  [SIDEBAR_TAB.TODOS]: "T",
};

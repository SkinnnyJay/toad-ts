/**
 * HTTP server path segments and route paths for the headless server.
 */
export const SERVER_PATH = {
  HEALTH: "/health",
  SESSIONS: "/sessions",
  SEGMENT_PROMPT: "prompt",
  SEGMENT_MESSAGES: "messages",
} as const;

export type ServerPath = (typeof SERVER_PATH)[keyof typeof SERVER_PATH];

export const { HEALTH, SESSIONS, SEGMENT_PROMPT, SEGMENT_MESSAGES } = SERVER_PATH;

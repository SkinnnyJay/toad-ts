export const SERVER_EVENT = {
  SESSION_CREATED: "session_created",
  SESSION_UPDATE: "session_update",
  SESSION_CLOSED: "session_closed",
} as const;

export type ServerEvent = (typeof SERVER_EVENT)[keyof typeof SERVER_EVENT];

export const { SESSION_CREATED, SESSION_UPDATE, SESSION_CLOSED } = SERVER_EVENT;

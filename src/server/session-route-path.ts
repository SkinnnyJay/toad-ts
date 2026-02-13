import { LIMIT } from "@/config/limits";
import { SERVER_PATH } from "@/constants/server-paths";

export interface SessionRoutePath {
  readonly sessionId?: string;
  readonly action?: string;
}

export const parseSessionRoutePath = (pathname: string): SessionRoutePath | null => {
  if (!pathname.startsWith(`${SERVER_PATH.SESSIONS}/`)) {
    return null;
  }
  const parts = pathname.split("/");
  if (parts.length > LIMIT.SESSION_ROUTE_MAX_SEGMENTS) {
    return null;
  }
  const [_, __, sessionId, action] = parts;
  return { sessionId, action };
};

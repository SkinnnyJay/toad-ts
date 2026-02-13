import { SERVER_PATH } from "@/constants/server-paths";

export interface SessionRoutePath {
  readonly sessionId?: string;
  readonly action?: string;
}

export const parseSessionRoutePath = (pathname: string): SessionRoutePath | null => {
  if (!pathname.startsWith(`${SERVER_PATH.SESSIONS}/`)) {
    return null;
  }
  const [_, __, sessionId, action] = pathname.split("/");
  return { sessionId, action };
};

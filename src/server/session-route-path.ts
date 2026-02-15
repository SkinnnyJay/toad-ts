import { LIMIT } from "@/config/limits";
import { SERVER_PATH } from "@/constants/server-paths";

export interface SessionRoutePath {
  readonly sessionId?: string;
  readonly action?: string;
}

const normalizeRouteSegment = (segment: string | undefined): string | undefined => {
  if (segment === undefined) {
    return undefined;
  }
  const normalizedSegment = segment.trim();
  return normalizedSegment.length > 0 ? normalizedSegment : undefined;
};

export const parseSessionRoutePath = (pathname: string): SessionRoutePath | null => {
  const normalizedPathname = pathname.trim();
  if (!normalizedPathname.startsWith(`${SERVER_PATH.SESSIONS}/`)) {
    return null;
  }
  const parts = normalizedPathname.split("/");
  if (parts.length > LIMIT.SESSION_ROUTE_MAX_SEGMENTS) {
    return null;
  }
  const [_, __, rawSessionId, rawAction] = parts;
  const sessionId = normalizeRouteSegment(rawSessionId);
  if (!sessionId) {
    return null;
  }
  const action = normalizeRouteSegment(rawAction);
  if (rawAction !== undefined && !action) {
    return null;
  }
  return { sessionId, action };
};

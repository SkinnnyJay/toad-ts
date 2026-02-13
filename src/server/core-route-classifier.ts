import { HTTP_METHOD } from "@/constants/http-methods";
import { SERVER_PATH } from "@/constants/server-paths";

export const CORE_ROUTE_DECISION = {
  HEALTH_OK: "health_ok",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  UNHANDLED: "unhandled",
} as const;

type CoreRouteDecision =
  | {
      kind: typeof CORE_ROUTE_DECISION.HEALTH_OK;
    }
  | {
      kind: typeof CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED;
    }
  | {
      kind: typeof CORE_ROUTE_DECISION.UNHANDLED;
    };

export const classifyCoreRoute = (method: string, pathname: string): CoreRouteDecision => {
  if (pathname === SERVER_PATH.HEALTH) {
    if (method === HTTP_METHOD.GET) {
      return { kind: CORE_ROUTE_DECISION.HEALTH_OK };
    }
    return { kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED };
  }
  if (pathname === SERVER_PATH.SESSIONS) {
    if (method === HTTP_METHOD.POST) {
      return { kind: CORE_ROUTE_DECISION.UNHANDLED };
    }
    return { kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED };
  }
  if (!pathname.startsWith(`${SERVER_PATH.SESSIONS}/`)) {
    return { kind: CORE_ROUTE_DECISION.UNHANDLED };
  }

  const [_, __, sessionId, action] = pathname.split("/");
  if (!sessionId || !action) {
    return { kind: CORE_ROUTE_DECISION.UNHANDLED };
  }
  if (action === SERVER_PATH.SEGMENT_PROMPT && method !== HTTP_METHOD.POST) {
    return { kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED };
  }
  if (action === SERVER_PATH.SEGMENT_MESSAGES && method !== HTTP_METHOD.GET) {
    return { kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED };
  }

  return { kind: CORE_ROUTE_DECISION.UNHANDLED };
};

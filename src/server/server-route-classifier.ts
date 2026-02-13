import type { RouteHandler } from "@/server/api-routes";
import {
  API_ROUTE_CLASSIFICATION,
  type RouteMatchResult,
  classifyApiRoute,
} from "@/server/api-routes";
import { CORE_ROUTE_DECISION, classifyCoreRoute } from "@/server/core-route-classifier";

export const SERVER_ROUTE_CLASSIFICATION = {
  HEALTH_OK: "health_ok",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  API_MATCH: "api_match",
  UNHANDLED: "unhandled",
} as const;

type ApiMatchClassification = {
  kind: typeof SERVER_ROUTE_CLASSIFICATION.API_MATCH;
  handler: RouteHandler;
  params: Record<string, string>;
};

type ServerRouteClassification =
  | {
      kind: typeof SERVER_ROUTE_CLASSIFICATION.HEALTH_OK;
    }
  | {
      kind: typeof SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED;
    }
  | ApiMatchClassification
  | {
      kind: typeof SERVER_ROUTE_CLASSIFICATION.UNHANDLED;
    };

const classifyApiRouteMatch = (matched: RouteMatchResult): ApiMatchClassification => ({
  kind: SERVER_ROUTE_CLASSIFICATION.API_MATCH,
  handler: matched.handler,
  params: matched.params,
});

export const classifyServerRoute = (
  method: string,
  pathname: string
): ServerRouteClassification => {
  const coreClassification = classifyCoreRoute(method, pathname);
  if (coreClassification.kind === CORE_ROUTE_DECISION.HEALTH_OK) {
    return { kind: SERVER_ROUTE_CLASSIFICATION.HEALTH_OK };
  }
  if (coreClassification.kind === CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED) {
    return { kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED };
  }

  const apiClassification = classifyApiRoute(method, pathname);
  if (apiClassification.kind === API_ROUTE_CLASSIFICATION.MATCH) {
    return classifyApiRouteMatch(apiClassification);
  }
  if (apiClassification.kind === API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED) {
    return { kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED };
  }

  return { kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED };
};

import {
  SERVER_ROUTE_CLASSIFIER_HANDLER,
  type ServerRouteClassifierHandler,
} from "@/constants/server-route-classifier-handlers";
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

export const SERVER_ROUTE_HANDLER = SERVER_ROUTE_CLASSIFIER_HANDLER;
export type ServerRouteHandler = ServerRouteClassifierHandler;

type ApiMatchClassification = {
  kind: typeof SERVER_ROUTE_CLASSIFICATION.API_MATCH;
  handler: RouteHandler;
  params: Record<string, string>;
};

type MethodNotAllowedClassification = {
  kind: typeof SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED;
  classifierHandler: ServerRouteHandler;
};

type UnhandledClassification = {
  kind: typeof SERVER_ROUTE_CLASSIFICATION.UNHANDLED;
  classifierHandler: ServerRouteHandler;
};

type ServerRouteClassification =
  | {
      kind: typeof SERVER_ROUTE_CLASSIFICATION.HEALTH_OK;
    }
  | MethodNotAllowedClassification
  | ApiMatchClassification
  | UnhandledClassification;

const classifyApiRouteMatch = (matched: RouteMatchResult): ApiMatchClassification => ({
  kind: SERVER_ROUTE_CLASSIFICATION.API_MATCH,
  handler: matched.handler,
  params: matched.params,
});

const classifyUnhandledRoute = (pathname: string): UnhandledClassification => ({
  kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
  classifierHandler: pathname.startsWith("/api/")
    ? SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER
    : SERVER_ROUTE_CLASSIFIER_HANDLER.CORE_ROUTE_CLASSIFIER,
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
    return {
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.CORE_ROUTE_CLASSIFIER,
    };
  }

  const apiClassification = classifyApiRoute(method, pathname);
  if (apiClassification.kind === API_ROUTE_CLASSIFICATION.MATCH) {
    return classifyApiRouteMatch(apiClassification);
  }
  if (apiClassification.kind === API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED) {
    return {
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: apiClassification.classifierHandler,
    };
  }

  return classifyUnhandledRoute(pathname);
};

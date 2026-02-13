import { HTTP_METHOD } from "@/constants/http-methods";
import { SERVER_PATH } from "@/constants/server-paths";
import { CORE_ROUTE_DECISION, classifyCoreRoute } from "@/server/core-route-classifier";
import { describe, expect, it } from "vitest";

describe("classifyCoreRoute", () => {
  it("returns health_ok for GET /health", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, SERVER_PATH.HEALTH);
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
  });

  it("returns method_not_allowed for non-GET /health", () => {
    const result = classifyCoreRoute(HTTP_METHOD.POST, SERVER_PATH.HEALTH);
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST /sessions", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, SERVER_PATH.SESSIONS);
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST /sessions/:id/prompt", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-GET /sessions/:id/messages", () => {
    const result = classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/messages");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns unhandled for unknown routes and malformed session paths", () => {
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
  });
});

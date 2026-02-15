import { HTTP_METHOD } from "@/constants/http-methods";
import { SERVER_PATH } from "@/constants/server-paths";
import { CORE_ROUTE_DECISION, classifyCoreRoute } from "@/server/core-route-classifier";
import { describe, expect, it } from "vitest";

describe("classifyCoreRoute", () => {
  it("returns health_ok for GET /health", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, SERVER_PATH.HEALTH);
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
  });

  it("returns health_ok for lowercase GET /health", () => {
    const result = classifyCoreRoute("get", SERVER_PATH.HEALTH);
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
  });

  it("returns health_ok for padded GET /health pathname", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, " /health ");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
  });

  it("returns health_ok for GET /health with query/hash suffixes", () => {
    const queryResult = classifyCoreRoute(HTTP_METHOD.GET, "/health?check=true");
    const hashResult = classifyCoreRoute(HTTP_METHOD.GET, "/health#summary");
    expect(queryResult).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
    expect(hashResult).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
  });

  it("returns health_ok for GET /health with trailing slash", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/health/");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
  });

  it("returns health_ok for GET /health with combined trailing-query suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/health/?check=true");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
  });

  it("returns health_ok for GET /health with combined trailing-hash suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/health/#summary");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
  });

  it("returns method_not_allowed for non-GET /health", () => {
    const result = classifyCoreRoute(HTTP_METHOD.POST, SERVER_PATH.HEALTH);
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-GET /health with trailing-query suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.POST, "/health/?check=true");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-GET /health with trailing-hash suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.POST, "/health/#summary");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST /sessions", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, SERVER_PATH.SESSIONS);
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST /sessions with trailing-query suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/?scope=all");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST /sessions with trailing-hash suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/#summary");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST /sessions/:id/prompt", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST prompt route with query/hash suffixes", () => {
    const queryResult = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt?view=full");
    const hashResult = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt#latest");
    expect(queryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(hashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST prompt route with trailing slash", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt/");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST prompt route with trailing-query suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt/?view=full");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-POST prompt route with trailing-hash suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt/#latest");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-GET /sessions/:id/messages", () => {
    const result = classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/messages");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-GET messages route with query/hash suffixes", () => {
    const queryResult = classifyCoreRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1/messages?limit=10"
    );
    const hashResult = classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/messages#tail");
    expect(queryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(hashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-GET messages route with trailing-query suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/messages/?limit=10");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns method_not_allowed for non-GET messages route with trailing-hash suffix", () => {
    const result = classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/messages/#tail");
    expect(result).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("returns unhandled for unknown routes and malformed session paths", () => {
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint//?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1//?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1//#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/prompt/extra")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
  });

  it("returns unhandled for blank-session prompt/messages malformed paths", () => {
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//prompt")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//prompt//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//prompt//?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt//?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//prompt?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//prompt//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//prompt/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages//?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
  });
});

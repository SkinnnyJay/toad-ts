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

  it("normalizes lowercase/padded methods for known core routes", () => {
    const paddedHealthGetResult = classifyCoreRoute(" get ", SERVER_PATH.HEALTH);
    const lowerHealthPostResult = classifyCoreRoute("post", "/health");
    const paddedSessionsGetResult = classifyCoreRoute(" get ", SERVER_PATH.SESSIONS);
    const lowerSessionsPostResult = classifyCoreRoute("post", "/sessions");
    const paddedPromptPostResult = classifyCoreRoute(" post ", "/sessions/session-1/prompt");
    const lowerPromptGetResult = classifyCoreRoute("get", "/sessions/session-1/prompt");
    const paddedMessagesGetResult = classifyCoreRoute(" get ", "/sessions/session-1/messages");
    const lowerMessagesPostResult = classifyCoreRoute("post", "/sessions/session-1/messages");
    expect(paddedHealthGetResult).toEqual({ kind: CORE_ROUTE_DECISION.HEALTH_OK });
    expect(lowerHealthPostResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(paddedSessionsGetResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(lowerSessionsPostResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(paddedPromptPostResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(lowerPromptGetResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(paddedMessagesGetResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(lowerMessagesPostResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
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

  it("normalizes known core routes with double-trailing suffix variants", () => {
    const healthResult = classifyCoreRoute(HTTP_METHOD.POST, "/health//");
    const healthQueryResult = classifyCoreRoute(HTTP_METHOD.POST, "/health//?check=true");
    const healthHashResult = classifyCoreRoute(HTTP_METHOD.POST, "/health//#summary");
    const sessionsResult = classifyCoreRoute(HTTP_METHOD.GET, "/sessions//");
    const sessionsPostResult = classifyCoreRoute(HTTP_METHOD.POST, "/sessions//");
    const promptResult = classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt//");
    const promptQueryResult = classifyCoreRoute(
      HTTP_METHOD.GET,
      "/sessions/session-1/prompt//?view=full"
    );
    const promptHashResult = classifyCoreRoute(
      HTTP_METHOD.GET,
      "/sessions/session-1/prompt//#latest"
    );
    const messagesResult = classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/messages//");
    const messagesQueryResult = classifyCoreRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1/messages//?limit=10"
    );
    const messagesHashResult = classifyCoreRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1/messages//#tail"
    );
    expect(healthResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(healthQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(healthHashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(sessionsResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(sessionsPostResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(promptResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(promptQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(promptHashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(messagesResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(messagesQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(messagesHashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
  });

  it("normalizes whitespace-padded known core routes with double-trailing variants", () => {
    const healthResult = classifyCoreRoute(HTTP_METHOD.POST, " /health// ");
    const healthQueryResult = classifyCoreRoute(HTTP_METHOD.POST, " /health//?check=true ");
    const healthHashResult = classifyCoreRoute(HTTP_METHOD.POST, " /health//#summary ");
    const sessionsResult = classifyCoreRoute(HTTP_METHOD.GET, " /sessions// ");
    const sessionsPostResult = classifyCoreRoute(HTTP_METHOD.POST, " /sessions// ");
    const promptResult = classifyCoreRoute(HTTP_METHOD.GET, " /sessions/session-1/prompt// ");
    const promptQueryResult = classifyCoreRoute(
      HTTP_METHOD.GET,
      " /sessions/session-1/prompt//?view=full "
    );
    const promptHashResult = classifyCoreRoute(
      HTTP_METHOD.GET,
      " /sessions/session-1/prompt//#latest "
    );
    const messagesResult = classifyCoreRoute(HTTP_METHOD.POST, " /sessions/session-1/messages// ");
    const messagesQueryResult = classifyCoreRoute(
      HTTP_METHOD.POST,
      " /sessions/session-1/messages//?limit=10 "
    );
    const messagesHashResult = classifyCoreRoute(
      HTTP_METHOD.POST,
      " /sessions/session-1/messages//#tail "
    );
    expect(healthResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(healthQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(healthHashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(sessionsResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(sessionsPostResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(promptResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(promptQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(promptHashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(messagesResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(messagesQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(messagesHashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
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

  it("normalizes blank-session base variants to /sessions method semantics", () => {
    const getDoubleTrailingResult = classifyCoreRoute(HTTP_METHOD.GET, "/sessions//");
    const getDoubleTrailingQueryResult = classifyCoreRoute(
      HTTP_METHOD.GET,
      "/sessions//?scope=all"
    );
    const getDoubleTrailingHashResult = classifyCoreRoute(HTTP_METHOD.GET, "/sessions//#summary");
    const postDoubleTrailingResult = classifyCoreRoute(HTTP_METHOD.POST, "/sessions//");
    const postDoubleTrailingQueryResult = classifyCoreRoute(
      HTTP_METHOD.POST,
      "/sessions//?scope=all"
    );
    const postDoubleTrailingHashResult = classifyCoreRoute(HTTP_METHOD.POST, "/sessions//#summary");
    expect(getDoubleTrailingResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(getDoubleTrailingQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(getDoubleTrailingHashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(postDoubleTrailingResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(postDoubleTrailingQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(postDoubleTrailingHashResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
  });

  it("normalizes whitespace-padded blank-session base variants to /sessions semantics", () => {
    const getDoubleTrailingResult = classifyCoreRoute(HTTP_METHOD.GET, " /sessions// ");
    const getDoubleTrailingQueryResult = classifyCoreRoute(
      HTTP_METHOD.GET,
      " /sessions//?scope=all "
    );
    const getDoubleTrailingHashResult = classifyCoreRoute(HTTP_METHOD.GET, " /sessions//#summary ");
    const postDoubleTrailingResult = classifyCoreRoute(HTTP_METHOD.POST, " /sessions// ");
    const postDoubleTrailingQueryResult = classifyCoreRoute(
      HTTP_METHOD.POST,
      " /sessions//?scope=all "
    );
    const postDoubleTrailingHashResult = classifyCoreRoute(
      HTTP_METHOD.POST,
      " /sessions//#summary "
    );
    expect(getDoubleTrailingResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(getDoubleTrailingQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(getDoubleTrailingHashResult).toEqual({ kind: CORE_ROUTE_DECISION.METHOD_NOT_ALLOWED });
    expect(postDoubleTrailingResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(postDoubleTrailingQueryResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
    expect(postDoubleTrailingHashResult).toEqual({ kind: CORE_ROUTE_DECISION.UNHANDLED });
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
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown/?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown/?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown//?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown//?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown-endpoint?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint/?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown-endpoint/?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown-endpoint#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown-endpoint/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown-endpoint/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown-endpoint//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint//?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown-endpoint//?scope=all")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/unknown-endpoint//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/unknown-endpoint//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1/#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1//?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1//?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions/session-1//#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1//#latest")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions/session-1/prompt/extra")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
  });

  it("returns unhandled for whitespace-padded unknown and malformed session routes", () => {
    expect(classifyCoreRoute(HTTP_METHOD.GET, " /unknown-endpoint//?scope=all ")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, " /unknown-endpoint//#summary ")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, " /sessions/session-1//#latest ")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, " /sessions/session-1//?view=full ")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, " /sessions//prompt//#summary ")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, " /sessions//messages//?tail=1 ")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
  });

  it("returns unhandled for unknown and malformed routes with lowercase/padded methods", () => {
    expect(classifyCoreRoute(" get ", "/unknown-endpoint")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute("post", "/unknown-endpoint//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(" get ", "/sessions/session-1//?view=full")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute("post", "/sessions//prompt//#summary")).toEqual({
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
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//prompt/")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt/")).toEqual({
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
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//prompt/?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//prompt/?tail=1")).toEqual({
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
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//messages")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//messages//")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages//?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//messages//?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//messages?tail=1")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//messages#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//messages/#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.GET, "/sessions//messages//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
    expect(classifyCoreRoute(HTTP_METHOD.POST, "/sessions//messages//#summary")).toEqual({
      kind: CORE_ROUTE_DECISION.UNHANDLED,
    });
  });
});

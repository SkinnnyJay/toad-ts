import { HTTP_METHOD } from "@/constants/http-methods";
import { SERVER_PATH } from "@/constants/server-paths";
import {
  SERVER_ROUTE_CLASSIFICATION,
  SERVER_ROUTE_HANDLER,
  classifyServerRoute,
} from "@/server/server-route-classifier";
import { describe, expect, it } from "vitest";

describe("classifyServerRoute", () => {
  it("classifies GET /health as health_ok", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, SERVER_PATH.HEALTH);
    expect(result).toEqual({ kind: SERVER_ROUTE_CLASSIFICATION.HEALTH_OK });
  });

  it("classifies GET /health with trailing-query suffix as health_ok", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/health/?check=true");
    expect(result).toEqual({ kind: SERVER_ROUTE_CLASSIFICATION.HEALTH_OK });
  });

  it("classifies GET /health with trailing-hash suffix as health_ok", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/health/#summary");
    expect(result).toEqual({ kind: SERVER_ROUTE_CLASSIFICATION.HEALTH_OK });
  });

  it("classifies lowercase method core routes", () => {
    const result = classifyServerRoute("get", SERVER_PATH.HEALTH);
    expect(result).toEqual({ kind: SERVER_ROUTE_CLASSIFICATION.HEALTH_OK });
  });

  it("classifies known api/core routes with lowercase/padded methods consistently", () => {
    const paddedHealthGetResult = classifyServerRoute(" get ", SERVER_PATH.HEALTH);
    const lowerHealthPostResult = classifyServerRoute("post", "/health");
    const paddedSessionsGetResult = classifyServerRoute(" get ", "/sessions");
    const lowerSessionsPostResult = classifyServerRoute("post", "/sessions");
    const paddedPromptPostResult = classifyServerRoute(" post ", "/sessions/session-1/prompt");
    const lowerPromptGetResult = classifyServerRoute("get", "/sessions/session-1/prompt");
    const paddedMessagesGetResult = classifyServerRoute(" get ", "/sessions/session-1/messages");
    const lowerMessagesPostResult = classifyServerRoute("post", "/sessions/session-1/messages");
    const paddedApiConfigGetResult = classifyServerRoute(" get ", "/api/config");
    const lowerApiSubmitPostResult = classifyServerRoute("post", "/api/tui/submit-prompt");
    const paddedApiConfigPostResult = classifyServerRoute(" post ", "/api/config");
    const lowerApiSubmitGetResult = classifyServerRoute("get", "/api/tui/submit-prompt");
    expect(paddedHealthGetResult).toEqual({ kind: SERVER_ROUTE_CLASSIFICATION.HEALTH_OK });
    expect(lowerHealthPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(paddedSessionsGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(lowerSessionsPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(paddedPromptPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(lowerPromptGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(paddedMessagesGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(lowerMessagesPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(paddedApiConfigGetResult.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
    expect(lowerApiSubmitPostResult.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
    expect(paddedApiConfigPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(lowerApiSubmitGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unsupported core methods as method_not_allowed", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, SERVER_PATH.SESSIONS);
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unsupported core methods on trailing-query routes as method_not_allowed", () => {
    const healthResult = classifyServerRoute(HTTP_METHOD.POST, "/health/?check=true");
    const sessionsResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/?scope=all");
    const promptResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions/session-1/prompt/?scope=all"
    );
    const messagesResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1/messages/?scope=all"
    );
    expect(healthResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(sessionsResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unsupported core methods on trailing-hash routes as method_not_allowed", () => {
    const healthResult = classifyServerRoute(HTTP_METHOD.POST, "/health/#summary");
    const sessionsResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/#summary");
    const promptResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt/#latest");
    const messagesResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1/messages/#tail"
    );
    expect(healthResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(sessionsResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies known routes with double-trailing suffix variants", () => {
    const healthResult = classifyServerRoute(HTTP_METHOD.POST, "/health//");
    const healthQueryResult = classifyServerRoute(HTTP_METHOD.POST, "/health//?check=true");
    const healthHashResult = classifyServerRoute(HTTP_METHOD.POST, "/health//#summary");
    const sessionsResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions//");
    const sessionsPostResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions//");
    const promptResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1/prompt//");
    const promptQueryResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions/session-1/prompt//?scope=all"
    );
    const promptHashResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions/session-1/prompt//#latest"
    );
    const messagesResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1/messages//");
    const messagesQueryResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1/messages//?scope=all"
    );
    const messagesHashResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1/messages//#tail"
    );
    const apiConfigResult = classifyServerRoute(HTTP_METHOD.POST, "/api/config//");
    const apiConfigQueryResult = classifyServerRoute(HTTP_METHOD.POST, "/api/config//?scope=all");
    const apiConfigHashResult = classifyServerRoute(HTTP_METHOD.POST, "/api/config//#summary");
    const apiExecuteResult = classifyServerRoute(HTTP_METHOD.GET, "/api/tui/execute-command//");
    const apiExecuteQueryResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api/tui/execute-command//?scope=all"
    );
    const apiExecuteHashResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api/tui/execute-command//#summary"
    );
    expect(healthResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(healthQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(healthHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(sessionsResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(sessionsPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(apiConfigResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(apiConfigQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(apiConfigHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(apiExecuteResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(apiExecuteQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(apiExecuteHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies blank-session base variants with /sessions method semantics", () => {
    const getDoubleTrailingResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions//");
    const getDoubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//?scope=all"
    );
    const getDoubleTrailingHashResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions//#summary");
    const postDoubleTrailingResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions//");
    const postDoubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//?scope=all"
    );
    const postDoubleTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//#summary"
    );
    expect(getDoubleTrailingResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(getDoubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(getDoubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postDoubleTrailingResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postDoubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postDoubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies whitespace-padded blank-session base variants with /sessions method semantics", () => {
    const getDoubleTrailingResult = classifyServerRoute(HTTP_METHOD.GET, " /sessions// ");
    const getDoubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /sessions//?scope=all "
    );
    const getDoubleTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /sessions//#summary "
    );
    const postDoubleTrailingResult = classifyServerRoute(HTTP_METHOD.POST, " /sessions// ");
    const postDoubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /sessions//?scope=all "
    );
    const postDoubleTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /sessions//#summary "
    );
    expect(getDoubleTrailingResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(getDoubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(getDoubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postDoubleTrailingResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postDoubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postDoubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies api matches with handler + params", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/api/config");
    expect(result.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
    if (result.kind === SERVER_ROUTE_CLASSIFICATION.API_MATCH) {
      expect(result.params).toEqual({});
      expect(typeof result.handler).toBe("function");
    }
  });

  it("classifies api matches when pathname has surrounding whitespace", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, " /api/config ");
    expect(result.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
  });

  it("classifies api matches when pathname includes query or hash suffixes", () => {
    const queryResult = classifyServerRoute(HTTP_METHOD.GET, "/api/config?view=compact");
    const hashResult = classifyServerRoute(HTTP_METHOD.GET, "/api/config#summary");
    expect(queryResult.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
    expect(hashResult.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
  });

  it("classifies api matches when pathname includes trailing slash", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/api/config/");
    expect(result.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
  });

  it("classifies api matches with combined trailing-slash and query suffixes", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/api/config/?view=compact");
    expect(result.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
  });

  it("classifies api matches with combined trailing-slash and hash suffixes", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/api/config/#summary");
    expect(result.kind).toBe(SERVER_ROUTE_CLASSIFICATION.API_MATCH);
  });

  it("classifies padded api known paths with wrong method as method_not_allowed", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, " /api/config ");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies query/hash suffixed known api paths with wrong method", () => {
    const queryResult = classifyServerRoute(HTTP_METHOD.POST, "/api/config?view=compact");
    const hashResult = classifyServerRoute(HTTP_METHOD.POST, "/api/config#summary");
    expect(queryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies trailing-slash known api paths with wrong method", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api/config/");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies combined trailing-slash and query known api paths with wrong method", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api/config/?view=compact");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies combined trailing-slash and hash known api paths with wrong method", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api/config/#summary");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unsupported api methods as method_not_allowed", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api/config");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies non-api/non-core routes as unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies root unknown routes with query/hash suffixes as unhandled", () => {
    const rootGetResult = classifyServerRoute(HTTP_METHOD.GET, "/");
    const rootPostResult = classifyServerRoute(HTTP_METHOD.POST, "/");
    const queryGetResult = classifyServerRoute(HTTP_METHOD.GET, "/?scope=all");
    const queryPostResult = classifyServerRoute(HTTP_METHOD.POST, "/?scope=all");
    const hashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/#summary");
    const hashPostResult = classifyServerRoute(HTTP_METHOD.POST, "/#summary");
    expect(rootGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(rootPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(queryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(queryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(hashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(hashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown core routes with trailing-query suffix as unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown/?scope=all");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown/?scope=all");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown core routes with direct-query suffix as unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown-endpoint?scope=all");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown-endpoint?scope=all");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown core routes with trailing-hash suffix as unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown/#summary");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown/#summary");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown single-segment trailing and double-trailing variants as unhandled", () => {
    const trailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown/");
    const trailingPostResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown/");
    const doubleTrailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown//");
    const doubleTrailingPostResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown//");
    const doubleTrailingQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/unknown//?scope=all"
    );
    const doubleTrailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/unknown//?scope=all"
    );
    const doubleTrailingHashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown//#summary");
    const doubleTrailingHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/unknown//#summary"
    );
    expect(trailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(trailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown-endpoint trailing slash variants as unhandled", () => {
    const trailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown-endpoint/");
    const trailingPostResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown-endpoint/");
    const trailingQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/unknown-endpoint/?scope=all"
    );
    const trailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/unknown-endpoint/?scope=all"
    );
    const trailingHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/unknown-endpoint/#summary"
    );
    const trailingHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/unknown-endpoint/#summary"
    );
    expect(trailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(trailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(trailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(trailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(trailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(trailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown core routes with double-trailing slash variants as unhandled", () => {
    const baseResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown-endpoint//");
    const basePostResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown-endpoint//");
    const queryResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown-endpoint//?scope=all");
    const queryPostResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown-endpoint//?scope=all");
    const hashResult = classifyServerRoute(HTTP_METHOD.GET, "/unknown-endpoint//#summary");
    const hashPostResult = classifyServerRoute(HTTP_METHOD.POST, "/unknown-endpoint//#summary");
    expect(baseResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(basePostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(queryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(queryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(hashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(hashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies whitespace-padded unknown core and malformed session variants as core unhandled", () => {
    const unknownQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /unknown-endpoint//?scope=all "
    );
    const unknownHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /unknown-endpoint//#summary "
    );
    const missingActionHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /sessions/session-1//#latest "
    );
    const missingActionQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /sessions/session-1//?view=full "
    );
    const blankPromptHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /sessions//prompt//#summary "
    );
    const blankMessagesQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /sessions//messages//?tail=1 "
    );
    expect(unknownQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(unknownHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(missingActionHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(missingActionQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(blankPromptHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(blankMessagesQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies missing-action session base and direct-hash paths as core unhandled", () => {
    const baseGetResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1");
    const basePostResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1");
    const trailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1/");
    const trailingPostResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1/");
    const hashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1#latest");
    const hashPostResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1#latest");
    expect(baseGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(basePostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(trailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(trailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(hashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(hashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies missing-action session routes with trailing-query suffix as core unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1/?view=full");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1/?view=full");
    const doubleTrailingGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions/session-1//?view=full"
    );
    const doubleTrailingPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1//?view=full"
    );
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies missing-action session routes with direct-query suffix as core unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1?view=full");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1?view=full");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies missing-action session routes with trailing-hash suffix as core unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1/#latest");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1/#latest");
    const doubleTrailingGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions/session-1//#latest"
    );
    const doubleTrailingPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions/session-1//#latest"
    );
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies missing-action session routes with double-trailing base path as core unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1//");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1//");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies /api root path as api-scoped unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/api");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/api");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies /api root path with query/hash suffixes as api-scoped unhandled", () => {
    const queryResult = classifyServerRoute(HTTP_METHOD.GET, "/api?scope=all");
    const queryPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api?scope=all");
    const hashResult = classifyServerRoute(HTTP_METHOD.GET, "/api#summary");
    const hashPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api#summary");
    expect(queryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(queryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies /api trailing-slash query forms as api-scoped unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/api/?scope=all");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/api/?scope=all");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies /api trailing-slash hash forms as api-scoped unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/api/#summary");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/api/#summary");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies /api double-trailing forms as api-scoped unhandled", () => {
    const baseResult = classifyServerRoute(HTTP_METHOD.GET, "/api//");
    const basePostResult = classifyServerRoute(HTTP_METHOD.POST, "/api//");
    const queryResult = classifyServerRoute(HTTP_METHOD.GET, "/api//?scope=all");
    const queryPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api//?scope=all");
    const hashResult = classifyServerRoute(HTTP_METHOD.GET, "/api//#summary");
    const hashPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api//#summary");
    expect(baseResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(basePostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(queryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(queryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies whitespace-padded /api root malformed forms as api-scoped unhandled", () => {
    const paddedBaseGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api ");
    const paddedBasePostResult = classifyServerRoute(HTTP_METHOD.POST, " /api ");
    const paddedQueryGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api?scope=all ");
    const paddedQueryPostResult = classifyServerRoute(HTTP_METHOD.POST, " /api?scope=all ");
    const paddedHashGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api#summary ");
    const paddedHashPostResult = classifyServerRoute(HTTP_METHOD.POST, " /api#summary ");
    const paddedTrailingGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api/ ");
    const paddedTrailingPostResult = classifyServerRoute(HTTP_METHOD.POST, " /api/ ");
    const paddedTrailingQueryGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api/?scope=all ");
    const paddedTrailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api/?scope=all "
    );
    const paddedTrailingHashGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api/#summary ");
    const paddedTrailingHashPostResult = classifyServerRoute(HTTP_METHOD.POST, " /api/#summary ");
    const paddedDoubleTrailingGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api// ");
    const paddedDoubleTrailingPostResult = classifyServerRoute(HTTP_METHOD.POST, " /api// ");
    const paddedDoubleTrailingQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api//?scope=all "
    );
    const paddedDoubleTrailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api//?scope=all "
    );
    const paddedDoubleTrailingHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api//#summary "
    );
    const paddedDoubleTrailingHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api//#summary "
    );
    expect(paddedBaseGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedBasePostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedTrailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedTrailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedTrailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedTrailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown api routes as unhandled with api handler id", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/api/unknown");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/api/unknown");
    const queryGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/unknown?scope=all");
    const queryPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api/unknown?scope=all");
    const hashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/unknown#summary");
    const hashPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api/unknown#summary");
    const trailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/unknown/");
    const trailingPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api/unknown/");
    const trailingQueryGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/unknown/?scope=all");
    const trailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/api/unknown/?scope=all"
    );
    const trailingHashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/unknown/#summary");
    const trailingHashPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api/unknown/#summary");
    const doubleTrailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/unknown//");
    const doubleTrailingPostResult = classifyServerRoute(HTTP_METHOD.POST, "/api/unknown//");
    const doubleTrailingQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api/unknown//?scope=all"
    );
    const doubleTrailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/api/unknown//?scope=all"
    );
    const doubleTrailingHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api/unknown//#summary"
    );
    const doubleTrailingHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/api/unknown//#summary"
    );
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(queryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(queryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown api/core routes with lowercase/padded methods by scope", () => {
    const apiUnknownGetResult = classifyServerRoute(" get ", "/api/does-not-exist");
    const apiMalformedPostResult = classifyServerRoute("post", "/api//config");
    const apiMalformedDeleteResult = classifyServerRoute(" delete ", "/api/sessions//messages");
    const coreUnknownGetResult = classifyServerRoute(" get ", "/unknown-endpoint//#summary");
    const coreMalformedPostResult = classifyServerRoute("post", "/sessions//prompt//#summary");
    const coreMissingActionGetResult = classifyServerRoute(
      " get ",
      "/sessions/session-1//?view=full"
    );
    expect(apiUnknownGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(apiMalformedPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(apiMalformedDeleteResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(coreUnknownGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(coreMalformedPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(coreMissingActionGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies whitespace-padded unknown api route variants as api-scoped unhandled", () => {
    const paddedTrailingGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api/unknown/ ");
    const paddedTrailingPostResult = classifyServerRoute(HTTP_METHOD.POST, " /api/unknown/ ");
    const paddedDoubleTrailingGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api/unknown// ");
    const paddedDoubleTrailingPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api/unknown// "
    );
    const paddedDoubleTrailingQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api/unknown//?scope=all "
    );
    const paddedDoubleTrailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api/unknown//?scope=all "
    );
    const paddedDoubleTrailingHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api/unknown//#summary "
    );
    const paddedDoubleTrailingHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api/unknown//#summary "
    );
    expect(paddedTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedDoubleTrailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies whitespace-padded malformed api double-segment paths as api-scoped unhandled", () => {
    const paddedConfigGetResult = classifyServerRoute(HTTP_METHOD.GET, " /api//config ");
    const paddedConfigPostResult = classifyServerRoute(HTTP_METHOD.POST, " /api//config ");
    const paddedConfigQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api//config/?scope=all "
    );
    const paddedConfigQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api//config/?scope=all "
    );
    const paddedConfigHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api//config//#summary "
    );
    const paddedConfigHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api//config//#summary "
    );
    const paddedMessagesGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api/sessions//messages "
    );
    const paddedMessagesPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api/sessions//messages "
    );
    const paddedMessagesQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api/sessions//messages/?scope=all "
    );
    const paddedMessagesQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api/sessions//messages/?scope=all "
    );
    const paddedMessagesHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      " /api/sessions//messages//#summary "
    );
    const paddedMessagesHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      " /api/sessions//messages//#summary "
    );
    expect(paddedConfigGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedConfigPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedConfigQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedConfigQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedConfigHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedConfigHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedMessagesGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedMessagesPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedMessagesQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedMessagesQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedMessagesHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(paddedMessagesHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies malformed api double-segment paths as api-scoped unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/api//config");
    const trailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api//config/");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/api//config?scope=all");
    const directQueryGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api//config?scope=all");
    const trailingQueryGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api//config/?scope=all");
    const hashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api//config#summary");
    const trailingHashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api//config/#summary");
    const doubleTrailingResult = classifyServerRoute(HTTP_METHOD.POST, "/api//config//");
    const doubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/api//config//?scope=all"
    );
    const doubleTrailingQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api//config//?scope=all"
    );
    const doubleTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/api//config//#summary"
    );
    const doubleTrailingHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api//config//#summary"
    );
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(directQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies malformed api session direct-query paths as api-scoped unhandled", () => {
    const baseGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/sessions//messages");
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api/sessions//messages?scope=all");
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/api/sessions//messages?scope=all");
    const trailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/sessions//messages/");
    expect(baseGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies malformed api session trailing-query paths as api-scoped unhandled", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api/sessions//messages/?scope=all");
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/api/sessions//messages/?scope=all");
    const doubleTrailingResult = classifyServerRoute(HTTP_METHOD.POST, "/api/sessions//messages//");
    const doubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/api/sessions//messages//?scope=all"
    );
    const getDoubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api/sessions//messages//?scope=all"
    );
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(getDoubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies malformed api session hash and trailing-hash paths as api-scoped unhandled", () => {
    const hashResult = classifyServerRoute(HTTP_METHOD.POST, "/api/sessions//messages#summary");
    const hashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/api/sessions//messages#summary");
    const trailingHashResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/api/sessions//messages/#summary"
    );
    const trailingHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api/sessions//messages/#summary"
    );
    const doubleTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/api/sessions//messages//#summary"
    );
    const getDoubleTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/api/sessions//messages//#summary"
    );
    expect(hashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(trailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(doubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(getDoubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies blank-session prompt direct-query paths as core unhandled", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/sessions//prompt?tail=1");
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions//prompt?tail=1");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies blank-session prompt/messages hash and trailing variants as core unhandled", () => {
    const promptGetResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions//prompt");
    const promptTrailingPostResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions//prompt/");
    const promptTrailingGetResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions//prompt/");
    const promptHashResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions//prompt#summary");
    const promptHashGetResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions//prompt#summary");
    const promptTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//prompt/#summary"
    );
    const promptTrailingHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//prompt/#summary"
    );
    const promptDoubleTrailingResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions//prompt//");
    const promptTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//prompt/?tail=1"
    );
    const promptTrailingQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//prompt/?tail=1"
    );
    const promptDoubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//prompt//?tail=1"
    );
    const promptDoubleTrailingQueryGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//prompt//?tail=1"
    );
    const promptDoubleTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//prompt//#summary"
    );
    const promptDoubleTrailingHashGetResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//prompt//#summary"
    );
    const messagesHashResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions//messages#summary");
    const messagesHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//messages#summary"
    );
    const messagesTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//messages/#summary"
    );
    const messagesTrailingHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//messages/#summary"
    );
    const messagesDoubleTrailingResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//messages//"
    );
    const messagesDoubleTrailingPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//messages//"
    );
    const messagesDoubleTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//messages//?tail=1"
    );
    const messagesDoubleTrailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//messages//?tail=1"
    );
    const messagesDoubleTrailingHashResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//messages//#summary"
    );
    const messagesDoubleTrailingHashPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//messages//#summary"
    );
    const messagesTrailingQueryResult = classifyServerRoute(
      HTTP_METHOD.GET,
      "/sessions//messages/?tail=1"
    );
    const messagesTrailingQueryPostResult = classifyServerRoute(
      HTTP_METHOD.POST,
      "/sessions//messages/?tail=1"
    );
    const messagesBasePostResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions//messages");
    expect(promptGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptTrailingGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptTrailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptDoubleTrailingResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptTrailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptDoubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptDoubleTrailingQueryGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptDoubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(promptDoubleTrailingHashGetResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesTrailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesDoubleTrailingResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesDoubleTrailingPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesDoubleTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesDoubleTrailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesDoubleTrailingHashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesDoubleTrailingHashPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesTrailingQueryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesTrailingQueryPostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
    expect(messagesBasePostResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies malformed api double-segment trailing-query paths as api-scoped unhandled", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api//config/?scope=all");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies malformed api double-segment trailing-hash paths as api-scoped unhandled", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api//config/#summary");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });
});

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

  it("classifies lowercase method core routes", () => {
    const result = classifyServerRoute("get", SERVER_PATH.HEALTH);
    expect(result).toEqual({ kind: SERVER_ROUTE_CLASSIFICATION.HEALTH_OK });
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

  it("classifies unsupported api methods as method_not_allowed", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api/config");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies non-api/non-core routes as unhandled", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/unknown");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown core routes with trailing-query suffix as unhandled", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/unknown/?scope=all");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.CORE_ROUTE_CLASSIFIER,
    });
  });

  it("classifies missing-action session routes with trailing-query suffix as core unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/sessions/session-1/?view=full");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/sessions/session-1/?view=full");
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
    const result = classifyServerRoute(HTTP_METHOD.GET, "/api");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies /api root path with query/hash suffixes as api-scoped unhandled", () => {
    const queryResult = classifyServerRoute(HTTP_METHOD.GET, "/api?scope=all");
    const hashResult = classifyServerRoute(HTTP_METHOD.GET, "/api#summary");
    expect(queryResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(hashResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies /api trailing-slash query forms as api-scoped unhandled", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/api/?scope=all");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies unknown api routes as unhandled with api handler id", () => {
    const result = classifyServerRoute(HTTP_METHOD.GET, "/api/unknown");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies malformed api double-segment paths as api-scoped unhandled", () => {
    const getResult = classifyServerRoute(HTTP_METHOD.GET, "/api//config");
    const postResult = classifyServerRoute(HTTP_METHOD.POST, "/api//config?scope=all");
    expect(getResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
    expect(postResult).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });

  it("classifies malformed api double-segment trailing-query paths as api-scoped unhandled", () => {
    const result = classifyServerRoute(HTTP_METHOD.POST, "/api//config/?scope=all");
    expect(result).toEqual({
      kind: SERVER_ROUTE_CLASSIFICATION.UNHANDLED,
      classifierHandler: SERVER_ROUTE_HANDLER.API_ROUTE_CLASSIFIER,
    });
  });
});

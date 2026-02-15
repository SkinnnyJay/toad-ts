import { SERVER_ROUTE_CLASSIFIER_HANDLER } from "@/constants/server-route-classifier-handlers";
import { API_ROUTE_CLASSIFICATION, classifyApiRoute, matchRoute } from "@/server/api-routes";
import { describe, expect, it } from "vitest";

describe("API Routes", () => {
  describe("matchRoute", () => {
    it("should match GET /api/sessions", () => {
      const result = matchRoute("GET", "/api/sessions");
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });

    it("should match GET /api/sessions/:id", () => {
      const result = matchRoute("GET", "/api/sessions/session-123");
      expect(result).not.toBeNull();
      expect(result?.params.id).toBe("session-123");
    });

    it("should match DELETE /api/sessions/:id", () => {
      const result = matchRoute("DELETE", "/api/sessions/session-456");
      expect(result).not.toBeNull();
      expect(result?.params.id).toBe("session-456");
    });

    it("should match GET /api/sessions/:id/messages", () => {
      const result = matchRoute("GET", "/api/sessions/session-789/messages");
      expect(result).not.toBeNull();
      expect(result?.params.id).toBe("session-789");
    });

    it("should match GET /api/config", () => {
      const result = matchRoute("GET", "/api/config");
      expect(result).not.toBeNull();
    });

    it("should match GET /api/agents", () => {
      const result = matchRoute("GET", "/api/agents");
      expect(result).not.toBeNull();
    });

    it("should match GET /api/events (SSE)", () => {
      const result = matchRoute("GET", "/api/events");
      expect(result).not.toBeNull();
    });

    it("should match POST /api/tui/append-prompt", () => {
      const result = matchRoute("POST", "/api/tui/append-prompt");
      expect(result).not.toBeNull();
    });

    it("should match POST /api/tui/submit-prompt", () => {
      const result = matchRoute("POST", "/api/tui/submit-prompt");
      expect(result).not.toBeNull();
    });

    it("should match POST /api/tui/execute-command", () => {
      const result = matchRoute("POST", "/api/tui/execute-command");
      expect(result).not.toBeNull();
    });

    it("should match routes for lowercase and padded methods", () => {
      const lower = matchRoute("get", "/api/config");
      const padded = matchRoute(" post ", "/api/tui/submit-prompt");
      expect(lower).not.toBeNull();
      expect(padded).not.toBeNull();
    });

    it("should match routes when pathname has surrounding whitespace", () => {
      const result = matchRoute("GET", " /api/config ");
      expect(result).not.toBeNull();
    });

    it("should match routes when pathname includes query or hash suffixes", () => {
      const queryResult = matchRoute("GET", "/api/config?view=compact");
      const hashResult = matchRoute("GET", "/api/config#summary");
      expect(queryResult).not.toBeNull();
      expect(hashResult).not.toBeNull();
    });

    it("should match routes when pathname includes trailing slashes", () => {
      const result = matchRoute("GET", "/api/config/");
      expect(result).not.toBeNull();
    });

    it("should match routes with combined trailing-slash and query suffixes", () => {
      const result = matchRoute("GET", "/api/config/?view=compact");
      expect(result).not.toBeNull();
    });

    it("should match routes with combined trailing-slash and hash suffixes", () => {
      const result = matchRoute("GET", "/api/config/#summary");
      expect(result).not.toBeNull();
    });

    it("should match execute and session-message routes with trailing-hash suffixes", () => {
      const executeResult = matchRoute("POST", "/api/tui/execute-command/#summary");
      const messagesResult = matchRoute("GET", "/api/sessions/session-123/messages/#latest");
      expect(executeResult).not.toBeNull();
      expect(messagesResult).not.toBeNull();
    });

    it("should return null for unknown routes", () => {
      expect(matchRoute("GET", "/api/unknown")).toBeNull();
      expect(matchRoute("PUT", "/api/sessions")).toBeNull();
    });
  });

  describe("classifyApiRoute", () => {
    it("classifies known path with matching method as match", () => {
      const result = classifyApiRoute("GET", "/api/config");
      expect(result.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
    });

    it("classifies lowercase methods with matching routes as match", () => {
      const result = classifyApiRoute("get", "/api/config");
      expect(result.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
    });

    it("classifies padded pathnames with matching routes as match", () => {
      const result = classifyApiRoute("GET", " /api/config ");
      expect(result.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
    });

    it("classifies query/hash suffixed pathnames with matching routes as match", () => {
      const queryResult = classifyApiRoute("GET", "/api/config?view=compact");
      const hashResult = classifyApiRoute("GET", "/api/config#summary");
      expect(queryResult.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
      expect(hashResult.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
    });

    it("classifies trailing-slash pathnames with matching routes as match", () => {
      const result = classifyApiRoute("GET", "/api/config/");
      expect(result.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
    });

    it("classifies combined trailing-slash and query pathnames with matching routes as match", () => {
      const result = classifyApiRoute("GET", "/api/config/?view=compact");
      expect(result.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
    });

    it("classifies combined trailing-slash and hash pathnames with matching routes as match", () => {
      const result = classifyApiRoute("GET", "/api/config/#summary");
      expect(result.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
    });

    it("classifies trailing-hash execute and session-message routes as match", () => {
      const executeResult = classifyApiRoute("POST", "/api/tui/execute-command/#summary");
      const messagesResult = classifyApiRoute("GET", "/api/sessions/session-123/messages/#latest");
      expect(executeResult.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
      expect(messagesResult.kind).toBe(API_ROUTE_CLASSIFICATION.MATCH);
    });

    it("classifies known path with unsupported method as method not allowed", () => {
      const result = classifyApiRoute("POST", "/api/config");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies padded known path with unsupported method as method not allowed", () => {
      const result = classifyApiRoute("POST", " /api/config ");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies query/hash suffixed known path with unsupported method", () => {
      const queryResult = classifyApiRoute("POST", "/api/config?view=compact");
      const hashResult = classifyApiRoute("POST", "/api/config#summary");
      expect(queryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies trailing-slash known path with unsupported method", () => {
      const result = classifyApiRoute("POST", "/api/config/");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies combined trailing-slash and query known path with unsupported method", () => {
      const result = classifyApiRoute("POST", "/api/config/?view=compact");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies combined trailing-slash and hash known path with unsupported method", () => {
      const result = classifyApiRoute("POST", "/api/config/#summary");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies trailing-hash execute route with unsupported method", () => {
      const result = classifyApiRoute("GET", "/api/tui/execute-command/#summary");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies parameterized known paths with unsupported methods", () => {
      const sessionResult = classifyApiRoute("POST", "/api/sessions/session-123");
      const messagesResult = classifyApiRoute("POST", "/api/sessions/session-123/messages");
      expect(sessionResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies parameterized known paths with normalized suffix variants", () => {
      const queryResult = classifyApiRoute("POST", "/api/sessions/session-123?view=compact");
      const hashResult = classifyApiRoute("POST", "/api/sessions/session-123/messages#latest");
      const trailingResult = classifyApiRoute("POST", "/api/sessions/session-123/messages/");
      const trailingQueryResult = classifyApiRoute(
        "POST",
        "/api/sessions/session-123/messages/?view=compact"
      );
      const trailingHashResult = classifyApiRoute(
        "POST",
        "/api/sessions/session-123/messages/#latest"
      );
      expect(queryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies unknown path as not found", () => {
      const getResult = classifyApiRoute("GET", "/api/does-not-exist");
      const postResult = classifyApiRoute("POST", "/api/does-not-exist");
      expect(getResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(postResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies padded unknown path as not found", () => {
      const getResult = classifyApiRoute("GET", " /api/does-not-exist ");
      const postResult = classifyApiRoute("POST", " /api/does-not-exist ");
      expect(getResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(postResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies query/hash suffixed unknown path as not found", () => {
      const queryResult = classifyApiRoute("GET", "/api/does-not-exist?view=compact");
      const queryPostResult = classifyApiRoute("POST", "/api/does-not-exist?view=compact");
      const hashResult = classifyApiRoute("GET", "/api/does-not-exist#summary");
      const hashPostResult = classifyApiRoute("POST", "/api/does-not-exist#summary");
      const trailingQueryResult = classifyApiRoute("GET", "/api/does-not-exist/?view=compact");
      const trailingQueryPostResult = classifyApiRoute("POST", "/api/does-not-exist/?view=compact");
      const trailingHashResult = classifyApiRoute("GET", "/api/does-not-exist/#summary");
      const trailingHashPostResult = classifyApiRoute("POST", "/api/does-not-exist/#summary");
      expect(queryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(queryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingQueryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingHashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies unknown path trailing and double-trailing forms as not found", () => {
      const trailingGetResult = classifyApiRoute("GET", "/api/does-not-exist/");
      const trailingPostResult = classifyApiRoute("POST", "/api/does-not-exist/");
      const doubleTrailingGetResult = classifyApiRoute("GET", "/api/does-not-exist//");
      const doubleTrailingPostResult = classifyApiRoute("POST", "/api/does-not-exist//");
      const doubleTrailingQueryGetResult = classifyApiRoute(
        "GET",
        "/api/does-not-exist//?view=compact"
      );
      const doubleTrailingQueryPostResult = classifyApiRoute(
        "POST",
        "/api/does-not-exist//?view=compact"
      );
      const doubleTrailingHashGetResult = classifyApiRoute("GET", "/api/does-not-exist//#summary");
      const doubleTrailingHashPostResult = classifyApiRoute(
        "POST",
        "/api/does-not-exist//#summary"
      );
      expect(trailingGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingQueryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingHashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies whitespace-padded unknown trailing and double-trailing forms as not found", () => {
      const paddedTrailingGetResult = classifyApiRoute("GET", " /api/does-not-exist/ ");
      const paddedTrailingPostResult = classifyApiRoute("POST", " /api/does-not-exist/ ");
      const paddedDoubleTrailingGetResult = classifyApiRoute("GET", " /api/does-not-exist// ");
      const paddedDoubleTrailingPostResult = classifyApiRoute("POST", " /api/does-not-exist// ");
      const paddedDoubleTrailingQueryGetResult = classifyApiRoute(
        "GET",
        " /api/does-not-exist//?view=compact "
      );
      const paddedDoubleTrailingQueryPostResult = classifyApiRoute(
        "POST",
        " /api/does-not-exist//?view=compact "
      );
      const paddedDoubleTrailingHashGetResult = classifyApiRoute(
        "GET",
        " /api/does-not-exist//#summary "
      );
      const paddedDoubleTrailingHashPostResult = classifyApiRoute(
        "POST",
        " /api/does-not-exist//#summary "
      );
      expect(paddedTrailingGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedTrailingPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingQueryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingHashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies api-root trailing-query path as not found", () => {
      const getResult = classifyApiRoute("GET", "/api/?scope=all");
      const postResult = classifyApiRoute("POST", "/api/?scope=all");
      expect(getResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(postResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies api-root direct forms as not found", () => {
      const baseGetResult = classifyApiRoute("GET", "/api");
      const basePostResult = classifyApiRoute("POST", "/api");
      const queryGetResult = classifyApiRoute("GET", "/api?scope=all");
      const queryPostResult = classifyApiRoute("POST", "/api?scope=all");
      const hashGetResult = classifyApiRoute("GET", "/api#summary");
      const hashPostResult = classifyApiRoute("POST", "/api#summary");
      expect(baseGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(basePostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(queryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(queryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies api-root trailing-hash path as not found", () => {
      const getResult = classifyApiRoute("GET", "/api/#summary");
      const postResult = classifyApiRoute("POST", "/api/#summary");
      expect(getResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(postResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies api-root double-trailing forms as not found", () => {
      const baseResult = classifyApiRoute("GET", "/api//");
      const basePostResult = classifyApiRoute("POST", "/api//");
      const queryResult = classifyApiRoute("GET", "/api//?scope=all");
      const queryPostResult = classifyApiRoute("POST", "/api//?scope=all");
      const hashResult = classifyApiRoute("GET", "/api//#summary");
      const hashPostResult = classifyApiRoute("POST", "/api//#summary");
      expect(baseResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(basePostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(queryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(queryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies whitespace-padded api-root malformed forms as not found", () => {
      const paddedBaseGetResult = classifyApiRoute("GET", " /api ");
      const paddedBasePostResult = classifyApiRoute("POST", " /api ");
      const paddedQueryGetResult = classifyApiRoute("GET", " /api?scope=all ");
      const paddedQueryPostResult = classifyApiRoute("POST", " /api?scope=all ");
      const paddedHashGetResult = classifyApiRoute("GET", " /api#summary ");
      const paddedHashPostResult = classifyApiRoute("POST", " /api#summary ");
      const paddedTrailingGetResult = classifyApiRoute("GET", " /api/ ");
      const paddedTrailingPostResult = classifyApiRoute("POST", " /api/ ");
      const paddedTrailingQueryGetResult = classifyApiRoute("GET", " /api/?scope=all ");
      const paddedTrailingQueryPostResult = classifyApiRoute("POST", " /api/?scope=all ");
      const paddedTrailingHashGetResult = classifyApiRoute("GET", " /api/#summary ");
      const paddedTrailingHashPostResult = classifyApiRoute("POST", " /api/#summary ");
      const paddedDoubleTrailingGetResult = classifyApiRoute("GET", " /api// ");
      const paddedDoubleTrailingPostResult = classifyApiRoute("POST", " /api// ");
      const paddedDoubleTrailingQueryGetResult = classifyApiRoute("GET", " /api//?scope=all ");
      const paddedDoubleTrailingQueryPostResult = classifyApiRoute("POST", " /api//?scope=all ");
      const paddedDoubleTrailingHashGetResult = classifyApiRoute("GET", " /api//#summary ");
      const paddedDoubleTrailingHashPostResult = classifyApiRoute("POST", " /api//#summary ");
      expect(paddedBaseGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedBasePostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedQueryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedHashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedTrailingGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedTrailingPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedTrailingQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedTrailingQueryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedTrailingHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedTrailingHashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingQueryPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(paddedDoubleTrailingHashPostResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies malformed double-segment api paths as not found", () => {
      const configResult = classifyApiRoute("POST", "/api//config");
      const configGetResult = classifyApiRoute("GET", "/api//config");
      const trailingConfigGetResult = classifyApiRoute("GET", "/api//config/");
      const messagesResult = classifyApiRoute("POST", "/api/sessions//messages");
      const messagesGetResult = classifyApiRoute("GET", "/api/sessions//messages");
      const messagesTrailingGetResult = classifyApiRoute("GET", "/api/sessions//messages/");
      const messagesQueryResult = classifyApiRoute("POST", "/api/sessions//messages?scope=all");
      const messagesQueryGetResult = classifyApiRoute("GET", "/api/sessions//messages?scope=all");
      const messagesHashResult = classifyApiRoute("POST", "/api/sessions//messages#summary");
      const messagesHashGetResult = classifyApiRoute("GET", "/api/sessions//messages#summary");
      const messagesTrailingQueryResult = classifyApiRoute(
        "POST",
        "/api/sessions//messages/?scope=all"
      );
      const messagesTrailingQueryGetResult = classifyApiRoute(
        "GET",
        "/api/sessions//messages/?scope=all"
      );
      const messagesTrailingHashResult = classifyApiRoute(
        "POST",
        "/api/sessions//messages/#summary"
      );
      const messagesTrailingHashGetResult = classifyApiRoute(
        "GET",
        "/api/sessions//messages/#summary"
      );
      const messagesDoubleTrailingResult = classifyApiRoute("POST", "/api/sessions//messages//");
      const messagesDoubleTrailingQueryResult = classifyApiRoute(
        "POST",
        "/api/sessions//messages//?scope=all"
      );
      const messagesDoubleTrailingHashResult = classifyApiRoute(
        "POST",
        "/api/sessions//messages//#summary"
      );
      const queryGetResult = classifyApiRoute("GET", "/api//config?scope=all");
      const trailingQueryResult = classifyApiRoute("POST", "/api//config/?scope=all");
      const trailingQueryGetResult = classifyApiRoute("GET", "/api//config/?scope=all");
      const trailingHashResult = classifyApiRoute("POST", "/api//config/#summary");
      const trailingHashGetResult = classifyApiRoute("GET", "/api//config/#summary");
      const doubleTrailingResult = classifyApiRoute("POST", "/api//config//");
      const doubleTrailingQueryResult = classifyApiRoute("POST", "/api//config//?scope=all");
      const doubleTrailingHashResult = classifyApiRoute("POST", "/api//config//#summary");
      const hashGetResult = classifyApiRoute("GET", "/api//config#summary");
      const doubleTrailingQueryGetResult = classifyApiRoute("GET", "/api//config//?scope=all");
      const doubleTrailingHashGetResult = classifyApiRoute("GET", "/api//config//#summary");
      const messagesDoubleTrailingQueryGetResult = classifyApiRoute(
        "GET",
        "/api/sessions//messages//?scope=all"
      );
      const messagesDoubleTrailingHashGetResult = classifyApiRoute(
        "GET",
        "/api/sessions//messages//#summary"
      );
      expect(configResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(configGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingConfigGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesTrailingGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesTrailingQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesTrailingQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesTrailingHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesTrailingHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesDoubleTrailingResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesDoubleTrailingQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesDoubleTrailingHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(queryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(doubleTrailingHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesDoubleTrailingQueryGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesDoubleTrailingHashGetResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });
  });
});

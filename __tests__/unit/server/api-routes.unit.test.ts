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
      const result = classifyApiRoute("GET", "/api/does-not-exist");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies padded unknown path as not found", () => {
      const result = classifyApiRoute("GET", " /api/does-not-exist ");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies query/hash suffixed unknown path as not found", () => {
      const queryResult = classifyApiRoute("GET", "/api/does-not-exist?view=compact");
      const hashResult = classifyApiRoute("GET", "/api/does-not-exist#summary");
      const trailingQueryResult = classifyApiRoute("GET", "/api/does-not-exist/?view=compact");
      const trailingHashResult = classifyApiRoute("GET", "/api/does-not-exist/#summary");
      expect(queryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(hashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies api-root trailing-query path as not found", () => {
      const result = classifyApiRoute("GET", "/api/?scope=all");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies api-root trailing-hash path as not found", () => {
      const result = classifyApiRoute("GET", "/api/#summary");
      expect(result).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });

    it("classifies malformed double-segment api paths as not found", () => {
      const configResult = classifyApiRoute("POST", "/api//config");
      const messagesResult = classifyApiRoute("POST", "/api/sessions//messages");
      const trailingQueryResult = classifyApiRoute("POST", "/api//config/?scope=all");
      const trailingHashResult = classifyApiRoute("POST", "/api//config/#summary");
      expect(configResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(messagesResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingQueryResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
      expect(trailingHashResult).toEqual({
        kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
        classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
      });
    });
  });
});

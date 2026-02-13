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

    it("classifies known path with unsupported method as method not allowed", () => {
      const result = classifyApiRoute("POST", "/api/config");
      expect(result).toEqual({
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
  });
});

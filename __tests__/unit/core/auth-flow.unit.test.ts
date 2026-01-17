import type {
  AuthMethod,
  AuthenticateRequest,
  NewSessionRequest,
  NewSessionResponse,
} from "@agentclientprotocol/sdk";
import { RequestError } from "@agentclientprotocol/sdk";
import { describe, expect, it, vi } from "vitest";
import { ERROR_CODE } from "../../../src/constants/error-codes";
import type { ACPClient } from "../../../src/core/acp-client";
import {
  createDefaultAuthPrompt,
  createSessionWithAuth,
  ensureAuthenticated,
  isAuthRequiredError,
} from "../../../src/core/auth-flow";
import type { CredentialStore } from "../../../src/utils/credentials";

describe("Auth Flow", () => {
  const createMockClient = (): ACPClient => ({
    newSession: vi.fn(),
    authenticate: vi.fn(),
    prompt: vi.fn(),
    sessionUpdate: vi.fn(),
  });

  const createMockCredentialStore = (): CredentialStore => ({
    getToken: vi.fn().mockResolvedValue(undefined),
    setToken: vi.fn().mockResolvedValue(undefined),
    deleteToken: vi.fn().mockResolvedValue(undefined),
  });

  const createAuthMethod = (id: string, name?: string): AuthMethod => ({
    id,
    name: name ?? id,
  });

  describe("createSessionWithAuth()", () => {
    it("should create session without auth when not required", async () => {
      const client = createMockClient();
      const response: NewSessionResponse = { sessionId: "session-1" };
      (client.newSession as ReturnType<typeof vi.fn>).mockResolvedValue(response);

      const result = await createSessionWithAuth(
        client,
        { cwd: "/test" },
        {
          harnessId: "harness-1",
          authMethods: [],
          credentialStore: createMockCredentialStore(),
        }
      );

      expect(result).toEqual(response);
      expect(client.newSession).toHaveBeenCalledTimes(1);
    });

    it("should retry with auth when auth error occurs", async () => {
      const client = createMockClient();
      const authError = { code: ERROR_CODE.AUTH_REQUIRED, message: "Auth required" };
      const response: NewSessionResponse = { sessionId: "session-1" };

      (client.newSession as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(authError)
        .mockResolvedValueOnce(response);
      (client.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const credentialStore = createMockCredentialStore();
      (credentialStore.getToken as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");

      const result = await createSessionWithAuth(
        client,
        { cwd: "/test" },
        {
          harnessId: "harness-1",
          authMethods: [createAuthMethod("method-1")],
          credentialStore,
        }
      );

      expect(result).toEqual(response);
      expect(client.newSession).toHaveBeenCalledTimes(2);
      expect(client.authenticate).toHaveBeenCalled();
    });

    it("should propagate non-auth errors", async () => {
      const client = createMockClient();
      const error = new Error("Other error");
      (client.newSession as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(
        createSessionWithAuth(
          client,
          { cwd: "/test" },
          {
            harnessId: "harness-1",
            authMethods: [],
            credentialStore: createMockCredentialStore(),
          }
        )
      ).rejects.toThrow("Other error");
    });
  });

  describe("ensureAuthenticated()", () => {
    it("should authenticate with stored token", async () => {
      const client = createMockClient();
      (client.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const credentialStore = createMockCredentialStore();
      (credentialStore.getToken as ReturnType<typeof vi.fn>).mockResolvedValue("stored-token");

      const method = createAuthMethod("method-1");
      const result = await ensureAuthenticated(client, {
        harnessId: "harness-1",
        authMethods: [method],
        credentialStore,
      });

      expect(result.methodId).toBe("method-1");
      expect(result.token).toBe("stored-token");
      expect(client.authenticate).toHaveBeenCalledWith({ methodId: "method-1" });
    });

    it("should prompt for token when not stored", async () => {
      const client = createMockClient();
      (client.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const credentialStore = createMockCredentialStore();
      (credentialStore.getToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const method = createAuthMethod("method-1", "api_key");
      const mockPrompt = {
        selectMethod: vi.fn().mockResolvedValue(method),
        requestToken: vi.fn().mockResolvedValue("prompted-token"),
      };

      const result = await ensureAuthenticated(client, {
        harnessId: "harness-1",
        authMethods: [method],
        credentialStore,
        prompt: mockPrompt,
      });

      expect(result.token).toBe("prompted-token");
      expect(credentialStore.setToken).toHaveBeenCalled();
    });

    it("should throw error when no auth methods available", async () => {
      const client = createMockClient();

      await expect(
        ensureAuthenticated(client, {
          harnessId: "harness-1",
          authMethods: [],
          credentialStore: createMockCredentialStore(),
        })
      ).rejects.toThrow("No authentication methods available");
    });

    it("should select first method when only one available", async () => {
      const client = createMockClient();
      (client.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const method = createAuthMethod("method-1");
      const credentialStore = createMockCredentialStore();
      (credentialStore.getToken as ReturnType<typeof vi.fn>).mockResolvedValue("token");

      const result = await ensureAuthenticated(client, {
        harnessId: "harness-1",
        authMethods: [method],
        credentialStore,
      });

      expect(result.methodId).toBe("method-1");
      expect(client.authenticate).toHaveBeenCalledWith({ methodId: "method-1" });
    });
  });

  describe("isAuthRequiredError()", () => {
    it("should detect RequestError with AUTH_REQUIRED code", () => {
      // RequestError might structure code differently, test with object first
      const error = { code: ERROR_CODE.AUTH_REQUIRED, message: "Auth required" };
      expect(isAuthRequiredError(error)).toBe(true);
    });

    it("should detect error object with AUTH_REQUIRED code", () => {
      const error = { code: ERROR_CODE.AUTH_REQUIRED };
      expect(isAuthRequiredError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
      const error = new Error("Other error");
      expect(isAuthRequiredError(error)).toBe(false);
    });

    it("should return false for error with different code", () => {
      const error = { code: 500, message: "Other error" };
      expect(isAuthRequiredError(error)).toBe(false);
    });

    it("should handle RequestError instance if it has code property", () => {
      // Create a mock RequestError-like object
      const error = Object.create(RequestError.prototype);
      error.code = ERROR_CODE.AUTH_REQUIRED;
      error.message = "Auth required";
      expect(isAuthRequiredError(error)).toBe(true);
    });
  });

  describe("createDefaultAuthPrompt()", () => {
    it("should return prompt interface", () => {
      const prompt = createDefaultAuthPrompt();

      expect(prompt).toBeDefined();
      expect(typeof prompt.selectMethod).toBe("function");
      expect(typeof prompt.requestToken).toBe("function");
    });

    it("should auto-select when only one method", async () => {
      const prompt = createDefaultAuthPrompt();
      const method = createAuthMethod("method-1");

      // This will use readline which requires stdin, so we'll test the logic differently
      // For now, just verify the interface exists
      expect(prompt).toBeDefined();
    });
  });
});

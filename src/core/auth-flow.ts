import { createInterface } from "node:readline/promises";
import { TOKEN_HINTS } from "@/constants/auth-hints";
import { ERROR_CODE } from "@/constants/error-codes";
import type { ACPClient } from "@/core/acp-client";
import type { CredentialScope, CredentialStore } from "@/utils/credentials";
import type {
  AuthMethod,
  AuthenticateRequest,
  NewSessionRequest,
  NewSessionResponse,
} from "@agentclientprotocol/sdk";
import { RequestError } from "@agentclientprotocol/sdk";

export interface AuthPrompt {
  selectMethod(methods: AuthMethod[]): Promise<AuthMethod>;
  requestToken(method: AuthMethod): Promise<string | undefined>;
}

export interface AuthFlowOptions {
  harnessId: string;
  authMethods: AuthMethod[];
  credentialStore: CredentialStore;
  prompt?: AuthPrompt;
  accountId?: string;
}

export interface AuthResult {
  methodId: string;
  token?: string;
}

export const createSessionWithAuth = async (
  client: ACPClient,
  params: NewSessionRequest,
  options: AuthFlowOptions
): Promise<NewSessionResponse> => {
  try {
    return await client.newSession(params);
  } catch (error) {
    if (!isAuthRequiredError(error)) {
      throw error;
    }
    await ensureAuthenticated(client, options);
    return client.newSession(params);
  }
};

export const ensureAuthenticated = async (
  client: ACPClient,
  options: AuthFlowOptions
): Promise<AuthResult> => {
  if (options.authMethods.length === 0) {
    throw new Error("No authentication methods available");
  }

  const prompt = options.prompt ?? createDefaultAuthPrompt();
  const method = await prompt.selectMethod(options.authMethods);
  const scope: CredentialScope = {
    harnessId: options.harnessId,
    accountId: options.accountId,
    tokenType: method.id,
  };

  let token = await options.credentialStore.getToken(scope);
  if (!token && shouldPromptForToken(method)) {
    token = await prompt.requestToken(method);
    if (token) {
      await options.credentialStore.setToken(scope, token);
    }
  }

  const authRequest: AuthenticateRequest = { methodId: method.id };
  await client.authenticate(authRequest);

  return { methodId: method.id, token };
};

export const isAuthRequiredError = (error: unknown): boolean => {
  if (error instanceof RequestError) {
    return error.code === ERROR_CODE.AUTH_REQUIRED;
  }

  if (typeof error === "object" && error && "code" in error) {
    return (error as { code?: number }).code === ERROR_CODE.AUTH_REQUIRED;
  }

  return false;
};

export const createDefaultAuthPrompt = (): AuthPrompt => {
  return {
    selectMethod: async (methods: AuthMethod[]): Promise<AuthMethod> => {
      if (methods.length === 1) {
        const only = methods[0];
        if (!only) {
          throw new Error("No authentication methods available");
        }
        return only;
      }

      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const choices = methods
          .map((method, index) => `${index + 1}. ${method.name ?? method.id}`)
          .join("\n");
        const answer = await rl.question(`Select auth method:\n${choices}\n> `);
        const selection = Number.parseInt(answer.trim(), 10);
        if (!Number.isNaN(selection) && selection > 0 && selection <= methods.length) {
          const chosen = methods[selection - 1];
          if (chosen) {
            return chosen;
          }
        }
      } finally {
        rl.close();
      }

      const fallback = methods[0];
      if (!fallback) {
        throw new Error("No authentication methods available");
      }
      return fallback;
    },
    requestToken: async (method: AuthMethod): Promise<string | undefined> => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const answer = await rl.question(`Enter token for ${method.name ?? method.id}: `);
        const token = answer.trim();
        return token.length > 0 ? token : undefined;
      } finally {
        rl.close();
      }
    },
  };
};

const shouldPromptForToken = (method: AuthMethod): boolean => {
  const haystack = `${method.id} ${method.name ?? ""} ${method.description ?? ""}`.toLowerCase();
  return TOKEN_HINTS.some((hint) => haystack.includes(hint));
};

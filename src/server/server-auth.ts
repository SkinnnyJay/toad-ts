import type { IncomingMessage, ServerResponse } from "node:http";
import { ENV_KEY } from "@/constants/env-keys";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { sendErrorResponse } from "@/server/http-response";
import { EnvManager } from "@/utils/env/env.utils";

const AUTH_HEADER = {
  "WWW-Authenticate": "Bearer",
} as const;

const BEARER_TOKEN_PREFIX_PATTERN = /^Bearer\s+/i;
const BEARER_SCHEME_PATTERN = /^Bearer\b/i;

const normalizeAuthorizationHeader = (
  authorization: string | string[] | undefined
): string | null => {
  if (typeof authorization === "string") {
    const normalizedAuthorization = authorization.trim();
    return normalizedAuthorization.length > 0 ? normalizedAuthorization : null;
  }
  if (Array.isArray(authorization)) {
    if (authorization.length !== 1) {
      return null;
    }
    const singleAuthorization = authorization[0];
    if (singleAuthorization === undefined) {
      return null;
    }
    const normalizedAuthorization = singleAuthorization.trim();
    return normalizedAuthorization.length > 0 ? normalizedAuthorization : null;
  }
  return null;
};

const rejectUnauthorized = (res: ServerResponse, message: string): boolean => {
  sendErrorResponse(res, HTTP_STATUS.UNAUTHORIZED, message, { headers: AUTH_HEADER });
  return false;
};

const extractAuthorizationToken = (authHeader: string): string | null => {
  const usesBearerScheme = BEARER_SCHEME_PATTERN.test(authHeader);
  const token = usesBearerScheme
    ? authHeader.replace(BEARER_SCHEME_PATTERN, "").trim()
    : authHeader.replace(BEARER_TOKEN_PREFIX_PATTERN, "").trim();
  if (usesBearerScheme && token.length === 0) {
    return null;
  }
  return token.length > 0 ? token : null;
};

/**
 * Basic auth middleware for the headless server.
 * Checks the TOADSTOOL_SERVER_PASSWORD environment variable.
 * If not set, all requests are allowed (no auth required).
 */
export const checkServerAuth = (req: IncomingMessage, res: ServerResponse): boolean => {
  const env = EnvManager.getInstance().getSnapshot();
  const password = env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];

  if (!password) return true; // No password configured, allow all

  const authHeader = normalizeAuthorizationHeader(req.headers.authorization);
  if (!authHeader) {
    return rejectUnauthorized(res, SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED);
  }

  // Support "Bearer <token>" format while rejecting missing bearer tokens.
  const token = extractAuthorizationToken(authHeader);
  if (!token) {
    return rejectUnauthorized(res, SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED);
  }
  if (token !== password) {
    return rejectUnauthorized(res, SERVER_RESPONSE_MESSAGE.INVALID_CREDENTIALS);
  }

  return true;
};

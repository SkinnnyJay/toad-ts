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

const rejectUnauthorized = (res: ServerResponse, message: string): boolean => {
  sendErrorResponse(res, HTTP_STATUS.UNAUTHORIZED, message, { headers: AUTH_HEADER });
  return false;
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

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return rejectUnauthorized(res, SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED);
  }

  // Support "Bearer <token>" format
  const token = authHeader.trim().replace(BEARER_TOKEN_PREFIX_PATTERN, "").trim();
  if (token !== password) {
    return rejectUnauthorized(res, SERVER_RESPONSE_MESSAGE.INVALID_CREDENTIALS);
  }

  return true;
};

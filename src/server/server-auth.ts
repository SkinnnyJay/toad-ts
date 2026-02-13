import type { IncomingMessage, ServerResponse } from "node:http";
import { ENV_KEY } from "@/constants/env-keys";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { EnvManager } from "@/utils/env/env.utils";

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
    res.writeHead(HTTP_STATUS.UNAUTHORIZED, {
      "Content-Type": "application/json",
      "WWW-Authenticate": "Bearer",
    });
    res.end(JSON.stringify({ error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED }));
    return false;
  }

  // Support "Bearer <token>" format
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (token !== password) {
    res.writeHead(HTTP_STATUS.UNAUTHORIZED, {
      "Content-Type": "application/json",
      "WWW-Authenticate": "Bearer",
    });
    res.end(JSON.stringify({ error: SERVER_RESPONSE_MESSAGE.INVALID_CREDENTIALS }));
    return false;
  }

  return true;
};

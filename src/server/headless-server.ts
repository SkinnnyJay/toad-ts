import http, { type ServerResponse } from "node:http";
import { SERVER_CONFIG } from "@/config/server";
import { HTTP_METHOD } from "@/constants/http-methods";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_EVENT } from "@/constants/server-events";
import { SERVER_PATH } from "@/constants/server-paths";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { SessionManager } from "@/core/session-manager";
import { SessionStream } from "@/core/session-stream";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import {
  formatHarnessAdapterNotRegisteredError,
  formatHarnessNotConfiguredError,
} from "@/harness/harness-error-messages";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { loadHarnessConfig } from "@/harness/harnessConfig";
import { createHarnessRegistry, isCursorHarnessEnabled } from "@/harness/harnessRegistryFactory";
import { sendErrorResponse, sendJsonResponse } from "@/server/http-response";
import { parseJsonRequestBody } from "@/server/request-body";
import { classifyRequestParsingError } from "@/server/request-error-normalization";
import { parseRequestUrl } from "@/server/request-url";
import { checkServerAuth } from "@/server/server-auth";
import type { ServerRuntimeConfig } from "@/server/server-config";
import { SERVER_ROUTE_CLASSIFICATION, classifyServerRoute } from "@/server/server-route-classifier";
import { createSessionRequestSchema, promptSessionRequestSchema } from "@/server/server-types";
import { parseSessionRoutePath } from "@/server/session-route-path";
import { useAppStore } from "@/store/app-store";
import { SessionIdSchema } from "@/types/domain";
import type { SessionId } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { WebSocket, WebSocketServer } from "ws";
import { ZodError } from "zod";

export interface HeadlessServerOptions extends Partial<ServerRuntimeConfig> {}

export interface HeadlessServer {
  close: () => Promise<void>;
  address: () => { host: string; port: number };
}

const logger = createClassLogger("HeadlessServer");

const sendJson = (res: ServerResponse, status: number, payload: unknown): void =>
  sendJsonResponse(res, status, payload, { includeContentLength: true });

const sendError = (res: ServerResponse, status: number, message: string): void =>
  sendErrorResponse(res, status, message, { includeContentLength: true });

const handleRequestParsingFailure = (
  res: ServerResponse,
  error: unknown,
  context: { method: string; pathname: string }
): boolean => {
  const parsedRequestError = classifyRequestParsingError(error);
  if (!parsedRequestError) {
    return false;
  }
  logger.warn("Headless request parsing failed", {
    method: context.method,
    pathname: context.pathname,
    error: error instanceof Error ? error.message : String(error),
    mappedMessage: parsedRequestError,
  });
  sendError(res, HTTP_STATUS.BAD_REQUEST, parsedRequestError);
  return true;
};

export const startHeadlessServer = async (
  options: HeadlessServerOptions = {}
): Promise<HeadlessServer> => {
  const env = EnvManager.getInstance().getSnapshot();
  const harnessConfigResult = await loadHarnessConfig({ env }).catch(() =>
    createDefaultHarnessConfig(env)
  );
  const harnessRegistry = createHarnessRegistry({
    enableCursor: isCursorHarnessEnabled(env),
    includeMock: true,
  });
  const store = useAppStore;
  const storeState = store.getState();
  const sessionStream = new SessionStream(storeState);
  const runtimes = new Map<SessionId, HarnessRuntime>();

  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.method) {
        sendError(res, HTTP_STATUS.BAD_REQUEST, SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
        return;
      }

      const url = parseRequestUrl(req);
      if (!url) {
        sendError(res, HTTP_STATUS.BAD_REQUEST, SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
        return;
      }

      // Auth check (skip for health endpoint)
      if (url.pathname !== SERVER_PATH.HEALTH && !checkServerAuth(req, res)) {
        return;
      }

      const routeClassification = classifyServerRoute(req.method, url.pathname);

      if (routeClassification.kind === SERVER_ROUTE_CLASSIFICATION.HEALTH_OK) {
        sendJson(res, HTTP_STATUS.OK, { status: "ok" });
        return;
      }
      if (routeClassification.kind === SERVER_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED) {
        sendError(res, HTTP_STATUS.METHOD_NOT_ALLOWED, SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED);
        return;
      }
      if (routeClassification.kind === SERVER_ROUTE_CLASSIFICATION.API_MATCH) {
        await routeClassification.handler(req, res, routeClassification.params);
        return;
      }

      if (req.method === HTTP_METHOD.POST && url.pathname === SERVER_PATH.SESSIONS) {
        let raw: unknown;
        try {
          raw = await parseJsonRequestBody<unknown>(req, { emptyBodyValue: {} });
        } catch (error) {
          if (
            handleRequestParsingFailure(res, error, { method: req.method, pathname: url.pathname })
          ) {
            return;
          }
          throw error;
        }
        const payload = createSessionRequestSchema.parse(raw);
        const harnessId = payload.harnessId ?? harnessConfigResult.harnessId;
        const harnessConfig = harnessConfigResult.harnesses[harnessId];
        if (!harnessConfig) {
          sendError(res, HTTP_STATUS.NOT_FOUND, formatHarnessNotConfiguredError(harnessId));
          return;
        }
        const adapter = harnessRegistry.get(harnessId);
        if (!adapter) {
          sendError(res, HTTP_STATUS.NOT_FOUND, formatHarnessAdapterNotRegisteredError(harnessId));
          return;
        }
        const runtime = adapter.createHarness(harnessConfig);
        await runtime.connect();
        sessionStream.attach(runtime);
        runtime.on("sessionUpdate", (update) => {
          broadcast({
            type: SERVER_EVENT.SESSION_UPDATE,
            timestamp: Date.now(),
            payload: update,
          });
        });
        const sessionManager = new SessionManager(runtime, storeState);
        const session = await sessionManager.createSession({
          cwd: payload.cwd ?? harnessConfig.cwd ?? process.cwd(),
          agentId: payload.agentId,
          title: payload.title,
        });
        runtimes.set(session.id, runtime);
        broadcast({
          type: SERVER_EVENT.SESSION_CREATED,
          timestamp: Date.now(),
          payload: { sessionId: session.id },
        });
        sendJson(res, HTTP_STATUS.OK, { sessionId: session.id });
        return;
      }

      if (req.method === HTTP_METHOD.POST && url.pathname.startsWith(`${SERVER_PATH.SESSIONS}/`)) {
        const parsedRoutePath = parseSessionRoutePath(url.pathname);
        const sessionId = parsedRoutePath?.sessionId;
        const action = parsedRoutePath?.action;
        if (!sessionId || action !== SERVER_PATH.SEGMENT_PROMPT) {
          sendError(res, HTTP_STATUS.NOT_FOUND, SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT);
          return;
        }
        const parsedSession = SessionIdSchema.safeParse(sessionId);
        if (!parsedSession.success) {
          sendError(res, HTTP_STATUS.BAD_REQUEST, SERVER_RESPONSE_MESSAGE.INVALID_SESSION_ID);
          return;
        }
        const runtime = runtimes.get(parsedSession.data);
        if (!runtime) {
          sendError(res, HTTP_STATUS.NOT_FOUND, SERVER_RESPONSE_MESSAGE.SESSION_NOT_FOUND);
          return;
        }
        let raw: unknown;
        try {
          raw = await parseJsonRequestBody<unknown>(req);
        } catch (error) {
          if (
            handleRequestParsingFailure(res, error, { method: req.method, pathname: url.pathname })
          ) {
            return;
          }
          throw error;
        }
        const payload = promptSessionRequestSchema.parse(raw);
        const response = await runtime.prompt({
          sessionId: parsedSession.data,
          prompt: [{ type: "text", text: payload.prompt }],
        });
        sendJson(res, HTTP_STATUS.OK, response);
        return;
      }

      if (req.method === HTTP_METHOD.GET && url.pathname.startsWith(`${SERVER_PATH.SESSIONS}/`)) {
        const parsedRoutePath = parseSessionRoutePath(url.pathname);
        const sessionId = parsedRoutePath?.sessionId;
        const resource = parsedRoutePath?.action;
        if (!sessionId || resource !== SERVER_PATH.SEGMENT_MESSAGES) {
          sendError(res, HTTP_STATUS.NOT_FOUND, SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT);
          return;
        }
        const parsedSession = SessionIdSchema.safeParse(sessionId);
        if (!parsedSession.success) {
          sendError(res, HTTP_STATUS.BAD_REQUEST, SERVER_RESPONSE_MESSAGE.INVALID_SESSION_ID);
          return;
        }
        const messages = store.getState().getMessagesForSession(parsedSession.data);
        sendJson(res, HTTP_STATUS.OK, { messages });
        return;
      }

      sendError(res, HTTP_STATUS.NOT_FOUND, SERVER_RESPONSE_MESSAGE.NOT_FOUND);
    } catch (error) {
      if (error instanceof ZodError) {
        sendError(res, HTTP_STATUS.BAD_REQUEST, error.message);
        return;
      }
      logger.error("Server request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, SERVER_RESPONSE_MESSAGE.SERVER_ERROR);
    }
  });

  const wsServer = new WebSocketServer({ server });

  const broadcast = (payload: Record<string, unknown>): void => {
    const message = JSON.stringify(payload);
    wsServer.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  await new Promise<void>((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", (error) => reject(error));
    server.listen(
      options.port ?? SERVER_CONFIG.DEFAULT_PORT,
      options.host ?? SERVER_CONFIG.DEFAULT_HOST
    );
  });

  const address = (): { host: string; port: number } => {
    const info = server.address();
    if (info && typeof info === "object") {
      return { host: options.host ?? SERVER_CONFIG.DEFAULT_HOST, port: info.port };
    }
    return {
      host: options.host ?? SERVER_CONFIG.DEFAULT_HOST,
      port: options.port ?? SERVER_CONFIG.DEFAULT_PORT,
    };
  };

  return {
    close: async () => {
      for (const runtime of runtimes.values()) {
        await runtime.disconnect();
      }
      wsServer.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CLOSING) {
          client.terminate();
        }
      });
      await new Promise<void>((resolve) => wsServer.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
    address,
  };
};

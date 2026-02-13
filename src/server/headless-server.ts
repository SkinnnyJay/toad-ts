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
import { API_ROUTES, matchRoute } from "@/server/api-routes";
import { parseJsonRequestBody } from "@/server/request-body";
import { checkServerAuth } from "@/server/server-auth";
import type { ServerRuntimeConfig } from "@/server/server-config";
import { createSessionRequestSchema, promptSessionRequestSchema } from "@/server/server-types";
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

const isMethodAllowedForCoreRoute = (method: string, pathname: string): boolean => {
  if (pathname === SERVER_PATH.HEALTH) {
    return method === HTTP_METHOD.GET;
  }
  if (pathname === SERVER_PATH.SESSIONS) {
    return method === HTTP_METHOD.POST;
  }
  if (pathname.startsWith(`${SERVER_PATH.SESSIONS}/`)) {
    const [_, __, sessionId, action] = pathname.split("/");
    if (!sessionId || !action) {
      return true;
    }
    if (action === SERVER_PATH.SEGMENT_PROMPT) {
      return method === HTTP_METHOD.POST;
    }
    if (action === SERVER_PATH.SEGMENT_MESSAGES) {
      return method === HTTP_METHOD.GET;
    }
  }
  return true;
};

const sendJson = (res: ServerResponse, status: number, payload: unknown): void => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
};

const sendError = (res: ServerResponse, status: number, message: string): void => {
  sendJson(res, status, { error: message });
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

      // Auth check (skip for health endpoint)
      const authUrl = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      if (authUrl.pathname !== SERVER_PATH.HEALTH && !checkServerAuth(req, res)) {
        return;
      }
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

      if (req.method === HTTP_METHOD.GET && url.pathname === SERVER_PATH.HEALTH) {
        sendJson(res, HTTP_STATUS.OK, { status: "ok" });
        return;
      }
      if (!isMethodAllowedForCoreRoute(req.method, url.pathname)) {
        sendError(res, HTTP_STATUS.METHOD_NOT_ALLOWED, SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED);
        return;
      }

      if (req.method === HTTP_METHOD.POST && url.pathname === SERVER_PATH.SESSIONS) {
        const raw = await parseJsonRequestBody<unknown>(req, { emptyBodyValue: {} });
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
        const [_, __, sessionId, action] = url.pathname.split("/");
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
        const raw = await parseJsonRequestBody<unknown>(req);
        const payload = promptSessionRequestSchema.parse(raw);
        const response = await runtime.prompt({
          sessionId: parsedSession.data,
          prompt: [{ type: "text", text: payload.prompt }],
        });
        sendJson(res, HTTP_STATUS.OK, response);
        return;
      }

      if (req.method === HTTP_METHOD.GET && url.pathname.startsWith(`${SERVER_PATH.SESSIONS}/`)) {
        const [_, __, sessionId, resource] = url.pathname.split("/");
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

      // Try API routes from api-routes.ts
      const matched = matchRoute(req.method ?? HTTP_METHOD.GET, url.pathname);
      if (matched) {
        await matched.handler(req, res, matched.params);
        return;
      }
      const routePatternMatch = API_ROUTES.some((route) => route.pattern.test(url.pathname));
      if (routePatternMatch) {
        sendError(res, HTTP_STATUS.METHOD_NOT_ALLOWED, SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED);
        return;
      }

      sendError(res, HTTP_STATUS.NOT_FOUND, SERVER_RESPONSE_MESSAGE.NOT_FOUND);
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        sendError(res, HTTP_STATUS.BAD_REQUEST, error.message);
        return;
      }
      if (
        error instanceof Error &&
        error.message === SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE
      ) {
        sendError(res, HTTP_STATUS.BAD_REQUEST, SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE);
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

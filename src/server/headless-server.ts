import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { SERVER_CONFIG } from "@/config/server";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_EVENT } from "@/constants/server-events";
import { claudeCliHarnessAdapter } from "@/core/claude-cli-harness";
import { codexCliHarnessAdapter } from "@/core/codex-cli-harness";
import { geminiCliHarnessAdapter } from "@/core/gemini-cli-harness";
import { mockHarnessAdapter } from "@/core/mock-harness";
import { SessionManager } from "@/core/session-manager";
import { SessionStream } from "@/core/session-stream";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { loadHarnessConfig } from "@/harness/harnessConfig";
import { HarnessRegistry } from "@/harness/harnessRegistry";
import { matchRoute } from "@/server/api-routes";
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

const readBody = async (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer | string) => {
      data += chunk.toString();
      if (data.length > SERVER_CONFIG.MAX_BODY_BYTES) {
        reject(new Error("Request body too large."));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", (error) => reject(error));
  });
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

const parseJson = async (req: IncomingMessage): Promise<unknown> => {
  const body = await readBody(req);
  if (!body) {
    return {};
  }
  return JSON.parse(body);
};

export const startHeadlessServer = async (
  options: HeadlessServerOptions = {}
): Promise<HeadlessServer> => {
  const env = EnvManager.getInstance().getSnapshot();
  const harnessConfigResult = await loadHarnessConfig({ env }).catch(() =>
    createDefaultHarnessConfig(env)
  );
  const harnessRegistry = new HarnessRegistry([
    claudeCliHarnessAdapter,
    geminiCliHarnessAdapter,
    codexCliHarnessAdapter,
    mockHarnessAdapter,
  ]);
  const store = useAppStore;
  const storeState = store.getState();
  const sessionStream = new SessionStream(storeState);
  const runtimes = new Map<SessionId, HarnessRuntime>();

  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.method) {
        sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid request.");
        return;
      }

      // Auth check (skip for health endpoint)
      const authUrl = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      if (authUrl.pathname !== "/health" && !checkServerAuth(req, res)) {
        return;
      }
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, HTTP_STATUS.OK, { status: "ok" });
        return;
      }

      if (req.method === "POST" && url.pathname === "/sessions") {
        const raw = await parseJson(req);
        const payload = createSessionRequestSchema.parse(raw);
        const harnessId = payload.harnessId ?? harnessConfigResult.harnessId;
        const harnessConfig = harnessConfigResult.harnesses[harnessId];
        if (!harnessConfig) {
          sendError(res, HTTP_STATUS.NOT_FOUND, `Unknown harness: ${harnessId}`);
          return;
        }
        const adapter = harnessRegistry.get(harnessId);
        if (!adapter) {
          sendError(res, HTTP_STATUS.NOT_FOUND, `No adapter registered for ${harnessId}`);
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

      if (req.method === "POST" && url.pathname.startsWith("/sessions/")) {
        const [_, __, sessionId, action] = url.pathname.split("/");
        if (!sessionId || action !== "prompt") {
          sendError(res, HTTP_STATUS.NOT_FOUND, "Unknown endpoint.");
          return;
        }
        const parsedSession = SessionIdSchema.safeParse(sessionId);
        if (!parsedSession.success) {
          sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid session id.");
          return;
        }
        const runtime = runtimes.get(parsedSession.data);
        if (!runtime) {
          sendError(res, HTTP_STATUS.NOT_FOUND, "Session not found.");
          return;
        }
        const raw = await parseJson(req);
        const payload = promptSessionRequestSchema.parse(raw);
        const response = await runtime.prompt({
          sessionId: parsedSession.data,
          prompt: [{ type: "text", text: payload.prompt }],
        });
        sendJson(res, HTTP_STATUS.OK, response);
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/sessions/")) {
        const [_, __, sessionId, resource] = url.pathname.split("/");
        if (!sessionId || resource !== "messages") {
          sendError(res, HTTP_STATUS.NOT_FOUND, "Unknown endpoint.");
          return;
        }
        const parsedSession = SessionIdSchema.safeParse(sessionId);
        if (!parsedSession.success) {
          sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid session id.");
          return;
        }
        const messages = store.getState().getMessagesForSession(parsedSession.data);
        sendJson(res, HTTP_STATUS.OK, { messages });
        return;
      }

      // Try API routes from api-routes.ts
      const matched = matchRoute(req.method ?? "GET", url.pathname);
      if (matched) {
        await matched.handler(req, res, matched.params);
        return;
      }

      sendError(res, HTTP_STATUS.NOT_FOUND, "Not found.");
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        sendError(res, HTTP_STATUS.BAD_REQUEST, error.message);
        return;
      }
      logger.error("Server request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Server error.");
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

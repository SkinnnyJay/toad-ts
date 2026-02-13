import type { IncomingMessage, ServerResponse } from "node:http";
import { loadAppConfig } from "@/config/app-config";
import { HTTP_METHOD } from "@/constants/http-methods";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import { loadHarnessConfig } from "@/harness/harnessConfig";
import { useAppStore } from "@/store/app-store";
import type { Session, SessionId } from "@/types/domain";
type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => Promise<void>;

const sendJson = (res: ServerResponse, status: number, payload: unknown): void => {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
};

const readBody = async (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer | string) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

// ── Session Endpoints ──────────────────────────────────────────────────────

export const listSessions: RouteHandler = async (_req, res) => {
  const state = useAppStore.getState();
  const sessions = Object.values(state.sessions).filter((s): s is Session => s !== undefined);
  sendJson(res, HTTP_STATUS.OK, { sessions });
};

export const getSession: RouteHandler = async (_req, res, params) => {
  const sessionId = params.id as SessionId | undefined;
  if (!sessionId) {
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: SERVER_RESPONSE_MESSAGE.SESSION_ID_REQUIRED,
    });
    return;
  }
  const session = useAppStore.getState().getSession(sessionId);
  if (!session) {
    sendJson(res, HTTP_STATUS.NOT_FOUND, { error: SERVER_RESPONSE_MESSAGE.SESSION_NOT_FOUND });
    return;
  }
  sendJson(res, HTTP_STATUS.OK, { session });
};

export const deleteSession: RouteHandler = async (_req, res, params) => {
  const sessionId = params.id as SessionId | undefined;
  if (!sessionId) {
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: SERVER_RESPONSE_MESSAGE.SESSION_ID_REQUIRED,
    });
    return;
  }
  sendJson(res, HTTP_STATUS.OK, { deleted: sessionId });
};

// ── Message Endpoints ──────────────────────────────────────────────────────

export const listMessages: RouteHandler = async (_req, res, params) => {
  const sessionId = params.id as SessionId | undefined;
  if (!sessionId) {
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: SERVER_RESPONSE_MESSAGE.SESSION_ID_REQUIRED,
    });
    return;
  }
  const messages = useAppStore.getState().getMessagesForSession(sessionId);
  sendJson(res, HTTP_STATUS.OK, { messages });
};

// ── Config Endpoints ───────────────────────────────────────────────────────

export const getConfig: RouteHandler = async (_req, res) => {
  try {
    const config = await loadAppConfig();
    sendJson(res, HTTP_STATUS.OK, { config });
  } catch (error) {
    sendJson(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : SERVER_RESPONSE_MESSAGE.FAILED_TO_LOAD_CONFIG,
    });
  }
};

// ── Agent Endpoints ────────────────────────────────────────────────────────

export const listAgents: RouteHandler = async (_req, res) => {
  try {
    const config = await loadHarnessConfig().catch(() => createDefaultHarnessConfig());
    const agents = Object.values(config.harnesses).map((harness) => ({
      id: harness.id,
      name: harness.name,
      command: harness.command,
      cwd: harness.cwd,
    }));
    sendJson(res, HTTP_STATUS.OK, {
      agents,
      defaultHarnessId: config.harnessId,
    });
  } catch (error) {
    sendJson(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      error:
        error instanceof Error ? error.message : SERVER_RESPONSE_MESSAGE.FAILED_TO_LOAD_HARNESSES,
    });
  }
};

// ── File Endpoints ─────────────────────────────────────────────────────────

export const searchFiles: RouteHandler = async (req, res) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const query = url.searchParams.get("q") ?? "";
  if (!query) {
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: SERVER_RESPONSE_MESSAGE.QUERY_PARAM_Q_REQUIRED,
    });
    return;
  }
  // Placeholder - would integrate with SearchService
  sendJson(res, HTTP_STATUS.OK, { query, results: [] });
};

// ── Events SSE Endpoint ────────────────────────────────────────────────────

export const eventsStream: RouteHandler = async (_req, res) => {
  res.writeHead(HTTP_STATUS.OK, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const unsubscribe = useAppStore.subscribe((state) => {
    const data = JSON.stringify({
      type: "state_update",
      currentSessionId: state.currentSessionId,
      connectionStatus: state.connectionStatus,
    });
    res.write(`data: ${data}\n\n`);
  });

  _req.on("close", () => {
    unsubscribe();
  });
};

// ── TUI Control Endpoints ──────────────────────────────────────────────────

export const appendPrompt: RouteHandler = async (req, res) => {
  const body = await readBody(req);
  const { text } = JSON.parse(body) as { text?: string };
  if (!text) {
    sendJson(res, HTTP_STATUS.BAD_REQUEST, { error: SERVER_RESPONSE_MESSAGE.TEXT_REQUIRED });
    return;
  }
  sendJson(res, HTTP_STATUS.OK, { queued: true, text });
};

export const submitPrompt: RouteHandler = async (_req, res) => {
  sendJson(res, HTTP_STATUS.OK, { submitted: true });
};

export const executeCommand: RouteHandler = async (req, res) => {
  const body = await readBody(req);
  const { command } = JSON.parse(body) as { command?: string };
  if (!command) {
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: SERVER_RESPONSE_MESSAGE.COMMAND_REQUIRED,
    });
    return;
  }
  sendJson(res, HTTP_STATUS.OK, { executed: true, command });
};

// ── Route Table ────────────────────────────────────────────────────────────

export interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

export const API_ROUTES: Route[] = [
  { method: HTTP_METHOD.GET, pattern: /^\/api\/sessions$/, handler: listSessions, paramNames: [] },
  {
    method: HTTP_METHOD.GET,
    pattern: /^\/api\/sessions\/([^/]+)$/,
    handler: getSession,
    paramNames: ["id"],
  },
  {
    method: HTTP_METHOD.DELETE,
    pattern: /^\/api\/sessions\/([^/]+)$/,
    handler: deleteSession,
    paramNames: ["id"],
  },
  {
    method: HTTP_METHOD.GET,
    pattern: /^\/api\/sessions\/([^/]+)\/messages$/,
    handler: listMessages,
    paramNames: ["id"],
  },
  { method: HTTP_METHOD.GET, pattern: /^\/api\/config$/, handler: getConfig, paramNames: [] },
  { method: HTTP_METHOD.GET, pattern: /^\/api\/agents$/, handler: listAgents, paramNames: [] },
  {
    method: HTTP_METHOD.GET,
    pattern: /^\/api\/files\/search$/,
    handler: searchFiles,
    paramNames: [],
  },
  { method: HTTP_METHOD.GET, pattern: /^\/api\/events$/, handler: eventsStream, paramNames: [] },
  {
    method: HTTP_METHOD.POST,
    pattern: /^\/api\/tui\/append-prompt$/,
    handler: appendPrompt,
    paramNames: [],
  },
  {
    method: HTTP_METHOD.POST,
    pattern: /^\/api\/tui\/submit-prompt$/,
    handler: submitPrompt,
    paramNames: [],
  },
  {
    method: HTTP_METHOD.POST,
    pattern: /^\/api\/tui\/execute-command$/,
    handler: executeCommand,
    paramNames: [],
  },
];

export const matchRoute = (
  method: string,
  pathname: string
): { handler: RouteHandler; params: Record<string, string> } | null => {
  for (const route of API_ROUTES) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (!match) continue;
    const params: Record<string, string> = {};
    for (let i = 0; i < route.paramNames.length; i++) {
      const name = route.paramNames[i];
      const value = match[i + 1];
      if (name && value) params[name] = value;
    }
    return { handler: route.handler, params };
  }
  return null;
};

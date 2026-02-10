import type { IncomingMessage, ServerResponse } from "node:http";
import { loadAppConfig } from "@/config/app-config";
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
  sendJson(res, 200, { sessions });
};

export const getSession: RouteHandler = async (_req, res, params) => {
  const sessionId = params.id as SessionId | undefined;
  if (!sessionId) {
    sendJson(res, 400, { error: "Session ID required" });
    return;
  }
  const session = useAppStore.getState().getSession(sessionId);
  if (!session) {
    sendJson(res, 404, { error: "Session not found" });
    return;
  }
  sendJson(res, 200, { session });
};

export const deleteSession: RouteHandler = async (_req, res, params) => {
  const sessionId = params.id as SessionId | undefined;
  if (!sessionId) {
    sendJson(res, 400, { error: "Session ID required" });
    return;
  }
  sendJson(res, 200, { deleted: sessionId });
};

// ── Message Endpoints ──────────────────────────────────────────────────────

export const listMessages: RouteHandler = async (_req, res, params) => {
  const sessionId = params.id as SessionId | undefined;
  if (!sessionId) {
    sendJson(res, 400, { error: "Session ID required" });
    return;
  }
  const messages = useAppStore.getState().getMessagesForSession(sessionId);
  sendJson(res, 200, { messages });
};

// ── Config Endpoints ───────────────────────────────────────────────────────

export const getConfig: RouteHandler = async (_req, res) => {
  try {
    const config = await loadAppConfig();
    sendJson(res, 200, { config });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Failed to load config",
    });
  }
};

// ── Agent Endpoints ────────────────────────────────────────────────────────

export const listAgents: RouteHandler = async (_req, res) => {
  // Return registered agents from store
  sendJson(res, 200, { agents: [] });
};

// ── File Endpoints ─────────────────────────────────────────────────────────

export const searchFiles: RouteHandler = async (req, res) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const query = url.searchParams.get("q") ?? "";
  if (!query) {
    sendJson(res, 400, { error: "Query parameter 'q' required" });
    return;
  }
  // Placeholder - would integrate with SearchService
  sendJson(res, 200, { query, results: [] });
};

// ── Events SSE Endpoint ────────────────────────────────────────────────────

export const eventsStream: RouteHandler = async (_req, res) => {
  res.writeHead(200, {
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
    sendJson(res, 400, { error: "Text required" });
    return;
  }
  sendJson(res, 200, { queued: true, text });
};

export const submitPrompt: RouteHandler = async (_req, res) => {
  sendJson(res, 200, { submitted: true });
};

export const executeCommand: RouteHandler = async (req, res) => {
  const body = await readBody(req);
  const { command } = JSON.parse(body) as { command?: string };
  if (!command) {
    sendJson(res, 400, { error: "Command required" });
    return;
  }
  sendJson(res, 200, { executed: true, command });
};

// ── Route Table ────────────────────────────────────────────────────────────

export interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

export const API_ROUTES: Route[] = [
  { method: "GET", pattern: /^\/api\/sessions$/, handler: listSessions, paramNames: [] },
  { method: "GET", pattern: /^\/api\/sessions\/([^/]+)$/, handler: getSession, paramNames: ["id"] },
  {
    method: "DELETE",
    pattern: /^\/api\/sessions\/([^/]+)$/,
    handler: deleteSession,
    paramNames: ["id"],
  },
  {
    method: "GET",
    pattern: /^\/api\/sessions\/([^/]+)\/messages$/,
    handler: listMessages,
    paramNames: ["id"],
  },
  { method: "GET", pattern: /^\/api\/config$/, handler: getConfig, paramNames: [] },
  { method: "GET", pattern: /^\/api\/agents$/, handler: listAgents, paramNames: [] },
  { method: "GET", pattern: /^\/api\/files\/search$/, handler: searchFiles, paramNames: [] },
  { method: "GET", pattern: /^\/api\/events$/, handler: eventsStream, paramNames: [] },
  { method: "POST", pattern: /^\/api\/tui\/append-prompt$/, handler: appendPrompt, paramNames: [] },
  { method: "POST", pattern: /^\/api\/tui\/submit-prompt$/, handler: submitPrompt, paramNames: [] },
  {
    method: "POST",
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

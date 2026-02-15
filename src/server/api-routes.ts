import type { IncomingMessage, ServerResponse } from "node:http";
import { loadAppConfig } from "@/config/app-config";
import { HTTP_METHOD } from "@/constants/http-methods";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_EVENT } from "@/constants/server-events";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { SERVER_ROUTE_CLASSIFIER_HANDLER } from "@/constants/server-route-classifier-handlers";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import { loadHarnessConfig } from "@/harness/harnessConfig";
import { normalizeHttpMethod } from "@/server/http-method-normalization";
import { sendJsonResponse } from "@/server/http-response";
import { parseJsonRequestBody } from "@/server/request-body";
import {
  REQUEST_PARSING_SOURCE,
  logRequestParsingFailure,
  logRequestValidationFailure,
  normalizeRequestBodyParseErrorDetails,
} from "@/server/request-error-normalization";
import { parseRequestUrl } from "@/server/request-url";
import { useAppStore } from "@/store/app-store";
import type { Session, SessionId } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";
export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => Promise<void>;

const SEARCH_QUERY_PARAM_NAME = "q";
const QUERY_PARAM_SEPARATOR = "&";
const QUERY_PARAM_ASSIGNMENT = "=";
const FORM_SPACE_PATTERN = /\+/g;
const FORM_SPACE_REPLACEMENT = "%20";
const API_ROUTE_HANDLER = {
  APPEND_PROMPT: "append_prompt",
  EXECUTE_COMMAND: "execute_command",
  SEARCH_FILES: "search_files",
} as const;

const logger = createClassLogger("ApiRoutes");

const sendJson = (res: ServerResponse, status: number, payload: unknown): void => {
  sendJsonResponse(res, status, payload);
};

const logApiValidationFailure = (
  req: IncomingMessage,
  handler: string,
  mappedMessage: string,
  error: string
): void => {
  logRequestValidationFailure(
    logger,
    {
      source: REQUEST_PARSING_SOURCE.API_ROUTES,
      handler,
      method: req.method ?? "",
      pathname: req.url ?? "",
    },
    { mappedMessage, error }
  );
};

const decodeFormQueryComponent = (rawValue: string): string =>
  decodeURIComponent(rawValue.replace(FORM_SPACE_PATTERN, FORM_SPACE_REPLACEMENT));

const normalizeQueryParamName = (rawName: string): string => rawName.trim().toLowerCase();

const getRawQueryParamValues = (search: string, paramName: string): string[] => {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (query.length === 0) {
    return [];
  }
  const normalizedParamName = normalizeQueryParamName(paramName);
  const values: string[] = [];
  for (const segment of query.split(QUERY_PARAM_SEPARATOR)) {
    const [rawName, ...rest] = segment.split(QUERY_PARAM_ASSIGNMENT);
    const name = normalizeQueryParamName(decodeFormQueryComponent(rawName ?? ""));
    if (name === normalizedParamName) {
      values.push(rest.join(QUERY_PARAM_ASSIGNMENT));
    }
  }
  return values;
};

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
  const url = parseRequestUrl(req);
  if (!url) {
    logApiValidationFailure(
      req,
      API_ROUTE_HANDLER.SEARCH_FILES,
      SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      SERVER_RESPONSE_MESSAGE.INVALID_REQUEST
    );
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
    });
    return;
  }
  try {
    const rawQueries = getRawQueryParamValues(url.search, SEARCH_QUERY_PARAM_NAME);
    if (rawQueries.length === 0) {
      logApiValidationFailure(
        req,
        API_ROUTE_HANDLER.SEARCH_FILES,
        SERVER_RESPONSE_MESSAGE.QUERY_PARAM_Q_REQUIRED,
        SERVER_RESPONSE_MESSAGE.QUERY_PARAM_Q_REQUIRED
      );
      sendJson(res, HTTP_STATUS.BAD_REQUEST, {
        error: SERVER_RESPONSE_MESSAGE.QUERY_PARAM_Q_REQUIRED,
      });
      return;
    }
    if (rawQueries.length > 1) {
      logApiValidationFailure(
        req,
        API_ROUTE_HANDLER.SEARCH_FILES,
        SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        SERVER_RESPONSE_MESSAGE.INVALID_REQUEST
      );
      sendJson(res, HTTP_STATUS.BAD_REQUEST, {
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      });
      return;
    }
    const rawQuery = rawQueries[0];
    const query = decodeFormQueryComponent(rawQuery ?? "").trim();
    if (!query) {
      logApiValidationFailure(
        req,
        API_ROUTE_HANDLER.SEARCH_FILES,
        SERVER_RESPONSE_MESSAGE.QUERY_PARAM_Q_REQUIRED,
        SERVER_RESPONSE_MESSAGE.QUERY_PARAM_Q_REQUIRED
      );
      sendJson(res, HTTP_STATUS.BAD_REQUEST, {
        error: SERVER_RESPONSE_MESSAGE.QUERY_PARAM_Q_REQUIRED,
      });
      return;
    }
    // Placeholder - would integrate with SearchService
    sendJson(res, HTTP_STATUS.OK, { query, results: [] });
  } catch (error) {
    logApiValidationFailure(
      req,
      API_ROUTE_HANDLER.SEARCH_FILES,
      SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error instanceof Error ? error.message : String(error)
    );
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
    });
  }
};

// ── Events SSE Endpoint ────────────────────────────────────────────────────

export const eventsStream: RouteHandler = async (_req, res) => {
  res.writeHead(HTTP_STATUS.OK, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let isCleanedUp = false;
  let unsubscribe: () => void = () => {};
  const cleanup = (): void => {
    if (isCleanedUp) {
      return;
    }
    isCleanedUp = true;
    unsubscribe();
  };

  unsubscribe = useAppStore.subscribe((state) => {
    if (isCleanedUp) {
      return;
    }
    if (res.writableEnded || res.destroyed) {
      cleanup();
      return;
    }
    try {
      const data = JSON.stringify({
        type: SERVER_EVENT.STATE_UPDATE,
        currentSessionId: state.currentSessionId,
        connectionStatus: state.connectionStatus,
      });
      res.write(`data: ${data}\n\n`);
    } catch {
      cleanup();
    }
  });

  if (res.writableEnded || res.destroyed) {
    cleanup();
    return;
  }

  _req.once("close", cleanup);
  _req.once("aborted", cleanup);
  _req.once("error", cleanup);
  res.once("close", cleanup);
  res.once("error", cleanup);
};

// ── TUI Control Endpoints ──────────────────────────────────────────────────

export const appendPrompt: RouteHandler = async (req, res) => {
  try {
    const payload = await parseJsonRequestBody<{ text?: string }>(req);
    const { text } = payload;
    if (!text) {
      sendJson(res, HTTP_STATUS.BAD_REQUEST, { error: SERVER_RESPONSE_MESSAGE.TEXT_REQUIRED });
      return;
    }
    sendJson(res, HTTP_STATUS.OK, { queued: true, text });
  } catch (error) {
    const normalizedError = normalizeRequestBodyParseErrorDetails(error);
    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        handler: API_ROUTE_HANDLER.APPEND_PROMPT,
        method: req.method ?? "",
        pathname: req.url ?? "",
      },
      normalizedError
    );
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: normalizedError.message,
    });
  }
};

export const submitPrompt: RouteHandler = async (_req, res) => {
  sendJson(res, HTTP_STATUS.OK, { submitted: true });
};

export const executeCommand: RouteHandler = async (req, res) => {
  try {
    const payload = await parseJsonRequestBody<{ command?: string }>(req);
    const { command } = payload;
    if (!command) {
      sendJson(res, HTTP_STATUS.BAD_REQUEST, {
        error: SERVER_RESPONSE_MESSAGE.COMMAND_REQUIRED,
      });
      return;
    }
    sendJson(res, HTTP_STATUS.OK, { executed: true, command });
  } catch (error) {
    const normalizedError = normalizeRequestBodyParseErrorDetails(error);
    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        handler: API_ROUTE_HANDLER.EXECUTE_COMMAND,
        method: req.method ?? "",
        pathname: req.url ?? "",
      },
      normalizedError
    );
    sendJson(res, HTTP_STATUS.BAD_REQUEST, {
      error: normalizedError.message,
    });
  }
};

// ── Route Table ────────────────────────────────────────────────────────────

export interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

export const API_ROUTE_CLASSIFICATION = {
  MATCH: "match",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  NOT_FOUND: "not_found",
} as const;

type ApiRouteClassification =
  | {
      kind: typeof API_ROUTE_CLASSIFICATION.MATCH;
      handler: RouteHandler;
      params: Record<string, string>;
    }
  | {
      kind: typeof API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED;
      classifierHandler: typeof SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER;
    }
  | {
      kind: typeof API_ROUTE_CLASSIFICATION.NOT_FOUND;
      classifierHandler: typeof SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER;
    };

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

export const matchRoute = (method: string, pathname: string): RouteMatchResult | null => {
  const normalizedMethod = normalizeHttpMethod(method);
  const normalizedPathname = pathname.trim();
  for (const route of API_ROUTES) {
    if (route.method !== normalizedMethod) continue;
    const match = normalizedPathname.match(route.pattern);
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

export interface RouteMatchResult {
  handler: RouteHandler;
  params: Record<string, string>;
}

export const classifyApiRoute = (method: string, pathname: string): ApiRouteClassification => {
  const normalizedPathname = pathname.trim();
  const matched = matchRoute(method, normalizedPathname);
  if (matched) {
    return {
      kind: API_ROUTE_CLASSIFICATION.MATCH,
      handler: matched.handler,
      params: matched.params,
    };
  }
  const knownPath = API_ROUTES.some((route) => route.pattern.test(normalizedPathname));
  if (knownPath) {
    return {
      kind: API_ROUTE_CLASSIFICATION.METHOD_NOT_ALLOWED,
      classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
    };
  }
  return {
    kind: API_ROUTE_CLASSIFICATION.NOT_FOUND,
    classifierHandler: SERVER_ROUTE_CLASSIFIER_HANDLER.API_ROUTE_CLASSIFIER,
  };
};

import { unlink } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { DEFAULT_HOST } from "@/config/server";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { HTTP_METHOD } from "@/constants/http-methods";
import { HTTP_STATUS } from "@/constants/http-status";
import { PERMISSION } from "@/constants/permissions";
import { PLATFORM } from "@/constants/platform";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { sendErrorResponse, sendJsonResponse } from "@/server/http-response";
import { parseJsonRequestBody } from "@/server/request-body";
import {
  REQUEST_PARSING_SOURCE,
  logRequestParsingFailure,
  logRequestValidationFailure,
  normalizeRequestBodyParseErrorDetails,
} from "@/server/request-error-normalization";
import {
  type CursorHookInput,
  CursorHookInputSchema,
  CursorPreToolUseOutputSchema,
  CursorSessionStartOutputSchema,
  CursorStopOutputSchema,
} from "@/types/cursor-hooks.types";
import { createClassLogger } from "@/utils/logging/logger.utils";

const HOOK_IPC_DEFAULT = {
  HOST: DEFAULT_HOST,
  PATHNAME: "/",
} as const;

const HOOK_IPC_LOCAL_HOST = {
  LOOPBACK_IPV4: "127.0.0.1",
  LOCALHOST: "localhost",
  LOOPBACK_IPV6: "::1",
  MAPPED_LOOPBACK_IPV4: "::ffff:127.0.0.1",
} as const;

const HOOK_IPC_LOCAL_HTTP_HOSTS = new Set<string>([
  HOOK_IPC_LOCAL_HOST.LOOPBACK_IPV4,
  HOOK_IPC_LOCAL_HOST.LOCALHOST,
]);

const HOOK_IPC_LOCAL_REMOTE_ADDRESSES = new Set<string>([
  HOOK_IPC_LOCAL_HOST.LOOPBACK_IPV4,
  HOOK_IPC_LOCAL_HOST.LOOPBACK_IPV6,
  HOOK_IPC_LOCAL_HOST.MAPPED_LOOPBACK_IPV4,
]);

const HOOK_IPC_TRANSPORT = {
  UNIX_SOCKET: "unix_socket",
  HTTP: "http",
} as const;

const HOOK_IPC_HANDLER = {
  METHOD_GUARD: "method_guard",
  ORIGIN_GUARD: "origin_guard",
} as const;

type HookIpcTransport = (typeof HOOK_IPC_TRANSPORT)[keyof typeof HOOK_IPC_TRANSPORT];

const defaultSocketPath = (pid: number): string => {
  return path.join(tmpdir(), `toadstool-cursor-hooks-${pid}.sock`);
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }
  return result;
};

export interface HookIpcEndpoint {
  transport: HookIpcTransport;
  socketPath?: string;
  url?: string;
}

export interface HookIpcServerOptions {
  transport?: HookIpcTransport;
  socketPath?: string;
  host?: string;
  port?: number;
  requestTimeoutMs?: number;
}

export interface HookIpcHandlerContext {
  payload: CursorHookInput;
}

export type HookIpcHandler = (context: HookIpcHandlerContext) => Promise<Record<string, unknown>>;

export interface HookIpcServerHandlers {
  permissionRequest?: HookIpcHandler;
  contextInjection?: HookIpcHandler;
  continuation?: HookIpcHandler;
  routeHandlers?: Partial<Record<CursorHookInput["hook_event_name"], HookIpcHandler>>;
}

export class HookIpcServer {
  private readonly logger = createClassLogger("HookIpcServer");
  private readonly transport: HookIpcTransport;
  private readonly socketPath: string;
  private readonly host: string;
  private readonly port: number;
  private readonly requestTimeoutMs: number;

  private handlers: HookIpcServerHandlers = {};
  private server: http.Server | null = null;
  private endpoint: HookIpcEndpoint | null = null;

  public constructor(options: HookIpcServerOptions = {}) {
    const transport =
      options.transport ??
      (process.platform === PLATFORM.WIN32
        ? HOOK_IPC_TRANSPORT.HTTP
        : HOOK_IPC_TRANSPORT.UNIX_SOCKET);

    this.transport = transport;
    this.socketPath = options.socketPath ?? defaultSocketPath(process.pid);
    this.host = this.resolveHttpHost(options.host ?? HOOK_IPC_DEFAULT.HOST);
    this.port = options.port ?? 0;
    this.requestTimeoutMs = options.requestTimeoutMs ?? CURSOR_LIMIT.HOOK_REQUEST_TIMEOUT_MS;
  }

  public setHandlers(handlers: HookIpcServerHandlers): void {
    this.handlers = handlers;
  }

  public getEndpoint(): HookIpcEndpoint {
    if (!this.endpoint) {
      throw new Error("Hook IPC server is not started.");
    }
    return this.endpoint;
  }

  public async start(): Promise<HookIpcEndpoint> {
    if (this.server) {
      return this.getEndpoint();
    }

    const server = http.createServer(async (req, res) => {
      if (this.endpoint?.transport === HOOK_IPC_TRANSPORT.HTTP && !this.isLocalHttpRequest(req)) {
        logRequestValidationFailure(
          this.logger,
          {
            source: REQUEST_PARSING_SOURCE.HOOK_IPC,
            handler: HOOK_IPC_HANDLER.ORIGIN_GUARD,
            method: req.method ?? "",
            pathname: req.url ?? HOOK_IPC_DEFAULT.PATHNAME,
          },
          {
            error: SERVER_RESPONSE_MESSAGE.ORIGIN_NOT_ALLOWED,
            mappedMessage: SERVER_RESPONSE_MESSAGE.ORIGIN_NOT_ALLOWED,
          }
        );
        sendErrorResponse(res, HTTP_STATUS.FORBIDDEN, SERVER_RESPONSE_MESSAGE.ORIGIN_NOT_ALLOWED);
        return;
      }

      if (req.method !== HTTP_METHOD.POST) {
        logRequestValidationFailure(
          this.logger,
          {
            source: REQUEST_PARSING_SOURCE.HOOK_IPC,
            handler: HOOK_IPC_HANDLER.METHOD_GUARD,
            method: req.method ?? "",
            pathname: req.url ?? HOOK_IPC_DEFAULT.PATHNAME,
          },
          {
            error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
            mappedMessage: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
          }
        );
        sendErrorResponse(
          res,
          HTTP_STATUS.METHOD_NOT_ALLOWED,
          SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED
        );
        return;
      }

      let payload: CursorHookInput;
      try {
        const parsedBody = await parseJsonRequestBody<unknown>(req);
        const parsedPayload = CursorHookInputSchema.safeParse(parsedBody);
        if (!parsedPayload.success) {
          logRequestValidationFailure(
            this.logger,
            {
              source: REQUEST_PARSING_SOURCE.HOOK_IPC,
              method: req.method ?? "",
              pathname: req.url ?? HOOK_IPC_DEFAULT.PATHNAME,
            },
            {
              error: parsedPayload.error.message,
              mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
            }
          );
          sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
          return;
        }
        payload = parsedPayload.data;
      } catch (error) {
        const mappedError = normalizeRequestBodyParseErrorDetails(error);
        logRequestParsingFailure(
          this.logger,
          {
            source: REQUEST_PARSING_SOURCE.HOOK_IPC,
            method: req.method ?? "",
            pathname: req.url ?? HOOK_IPC_DEFAULT.PATHNAME,
          },
          mappedError
        );
        sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, mappedError.message);
        return;
      }

      try {
        const response = await this.handlePayload(payload);
        sendJsonResponse(res, HTTP_STATUS.OK, response);
      } catch (error) {
        this.logger.error("Hook IPC request failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        sendErrorResponse(
          res,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          SERVER_RESPONSE_MESSAGE.SERVER_ERROR
        );
      }
    });

    this.server = server;

    if (this.transport === HOOK_IPC_TRANSPORT.UNIX_SOCKET) {
      const unixEndpoint = await this.startUnixSocketServer(server);
      if (unixEndpoint) {
        this.endpoint = unixEndpoint;
        return this.endpoint;
      }
    }

    await new Promise<void>((resolve, reject) => {
      server.once("error", (error) => reject(error));
      server.listen(this.port, this.host, () => resolve());
    });

    const address = server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : this.port;
    this.endpoint = {
      transport: HOOK_IPC_TRANSPORT.HTTP,
      url: `http://${this.host}:${resolvedPort}${HOOK_IPC_DEFAULT.PATHNAME}`,
    };
    return this.endpoint;
  }

  public async stop(): Promise<void> {
    const server = this.server;
    const endpoint = this.endpoint;
    this.server = null;
    this.endpoint = null;
    if (!server) {
      return;
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    if (endpoint?.transport === HOOK_IPC_TRANSPORT.UNIX_SOCKET) {
      await unlink(this.socketPath).catch(() => undefined);
    }
  }

  private resolveHttpHost(host: string): string {
    const normalizedHost = host.trim().toLowerCase();
    if (HOOK_IPC_LOCAL_HTTP_HOSTS.has(normalizedHost)) {
      return normalizedHost;
    }
    this.logger.warn("Hook IPC HTTP host must be local; falling back to loopback", {
      requestedHost: host,
      fallbackHost: HOOK_IPC_DEFAULT.HOST,
    });
    return HOOK_IPC_DEFAULT.HOST;
  }

  private isLocalHttpRequest(request: http.IncomingMessage): boolean {
    const remoteAddress = request.socket.remoteAddress ?? "";
    if (!HOOK_IPC_LOCAL_REMOTE_ADDRESSES.has(remoteAddress)) {
      return false;
    }
    return this.isLocalHostHeader(request.headers.host);
  }

  private isLocalHostHeader(hostHeader: string | undefined): boolean {
    if (!hostHeader) {
      return false;
    }
    try {
      const parsedHost = new URL(`http://${hostHeader}`).hostname.toLowerCase();
      return HOOK_IPC_LOCAL_HTTP_HOSTS.has(parsedHost);
    } catch (_error) {
      return false;
    }
  }

  private async startUnixSocketServer(server: http.Server): Promise<HookIpcEndpoint | null> {
    await unlink(this.socketPath).catch(() => undefined);
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", (error) => reject(error));
        server.listen(this.socketPath, () => resolve());
      });
      return {
        transport: HOOK_IPC_TRANSPORT.UNIX_SOCKET,
        socketPath: this.socketPath,
      };
    } catch (error) {
      this.logger.warn("Unix socket startup failed; falling back to HTTP transport", {
        platform: process.platform,
        socketPath: this.socketPath,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async handlePayload(payload: CursorHookInput): Promise<Record<string, unknown>> {
    const routeHandler = this.handlers.routeHandlers?.[payload.hook_event_name];
    if (routeHandler) {
      return withTimeout(routeHandler({ payload }), this.requestTimeoutMs, {});
    }

    switch (payload.hook_event_name) {
      case CURSOR_HOOK_EVENT.SESSION_START:
        return this.handleContextInjection(payload);
      case CURSOR_HOOK_EVENT.PRE_TOOL_USE:
      case CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION:
      case CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION:
      case CURSOR_HOOK_EVENT.BEFORE_READ_FILE:
      case CURSOR_HOOK_EVENT.SUBAGENT_START:
        return this.handlePermissionRequest(payload);
      case CURSOR_HOOK_EVENT.STOP:
      case CURSOR_HOOK_EVENT.SUBAGENT_STOP:
        return this.handleContinuation(payload);
      default:
        return {};
    }
  }

  private async handlePermissionRequest(
    payload: CursorHookInput
  ): Promise<Record<string, unknown>> {
    if (!this.handlers.permissionRequest) {
      return CursorPreToolUseOutputSchema.parse({
        decision: PERMISSION.ALLOW,
      });
    }

    const fallback = CursorPreToolUseOutputSchema.parse({
      decision: PERMISSION.ALLOW,
    });
    const response = await withTimeout(
      this.handlers.permissionRequest({ payload }),
      this.requestTimeoutMs,
      fallback
    );
    const parsed = CursorPreToolUseOutputSchema.safeParse(response);
    if (!parsed.success) {
      this.logger.warn("Invalid permission hook response, defaulting to allow", {
        error: parsed.error.message,
      });
      return fallback;
    }
    return parsed.data;
  }

  private async handleContextInjection(payload: CursorHookInput): Promise<Record<string, unknown>> {
    if (!this.handlers.contextInjection) {
      return CursorSessionStartOutputSchema.parse({});
    }
    const fallback = CursorSessionStartOutputSchema.parse({});
    const response = await withTimeout(
      this.handlers.contextInjection({ payload }),
      this.requestTimeoutMs,
      fallback
    );
    const parsed = CursorSessionStartOutputSchema.safeParse(response);
    if (!parsed.success) {
      this.logger.warn("Invalid context injection response, defaulting to empty", {
        error: parsed.error.message,
      });
      return fallback;
    }
    return parsed.data;
  }

  private async handleContinuation(payload: CursorHookInput): Promise<Record<string, unknown>> {
    if (!this.handlers.continuation) {
      return CursorStopOutputSchema.parse({});
    }
    const fallback = CursorStopOutputSchema.parse({});
    const response = await withTimeout(
      this.handlers.continuation({ payload }),
      this.requestTimeoutMs,
      fallback
    );
    const parsed = CursorStopOutputSchema.safeParse(response);
    if (!parsed.success) {
      this.logger.warn("Invalid continuation response, defaulting to empty", {
        error: parsed.error.message,
      });
      return fallback;
    }
    return parsed.data;
  }
}

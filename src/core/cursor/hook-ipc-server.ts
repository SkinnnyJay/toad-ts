import { unlink } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { DEFAULT_HOST } from "@/config/server";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { HTTP_STATUS } from "@/constants/http-status";
import { PERMISSION } from "@/constants/permissions";
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

const HOOK_IPC_TRANSPORT = {
  UNIX_SOCKET: "unix_socket",
  HTTP: "http",
} as const;

type HookIpcTransport = (typeof HOOK_IPC_TRANSPORT)[keyof typeof HOOK_IPC_TRANSPORT];

const defaultSocketPath = (pid: number): string => {
  return path.join(tmpdir(), `toadstool-cursor-hooks-${pid}.sock`);
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
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
      (process.platform === "win32" ? HOOK_IPC_TRANSPORT.HTTP : HOOK_IPC_TRANSPORT.UNIX_SOCKET);

    this.transport = transport;
    this.socketPath = options.socketPath ?? defaultSocketPath(process.pid);
    this.host = options.host ?? HOOK_IPC_DEFAULT.HOST;
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
      if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      const bodyChunks: string[] = [];
      req.on("data", (chunk: Buffer | string) => {
        bodyChunks.push(chunk.toString());
      });
      req.on("end", async () => {
        const rawBody = bodyChunks.join("");
        const parsedBody = safeJsonParse(rawBody);
        const parsedPayload = CursorHookInputSchema.safeParse(parsedBody);
        if (!parsedPayload.success) {
          res.writeHead(HTTP_STATUS.BAD_REQUEST, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: parsedPayload.error.message }));
          return;
        }

        const response = await this.handlePayload(parsedPayload.data);
        res.writeHead(HTTP_STATUS.OK, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      });
    });

    this.server = server;

    if (this.transport === HOOK_IPC_TRANSPORT.UNIX_SOCKET) {
      await unlink(this.socketPath).catch(() => undefined);
      await new Promise<void>((resolve, reject) => {
        server.once("error", (error) => reject(error));
        server.listen(this.socketPath, () => resolve());
      });
      this.endpoint = {
        transport: HOOK_IPC_TRANSPORT.UNIX_SOCKET,
        socketPath: this.socketPath,
      };
      return this.endpoint;
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
    this.server = null;
    this.endpoint = null;
    if (!server) {
      return;
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    if (this.transport === HOOK_IPC_TRANSPORT.UNIX_SOCKET) {
      await unlink(this.socketPath).catch(() => undefined);
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

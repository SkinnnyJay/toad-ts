import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { TIMEOUT } from "@/config/timeouts";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import {
  CURSOR_HOOK_IPC,
  CURSOR_HOOK_IPC_TRANSPORT,
  CURSOR_HOOK_RESPONSE_FIELD,
  type CursorHookIpcTransport,
  type CursorHookResponseField,
} from "@/constants/cursor-hook-ipc";
import { ERROR_CODE } from "@/constants/error-codes";
import { HTTP_METHOD } from "@/constants/http-methods";
import { HTTP_STATUS } from "@/constants/http-status";
import {
  CURSOR_HOOK_DECISION,
  CursorHookBeforeMcpExecutionResponseSchema,
  CursorHookBeforeReadFileResponseSchema,
  CursorHookBeforeShellExecutionResponseSchema,
  CursorHookBeforeSubmitPromptResponseSchema,
  type CursorHookDecision,
  type CursorHookInput,
  CursorHookInputSchema,
  CursorHookPreToolUseResponseSchema,
  CursorHookSessionStartResponseSchema,
  CursorHookStopResponseSchema,
  CursorHookSubagentStopResponseSchema,
} from "@/types/cursor-hooks.types";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { EventEmitter } from "eventemitter3";

interface PendingPermissionRequest {
  resolve: (resolution: CursorPermissionResolution) => void;
  timeout: NodeJS.Timeout;
}

interface CursorPermissionResolution {
  decision: CursorHookDecision;
  reason?: string;
}

export interface CursorHookPermissionRequest {
  requestId: string;
  responseField: CursorHookResponseField;
  event: CursorHookInput;
}

export interface CursorHookIpcServerOptions {
  transport?: CursorHookIpcTransport;
  socketPath?: string;
  host?: string;
  port?: number;
  httpPath?: string;
  bodyMaxBytes?: number;
  permissionTimeoutMs?: number;
  permissionTimeoutDecision?: typeof CURSOR_HOOK_DECISION.ALLOW | typeof CURSOR_HOOK_DECISION.DENY;
  additionalContextProvider?: (
    event: CursorHookInput
  ) => Promise<string | undefined> | string | undefined;
  environmentProvider?: (
    event: CursorHookInput
  ) => Promise<Record<string, string> | undefined> | Record<string, string> | undefined;
  continuationProvider?: (
    event: CursorHookInput
  ) => Promise<string | undefined> | string | undefined;
  permissionResolver?: (
    request: CursorHookPermissionRequest
  ) => Promise<CursorPermissionResolution | null> | CursorPermissionResolution | null;
}

export interface CursorHookIpcAddress {
  transport: Exclude<CursorHookIpcTransport, "auto">;
  socketPath?: string;
  url?: string;
}

export interface CursorHookIpcServerEvents {
  hookEvent: (event: CursorHookInput) => void;
  permissionRequest: (request: CursorHookPermissionRequest) => void;
  started: (address: CursorHookIpcAddress) => void;
  stopped: () => void;
  error: (error: Error) => void;
}

const HTTP_STATUS_METHOD_NOT_ALLOWED = 405;
const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413;

export class CursorHookIpcServer extends EventEmitter<CursorHookIpcServerEvents> {
  private readonly logger = createClassLogger("CursorHookIpcServer");
  private readonly options: CursorHookIpcServerOptions;
  private server: Server | null = null;
  private address: CursorHookIpcAddress | null = null;
  private readonly pendingPermissions = new Map<string, PendingPermissionRequest>();

  constructor(options: CursorHookIpcServerOptions = {}) {
    super();
    this.options = options;
  }

  async start(): Promise<CursorHookIpcAddress> {
    if (this.server) {
      return this.getAddress();
    }

    this.server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });
    this.server.on("error", (error) => this.emit("error", error as Error));

    const transport = this.resolveTransport();
    if (transport === CURSOR_HOOK_IPC_TRANSPORT.UNIX) {
      const socketPath = this.resolveSocketPath();
      await this.removeFileIfExists(socketPath);
      await new Promise<void>((resolve, reject) => {
        this.server?.once("error", reject);
        this.server?.listen(socketPath, () => resolve());
      });
      this.address = {
        transport,
        socketPath,
      };
    } else {
      const host = this.options.host ?? CURSOR_HOOK_IPC.DEFAULT_HOST;
      const port = this.options.port ?? CURSOR_HOOK_IPC.DEFAULT_PORT;
      await new Promise<void>((resolve, reject) => {
        this.server?.once("error", reject);
        this.server?.listen(port, host, () => resolve());
      });
      const serverAddress = this.server.address();
      if (!serverAddress || typeof serverAddress === "string") {
        throw new Error("Unable to resolve hook IPC server address.");
      }
      this.address = {
        transport,
        url: `http://${host}:${serverAddress.port}${this.resolveHttpPath()}`,
      };
    }

    this.emit("started", this.getAddress());
    return this.getAddress();
  }

  async stop(): Promise<void> {
    this.resolveAllPendingPermissions({
      decision: this.getPermissionTimeoutDecision(),
      reason: "Hook IPC server stopped before a decision was provided.",
    });

    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    if (this.address?.transport === CURSOR_HOOK_IPC_TRANSPORT.UNIX && this.address.socketPath) {
      await this.removeFileIfExists(this.address.socketPath);
    }

    this.server = null;
    this.address = null;
    this.emit("stopped");
  }

  getAddress(): CursorHookIpcAddress {
    if (!this.address) {
      throw new Error("Hook IPC server is not started.");
    }
    return this.address;
  }

  hasPendingPermissionRequests(): boolean {
    return this.pendingPermissions.size > 0;
  }

  resolvePermissionRequest(requestId: string, resolution: CursorPermissionResolution): boolean {
    const pending = this.pendingPermissions.get(requestId);
    if (!pending) {
      return false;
    }
    clearTimeout(pending.timeout);
    this.pendingPermissions.delete(requestId);
    pending.resolve(resolution);
    return true;
  }

  private resolveTransport(): Exclude<CursorHookIpcTransport, "auto"> {
    const requestedTransport = this.options.transport ?? CURSOR_HOOK_IPC_TRANSPORT.AUTO;
    if (requestedTransport === CURSOR_HOOK_IPC_TRANSPORT.AUTO) {
      return process.platform === "win32"
        ? CURSOR_HOOK_IPC_TRANSPORT.HTTP
        : CURSOR_HOOK_IPC_TRANSPORT.UNIX;
    }
    return requestedTransport;
  }

  private resolveSocketPath(): string {
    const provided = this.options.socketPath;
    if (provided && provided.trim().length > 0) {
      return provided;
    }
    return path.join(tmpdir(), `toadstool-cursor-hook-${process.pid}.sock`);
  }

  private resolveHttpPath(): string {
    return this.options.httpPath ?? CURSOR_HOOK_IPC.DEFAULT_HTTP_PATH;
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (request.method !== HTTP_METHOD.POST) {
        this.sendJson(response, HTTP_STATUS_METHOD_NOT_ALLOWED, {
          error: "Only POST requests are supported.",
        });
        return;
      }

      const requestPath = (request.url ?? "").split("?")[0] ?? "";
      if (requestPath !== this.resolveHttpPath()) {
        this.sendJson(response, HTTP_STATUS.NOT_FOUND, { error: "Unknown hook IPC path." });
        return;
      }

      const body = await this.readBody(request);
      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch (error) {
        this.sendJson(response, HTTP_STATUS.BAD_REQUEST, {
          error: error instanceof Error ? error.message : "Invalid JSON payload.",
        });
        return;
      }

      const parsedEvent = CursorHookInputSchema.safeParse(payload);
      if (!parsedEvent.success) {
        this.sendJson(response, HTTP_STATUS.BAD_REQUEST, {
          error: parsedEvent.error.message,
        });
        return;
      }

      const hookEvent = parsedEvent.data;
      this.emit("hookEvent", hookEvent);
      const hookResponse = await this.routeHookEvent(hookEvent);
      this.sendJson(response, HTTP_STATUS.OK, hookResponse);
    } catch (error) {
      const statusCode = this.getErrorStatusCode(error);
      if (statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
        this.logger.error("Failed to process hook IPC request", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.sendJson(response, statusCode, {
        error:
          error instanceof Error && statusCode !== HTTP_STATUS.INTERNAL_SERVER_ERROR
            ? error.message
            : "Hook IPC server error.",
      });
    }
  }

  private async routeHookEvent(event: CursorHookInput): Promise<Record<string, unknown>> {
    switch (event.hook_event_name) {
      case CURSOR_HOOK_EVENT.SESSION_START:
        return this.handleSessionStart(event);
      case CURSOR_HOOK_EVENT.PRE_TOOL_USE:
        return this.handlePermissionEvent(event, CURSOR_HOOK_RESPONSE_FIELD.DECISION);
      case CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION:
      case CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION:
      case CURSOR_HOOK_EVENT.BEFORE_READ_FILE:
        return this.handlePermissionEvent(event, CURSOR_HOOK_RESPONSE_FIELD.PERMISSION);
      case CURSOR_HOOK_EVENT.STOP:
        return this.handleStop(event);
      case CURSOR_HOOK_EVENT.SUBAGENT_STOP:
        return this.handleSubagentStop(event);
      case CURSOR_HOOK_EVENT.BEFORE_SUBMIT_PROMPT:
        return this.handleBeforeSubmitPrompt(event);
      default:
        return {};
    }
  }

  private async handleSessionStart(event: CursorHookInput): Promise<Record<string, unknown>> {
    const additionalContext = await this.options.additionalContextProvider?.(event);
    const environment = await this.options.environmentProvider?.(event);
    return CursorHookSessionStartResponseSchema.parse({
      continue: true,
      additional_context: additionalContext,
      env: environment,
    });
  }

  private async handlePermissionEvent(
    event: CursorHookInput,
    responseField: CursorHookResponseField
  ): Promise<Record<string, unknown>> {
    const resolution = await this.getPermissionResolution(event, responseField);
    if (responseField === CURSOR_HOOK_RESPONSE_FIELD.DECISION) {
      return CursorHookPreToolUseResponseSchema.parse({
        decision: resolution.decision,
        reason: resolution.reason,
      });
    }

    if (event.hook_event_name === CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION) {
      return CursorHookBeforeMcpExecutionResponseSchema.parse({
        permission: resolution.decision,
        reason: resolution.reason,
      });
    }

    if (event.hook_event_name === CURSOR_HOOK_EVENT.BEFORE_READ_FILE) {
      return CursorHookBeforeReadFileResponseSchema.parse({
        permission: resolution.decision,
        reason: resolution.reason,
      });
    }

    return CursorHookBeforeShellExecutionResponseSchema.parse({
      permission: resolution.decision,
      reason: resolution.reason,
    });
  }

  private async handleStop(event: CursorHookInput): Promise<Record<string, unknown>> {
    const followupMessage = await this.options.continuationProvider?.(event);
    return CursorHookStopResponseSchema.parse({
      followup_message: followupMessage,
    });
  }

  private async handleSubagentStop(event: CursorHookInput): Promise<Record<string, unknown>> {
    const followupMessage = await this.options.continuationProvider?.(event);
    return CursorHookSubagentStopResponseSchema.parse({
      followup_message: followupMessage,
    });
  }

  private async handleBeforeSubmitPrompt(
    _event: CursorHookInput
  ): Promise<Record<string, unknown>> {
    return CursorHookBeforeSubmitPromptResponseSchema.parse({
      continue: true,
    });
  }

  private async getPermissionResolution(
    event: CursorHookInput,
    responseField: CursorHookResponseField
  ): Promise<CursorPermissionResolution> {
    const requestId = this.createPermissionRequestId(event);
    const permissionRequest: CursorHookPermissionRequest = {
      requestId,
      responseField,
      event,
    };

    const immediateResolution = await this.options.permissionResolver?.(permissionRequest);
    if (immediateResolution) {
      return immediateResolution;
    }

    return new Promise<CursorPermissionResolution>((resolve) => {
      const timeoutMs = this.options.permissionTimeoutMs ?? TIMEOUT.HOOK_PROMPT_MS;
      const timeout = setTimeout(() => {
        this.pendingPermissions.delete(requestId);
        resolve({
          decision: this.getPermissionTimeoutDecision(),
          reason: "Permission request timed out.",
        });
      }, timeoutMs);
      timeout.unref();

      this.pendingPermissions.set(requestId, {
        resolve,
        timeout,
      });
      this.emit("permissionRequest", permissionRequest);
    });
  }

  private getPermissionTimeoutDecision():
    | typeof CURSOR_HOOK_DECISION.ALLOW
    | typeof CURSOR_HOOK_DECISION.DENY {
    return this.options.permissionTimeoutDecision ?? CURSOR_HOOK_DECISION.DENY;
  }

  private createPermissionRequestId(event: CursorHookInput): string {
    return `${event.conversation_id}:${randomUUID()}`;
  }

  private async readBody(request: IncomingMessage): Promise<string> {
    const bodyMaxBytes = this.options.bodyMaxBytes ?? CURSOR_HOOK_IPC.BODY_MAX_BYTES;
    return new Promise<string>((resolve, reject) => {
      let data = "";
      let limitExceeded = false;
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        if (limitExceeded) {
          return;
        }
        data += chunk;
        if (Buffer.byteLength(data, "utf8") > bodyMaxBytes) {
          limitExceeded = true;
          reject(new Error("Payload too large."));
        }
      });
      request.on("error", (error) => reject(error));
      request.on("end", () => {
        if (limitExceeded) {
          return;
        }
        resolve(data);
      });
    }).catch((error) => {
      if (error instanceof Error && error.message === "Payload too large.") {
        throw Object.assign(error, { statusCode: HTTP_STATUS_PAYLOAD_TOO_LARGE });
      }
      throw error;
    });
  }

  private sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
    const body = JSON.stringify(payload);
    response.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  }

  private async removeFileIfExists(filePath: string): Promise<void> {
    try {
      await rm(filePath);
    } catch (error) {
      if (this.isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
        return;
      }
      throw error;
    }
  }

  private resolveAllPendingPermissions(resolution: CursorPermissionResolution): void {
    for (const [requestId, pending] of this.pendingPermissions.entries()) {
      clearTimeout(pending.timeout);
      pending.resolve(resolution);
      this.pendingPermissions.delete(requestId);
    }
  }

  private isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return typeof error === "object" && error !== null && "code" in error;
  }

  private getErrorStatusCode(error: unknown): number {
    if (typeof error !== "object" || error === null || !("statusCode" in error)) {
      return HTTP_STATUS.INTERNAL_SERVER_ERROR;
    }
    const statusCode = error.statusCode;
    return typeof statusCode === "number" ? statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
}

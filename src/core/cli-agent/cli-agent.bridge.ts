import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { STREAM_EVENT_TYPE, type StreamEvent } from "@/types/cli-agent.types";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";

export const CLI_AGENT_BRIDGE_DEFAULT = {
  TOOL_RESULT_MAX_BYTES: 50 * 1024,
} as const;

export interface CliAgentBridgeResult {
  sessionId: string;
  text: string;
  durationMs?: number;
  success: boolean;
}

export interface CliAgentBridgePermissionRequest {
  requestId: string;
  sessionId?: string;
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface CliAgentBridgeToolResultTruncation {
  sessionId: string;
  toolCallId: string;
  originalBytes: number;
  limitBytes: number;
}

export interface CliAgentBridgeOptions {
  toolResultMaxBytes?: number;
}

export interface CliAgentBridgeEvents {
  sessionUpdate: (update: SessionNotification) => void;
  result: (result: CliAgentBridgeResult) => void;
  permissionRequest: (request: CliAgentBridgePermissionRequest) => void;
  toolResultTruncated: (event: CliAgentBridgeToolResultTruncation) => void;
  error: (error: Error) => void;
}

export class CliAgentBridge extends EventEmitter<CliAgentBridgeEvents> {
  private readonly toolResultMaxBytes: number;

  constructor(options: CliAgentBridgeOptions = {}) {
    super();
    this.toolResultMaxBytes =
      options.toolResultMaxBytes ?? CLI_AGENT_BRIDGE_DEFAULT.TOOL_RESULT_MAX_BYTES;
  }

  translate(event: StreamEvent): void {
    const sessionId = event.sessionId;
    switch (event.type) {
      case STREAM_EVENT_TYPE.SESSION_INIT:
        return;
      case STREAM_EVENT_TYPE.TEXT_DELTA:
      case STREAM_EVENT_TYPE.TEXT_COMPLETE: {
        if (!sessionId) return;
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
            content: { type: CONTENT_BLOCK_TYPE.TEXT, text: event.text },
          },
        });
        return;
      }
      case STREAM_EVENT_TYPE.THINKING_DELTA:
      case STREAM_EVENT_TYPE.THINKING_COMPLETE: {
        if (!sessionId) return;
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK,
            content: { type: CONTENT_BLOCK_TYPE.TEXT, text: event.text },
          },
        });
        return;
      }
      case STREAM_EVENT_TYPE.TOOL_START: {
        if (!sessionId) return;
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
            toolCallId: event.toolCallId,
            title: event.toolName,
            rawInput: event.toolInput,
            status: "in_progress", // ACP SDK tool call status
          },
        });
        return;
      }
      case STREAM_EVENT_TYPE.TOOL_COMPLETE: {
        if (!sessionId) return;
        const { value, truncated, originalBytes } = this.truncateResult(event.result);
        if (truncated) {
          this.emit("toolResultTruncated", {
            sessionId,
            toolCallId: event.toolCallId,
            originalBytes,
            limitBytes: this.toolResultMaxBytes,
          });
        }

        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
            toolCallId: event.toolCallId,
            title: event.toolName,
            rawOutput: value,
            status: event.success ? "completed" : "failed", // ACP SDK tool call status
          },
        });
        return;
      }
      case STREAM_EVENT_TYPE.TOOL_ERROR: {
        if (!sessionId) return;
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
            toolCallId: event.toolCallId,
            title: event.toolName,
            rawOutput: { message: event.message },
            status: "failed", // ACP SDK tool call status
          },
        });
        return;
      }
      case STREAM_EVENT_TYPE.PERMISSION_REQUEST: {
        this.emit("permissionRequest", {
          requestId: event.requestId,
          sessionId: event.sessionId,
          toolName: event.toolName,
          toolInput: event.toolInput,
        });
        return;
      }
      case STREAM_EVENT_TYPE.RESULT: {
        if (!sessionId) return;
        this.emit("result", {
          sessionId,
          text: event.text,
          durationMs: event.durationMs,
          success: event.success,
        });
        return;
      }
      case STREAM_EVENT_TYPE.ERROR: {
        this.emit("error", new Error(event.message));
        return;
      }
      default:
        return;
    }
  }

  private truncateResult(result: unknown): {
    value: unknown;
    truncated: boolean;
    originalBytes: number;
  } {
    if (result === undefined) {
      return { value: undefined, truncated: false, originalBytes: 0 };
    }

    if (typeof result === "string") {
      const originalBytes = Buffer.byteLength(result, "utf8");
      if (originalBytes <= this.toolResultMaxBytes) {
        return { value: result, truncated: false, originalBytes };
      }
      return {
        value: this.truncateToByteLength(result, this.toolResultMaxBytes),
        truncated: true,
        originalBytes,
      };
    }

    const serialized = JSON.stringify(result);
    if (!serialized) {
      return { value: result, truncated: false, originalBytes: 0 };
    }

    const originalBytes = Buffer.byteLength(serialized, "utf8");
    if (originalBytes <= this.toolResultMaxBytes) {
      return { value: result, truncated: false, originalBytes };
    }

    return {
      value: this.truncateToByteLength(serialized, this.toolResultMaxBytes),
      truncated: true,
      originalBytes,
    };
  }

  private truncateToByteLength(text: string, limitBytes: number): string {
    if (Buffer.byteLength(text, "utf8") <= limitBytes) {
      return text;
    }

    let result = "";
    for (const character of text) {
      const candidate = `${result}${character}`;
      if (Buffer.byteLength(candidate, "utf8") > limitBytes) {
        break;
      }
      result = candidate;
    }
    return result;
  }
}

import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_STREAM_SUBTYPE, CURSOR_STREAM_TYPE } from "@/constants/cursor-event-types";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import type { CursorStreamEvent } from "@/types/cursor-cli.types";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";

export const CURSOR_TRANSLATOR_DEFAULT = {
  TOOL_RESULT_MAX_BYTES: 50 * 1024,
} as const;

const TOOL_CALL_KEY_TO_NAME: Record<string, string> = {
  readToolCall: "read_file",
  writeToolCall: "write_file",
  editToolCall: "edit_file",
  shellToolCall: "shell",
  grepToolCall: "grep",
  lsToolCall: "ls",
  globToolCall: "glob",
  todoToolCall: "todo",
};

interface CursorToolCallExtracted {
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
}

export interface CursorResultNotification {
  sessionId: string;
  text: string;
  durationMs: number;
  isError: boolean;
}

export interface CursorInitNotification {
  sessionId: string;
  model: string;
  permissionMode?: string;
}

export interface CursorToolResultTruncation {
  sessionId: string;
  toolCallId: string;
  originalBytes: number;
  limitBytes: number;
}

export interface CursorToAcpTranslatorOptions {
  toolResultMaxBytes?: number;
}

export interface CursorToAcpTranslatorEvents {
  sessionUpdate: (update: SessionNotification) => void;
  result: (result: CursorResultNotification) => void;
  initialized: (details: CursorInitNotification) => void;
  toolResultTruncated: (event: CursorToolResultTruncation) => void;
  error: (error: Error) => void;
}

export class CursorToAcpTranslator extends EventEmitter<CursorToAcpTranslatorEvents> {
  private readonly toolResultMaxBytes: number;

  constructor(options: CursorToAcpTranslatorOptions = {}) {
    super();
    this.toolResultMaxBytes =
      options.toolResultMaxBytes ?? CURSOR_TRANSLATOR_DEFAULT.TOOL_RESULT_MAX_BYTES;
  }

  translate(event: CursorStreamEvent): void {
    switch (event.type) {
      case CURSOR_STREAM_TYPE.SYSTEM: {
        this.emit("initialized", {
          sessionId: event.session_id,
          model: event.model,
          permissionMode: event.permissionMode,
        });
        return;
      }
      case CURSOR_STREAM_TYPE.USER: {
        const text = this.getMessageText(event.message.content);
        this.emit("sessionUpdate", {
          sessionId: event.session_id,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.USER_MESSAGE_CHUNK,
            content: { type: CONTENT_BLOCK_TYPE.TEXT, text },
          },
        });
        return;
      }
      case CURSOR_STREAM_TYPE.ASSISTANT: {
        const text = this.getMessageText(event.message.content);
        this.emit("sessionUpdate", {
          sessionId: event.session_id,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
            content: { type: CONTENT_BLOCK_TYPE.TEXT, text },
          },
        });
        return;
      }
      case CURSOR_STREAM_TYPE.TOOL_CALL: {
        if (event.subtype === CURSOR_STREAM_SUBTYPE.STARTED) {
          this.emitToolCallStart(event);
          return;
        }
        this.emitToolCallComplete(event);
        return;
      }
      case CURSOR_STREAM_TYPE.RESULT: {
        this.emit("result", {
          sessionId: event.session_id,
          text: event.result,
          durationMs: event.duration_ms,
          isError: event.is_error,
        });
        return;
      }
      default: {
        const unknownEvent = event satisfies never;
        this.emit("error", new Error(`Unsupported Cursor event: ${JSON.stringify(unknownEvent)}`));
      }
    }
  }

  private emitToolCallStart(
    event: Extract<CursorStreamEvent, { type: "tool_call"; subtype: "started" }>
  ): void {
    const extracted = this.extractToolCall(event.tool_call);
    this.emit("sessionUpdate", {
      sessionId: event.session_id,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
        toolCallId: event.call_id,
        title: extracted.toolName,
        rawInput: extracted.input,
        status: "in_progress", // ACP SDK tool call status
      },
    });
  }

  private emitToolCallComplete(
    event: Extract<CursorStreamEvent, { type: "tool_call"; subtype: "completed" }>
  ): void {
    const extracted = this.extractToolCall(event.tool_call);
    const toolStatus = this.isToolResultSuccess(extracted.output) ? "completed" : "failed";
    const { value, truncated, originalBytes } = this.truncateToolResult(extracted.output);

    if (truncated) {
      this.emit("toolResultTruncated", {
        sessionId: event.session_id,
        toolCallId: event.call_id,
        originalBytes,
        limitBytes: this.toolResultMaxBytes,
      });
    }

    this.emit("sessionUpdate", {
      sessionId: event.session_id,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
        toolCallId: event.call_id,
        title: extracted.toolName,
        rawInput: extracted.input,
        rawOutput: value,
        status: toolStatus, // ACP SDK tool call status
      },
    });
  }

  private extractToolCall(rawToolCall: Record<string, unknown>): CursorToolCallExtracted {
    const firstEntry = Object.entries(rawToolCall)[0];
    if (!firstEntry) {
      return {
        toolName: "unknown",
        input: {},
      };
    }

    const [toolKey, payload] = firstEntry;
    const normalizedName = this.normalizeToolName(toolKey);
    if (!this.isRecord(payload)) {
      return {
        toolName: normalizedName,
        input: {},
      };
    }

    const args = this.isRecord(payload.args) ? payload.args : {};
    return {
      toolName: normalizedName,
      input: args,
      output: payload.result,
    };
  }

  private normalizeToolName(toolCallKey: string): string {
    const normalized = TOOL_CALL_KEY_TO_NAME[toolCallKey];
    if (normalized) {
      return normalized;
    }
    return toolCallKey
      .replace(/ToolCall$/, "")
      .replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
  }

  private getMessageText(content: Array<{ type: string; text?: string }>): string {
    return content
      .filter((block) => block.type === CONTENT_BLOCK_TYPE.TEXT)
      .map((block) => block.text ?? "")
      .join("");
  }

  private isToolResultSuccess(output: unknown): boolean {
    if (!this.isRecord(output)) {
      return true;
    }
    if ("error" in output) {
      return false;
    }
    if ("success" in output) {
      return true;
    }
    return true;
  }

  private truncateToolResult(output: unknown): {
    value: unknown;
    truncated: boolean;
    originalBytes: number;
  } {
    if (output === undefined) {
      return { value: undefined, truncated: false, originalBytes: 0 };
    }

    if (typeof output === "string") {
      const originalBytes = Buffer.byteLength(output, "utf8");
      if (originalBytes <= this.toolResultMaxBytes) {
        return { value: output, truncated: false, originalBytes };
      }
      const truncated = this.truncateToByteLength(output, this.toolResultMaxBytes);
      return { value: truncated, truncated: true, originalBytes };
    }

    const serialized = JSON.stringify(output);
    if (!serialized) {
      return { value: output, truncated: false, originalBytes: 0 };
    }
    const serializedBytes = Buffer.byteLength(serialized, "utf8");
    if (serializedBytes <= this.toolResultMaxBytes) {
      return { value: output, truncated: false, originalBytes: serializedBytes };
    }

    const truncatedSerialized = this.truncateToByteLength(serialized, this.toolResultMaxBytes);
    return {
      value: truncatedSerialized,
      truncated: true,
      originalBytes: serializedBytes,
    };
  }

  private truncateToByteLength(text: string, limitBytes: number): string {
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}

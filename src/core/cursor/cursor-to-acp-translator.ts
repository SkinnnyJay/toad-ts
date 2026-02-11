import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_STREAM_SUBTYPE, CURSOR_STREAM_TYPE } from "@/constants/cursor-event-types";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { CliAgentBridge } from "@/core/cli-agent/cli-agent.bridge";
import { STREAM_EVENT_TYPE, type StreamEvent } from "@/types/cli-agent.types";
import type { CursorStreamEvent, CursorToolCallCompletedEvent } from "@/types/cursor-cli.types";
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
  private readonly bridge: CliAgentBridge;

  constructor(options: CursorToAcpTranslatorOptions = {}) {
    super();
    this.toolResultMaxBytes =
      options.toolResultMaxBytes ?? CURSOR_TRANSLATOR_DEFAULT.TOOL_RESULT_MAX_BYTES;
    this.bridge = new CliAgentBridge({
      toolResultMaxBytes: this.toolResultMaxBytes,
    });
    this.bridge.on("sessionUpdate", (update) => this.emit("sessionUpdate", update));
    this.bridge.on("error", (error) => this.emit("error", error));
    this.bridge.on("toolResultTruncated", (event) => this.emit("toolResultTruncated", event));
    this.bridge.on("result", (result) => {
      this.emit("result", {
        sessionId: result.sessionId,
        text: result.text,
        durationMs: result.durationMs ?? 0,
        isError: !result.success,
      });
    });
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
        this.bridge.translate({
          type: STREAM_EVENT_TYPE.TEXT_DELTA,
          sessionId: event.session_id,
          text,
        });
        return;
      }
      case CURSOR_STREAM_TYPE.TOOL_CALL: {
        this.bridge.translate(this.mapToolCallEvent(event));
        return;
      }
      case CURSOR_STREAM_TYPE.RESULT: {
        this.bridge.translate({
          type: STREAM_EVENT_TYPE.RESULT,
          sessionId: event.session_id,
          text: event.result,
          durationMs: event.duration_ms,
          success: !event.is_error,
        });
        return;
      }
      default: {
        const unknownEvent = event satisfies never;
        this.emit("error", new Error(`Unsupported Cursor event: ${JSON.stringify(unknownEvent)}`));
      }
    }
  }

  private mapToolCallEvent(event: Extract<CursorStreamEvent, { type: "tool_call" }>): StreamEvent {
    const extracted = this.extractToolCall(event.tool_call);
    if (event.subtype === CURSOR_STREAM_SUBTYPE.STARTED) {
      return {
        type: STREAM_EVENT_TYPE.TOOL_START,
        sessionId: event.session_id,
        toolCallId: event.call_id,
        toolName: extracted.toolName,
        toolInput: extracted.input,
      };
    }

    const completedEvent = event as CursorToolCallCompletedEvent;
    const success = this.isToolResultSuccess(completedEvent.tool_call);
    return {
      type: STREAM_EVENT_TYPE.TOOL_COMPLETE,
      sessionId: event.session_id,
      toolCallId: event.call_id,
      toolName: extracted.toolName,
      toolInput: extracted.input,
      success,
      result: extracted.output,
    };
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

  private isToolResultSuccess(rawToolCall: Record<string, unknown>): boolean {
    const extracted = this.extractToolCall(rawToolCall);
    const output = extracted.output;
    if (!this.isRecord(output)) {
      return true;
    }
    if ("error" in output) {
      const errorValue = output.error;
      return errorValue === undefined || errorValue === null;
    }
    if ("success" in output) {
      const successValue = output.success;
      if (typeof successValue === "boolean") {
        return successValue;
      }
      return successValue !== undefined && successValue !== null;
    }
    return true;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}

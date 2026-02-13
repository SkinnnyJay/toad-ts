import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { PERMISSION_OPTION_KIND } from "@/constants/permission-option-kinds";
import { PERMISSION } from "@/constants/permissions";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { STREAM_EVENT_TYPE, type StreamEvent } from "@/types/cli-agent.types";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import type { RequestPermissionRequest } from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";

const isTextualStreamEvent = (
  event: StreamEvent
): event is
  | Extract<StreamEvent, { type: typeof STREAM_EVENT_TYPE.TEXT_DELTA }>
  | Extract<StreamEvent, { type: typeof STREAM_EVENT_TYPE.THINKING_DELTA }> => {
  return (
    event.type === STREAM_EVENT_TYPE.TEXT_DELTA || event.type === STREAM_EVENT_TYPE.THINKING_DELTA
  );
};

const mapToolStatusToSessionStatus = (
  status: (typeof TOOL_CALL_STATUS)[keyof typeof TOOL_CALL_STATUS]
): "in_progress" | "completed" | "failed" => {
  if (status === TOOL_CALL_STATUS.FAILED) {
    return "failed";
  }
  if (status === TOOL_CALL_STATUS.RUNNING || status === TOOL_CALL_STATUS.PENDING) {
    return "in_progress";
  }
  return "completed";
};

const deriveToolKind = (toolName: string): string => {
  const normalized = toolName.toLowerCase();
  if (normalized.includes("read")) {
    return TOOL_KIND.READ;
  }
  if (
    normalized.includes("edit") ||
    normalized.includes("write") ||
    normalized.includes("patch") ||
    normalized.includes("replace")
  ) {
    return TOOL_KIND.EDIT;
  }
  if (normalized.includes("shell") || normalized.includes("bash") || normalized.includes("exec")) {
    return TOOL_KIND.EXECUTE;
  }
  return TOOL_KIND.OTHER;
};

const FALLBACK_TOOL_NAME = "unknown_tool";

const buildPermissionRequest = (
  sessionId: string,
  event: Extract<StreamEvent, { type: "permission_request" }>
): RequestPermissionRequest => {
  return {
    sessionId,
    toolCall: {
      toolCallId: event.toolCallId ?? event.requestId,
      title: event.toolName ?? FALLBACK_TOOL_NAME,
      kind: deriveToolKind(event.toolName ?? FALLBACK_TOOL_NAME),
      rawInput: event.payload,
    },
    options: [
      { optionId: PERMISSION.ALLOW, kind: PERMISSION_OPTION_KIND.ALLOW_ONCE },
      { optionId: PERMISSION.DENY, kind: PERMISSION_OPTION_KIND.REJECT_ONCE },
    ],
  };
};

export interface CliAgentBridgeEvents {
  sessionUpdate: (update: SessionNotification) => void;
  permissionRequest: (request: RequestPermissionRequest) => void;
  error: (error: Error) => void;
}

export class CliAgentBridge extends EventEmitter<CliAgentBridgeEvents> {
  private readonly toolNameByCallId = new Map<string, string>();

  public handleEvent(event: StreamEvent): void {
    const sessionId = event.sessionId;
    if (!sessionId) {
      if (event.type === STREAM_EVENT_TYPE.ERROR) {
        this.emit("error", new Error(event.message));
      }
      return;
    }

    if (isTextualStreamEvent(event)) {
      this.emit("sessionUpdate", {
        sessionId,
        update: {
          sessionUpdate:
            event.type === "thinking_delta"
              ? SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK
              : SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
          content: {
            type: CONTENT_BLOCK_TYPE.TEXT,
            text: event.delta,
          },
        },
      });
      return;
    }

    if (event.type === STREAM_EVENT_TYPE.TOOL_START) {
      this.toolNameByCallId.set(event.toolCallId, event.name);
      this.emit("sessionUpdate", {
        sessionId,
        update: {
          sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
          toolCallId: event.toolCallId,
          title: event.name,
          rawInput: event.arguments,
          status: "in_progress",
        },
      });
      return;
    }

    if (event.type === STREAM_EVENT_TYPE.TOOL_COMPLETE) {
      const title = this.toolNameByCallId.get(event.toolCallId) ?? FALLBACK_TOOL_NAME;
      this.emit("sessionUpdate", {
        sessionId,
        update: {
          sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
          toolCallId: event.toolCallId,
          title,
          rawOutput: event.result,
          status: mapToolStatusToSessionStatus(event.status),
        },
      });
      this.toolNameByCallId.delete(event.toolCallId);
      return;
    }

    if (event.type === STREAM_EVENT_TYPE.PERMISSION_REQUEST) {
      this.emit("permissionRequest", buildPermissionRequest(sessionId, event));
      return;
    }

    if (event.type === STREAM_EVENT_TYPE.ERROR) {
      this.emit("error", new Error(event.message));
    }
  }
}

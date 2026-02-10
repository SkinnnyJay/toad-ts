import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { ContentBlock } from "@/types/domain";
import { ToolCallIdSchema } from "@/types/domain";
import type { ToolCallStatus, ToolCallUpdate } from "@agentclientprotocol/sdk";

export type ToolCallLike = {
  toolCallId: string;
  rawInput?: unknown;
  rawOutput?: unknown;
  status?: ToolCallStatus | null;
  title?: string | null;
} & Partial<ToolCallUpdate>;

export const mapToolArguments = (rawInput: unknown): Record<string, unknown> => {
  if (rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)) {
    return rawInput as Record<string, unknown>;
  }
  return {};
};

export const mapToolStatus = (
  status?: ToolCallStatus | null
):
  | typeof TOOL_CALL_STATUS.PENDING
  | typeof TOOL_CALL_STATUS.RUNNING
  | typeof TOOL_CALL_STATUS.SUCCEEDED
  | typeof TOOL_CALL_STATUS.FAILED => {
  switch (status) {
    case "in_progress":
      return TOOL_CALL_STATUS.RUNNING;
    case "completed":
      return TOOL_CALL_STATUS.SUCCEEDED;
    case "failed":
      return TOOL_CALL_STATUS.FAILED;
    default:
      return TOOL_CALL_STATUS.PENDING;
  }
};

export const mapResourceSize = (size?: bigint | null): number | undefined => {
  if (typeof size === "bigint") {
    return Number(size);
  }
  if (typeof size === "number") {
    return size;
  }
  return undefined;
};

export const mapEmbeddedResource = (
  resource: { uri: string } & (
    | { text: string; mimeType?: string | null }
    | { blob: string; mimeType?: string | null }
  )
):
  | { uri: string; text: string; mimeType?: string }
  | { uri: string; blob: string; mimeType?: string } => {
  if ("text" in resource) {
    return {
      uri: resource.uri,
      text: resource.text,
      mimeType: resource.mimeType ?? undefined,
    };
  }

  return {
    uri: resource.uri,
    blob: resource.blob,
    mimeType: resource.mimeType ?? undefined,
  };
};

export const mapToolCall = (call: ToolCallLike): ContentBlock => {
  const name = "title" in call && call.title ? call.title : undefined;
  return {
    type: CONTENT_BLOCK_TYPE.TOOL_CALL,
    toolCallId: ToolCallIdSchema.parse(call.toolCallId),
    name,
    arguments: mapToolArguments(call.rawInput),
    status: mapToolStatus(call.status),
    result: call.rawOutput,
  };
};

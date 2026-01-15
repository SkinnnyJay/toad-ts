import { ContentBlockSchema } from "@/types/domain";
import type { ContentBlock, MessageId, SessionId, ToolCallId } from "@/types/domain";
import { EventEmitter } from "eventemitter3";

export interface RawContentUpdate {
  type: ContentBlock["type"];
  text?: string;
  language?: string;
  toolCallId?: ToolCallId;
  name?: string;
  uri?: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
  resource?: {
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  };
  arguments?: Record<string, unknown>;
  status?: "pending" | "running" | "succeeded" | "failed";
  result?: unknown;
}

export interface MessageUpdate {
  sessionId: SessionId;
  messageId: MessageId;
  role: "user" | "assistant" | "system";
  content: RawContentUpdate;
  isFinal?: boolean;
}

export interface MessageHandlerEvents {
  block: (payload: { sessionId: SessionId; messageId: MessageId; block: ContentBlock }) => void;
  done: (payload: { sessionId: SessionId; messageId: MessageId }) => void;
  error: (error: Error) => void;
}

export class MessageHandler extends EventEmitter<MessageHandlerEvents> {
  handle(update: MessageUpdate): void {
    try {
      const block = this.toContentBlock(update.content);
      this.emit("block", {
        sessionId: update.sessionId,
        messageId: update.messageId,
        block,
      });
      if (update.isFinal) {
        this.emit("done", { sessionId: update.sessionId, messageId: update.messageId });
      }
    } catch (error) {
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private toContentBlock(content: RawContentUpdate): ContentBlock {
    switch (content.type) {
      case "text":
      case "thinking":
        return ContentBlockSchema.parse({ type: content.type, text: content.text ?? "" });
      case "code":
        return ContentBlockSchema.parse({
          type: "code",
          text: content.text ?? "",
          language: content.language,
        });
      case "tool_call":
        return ContentBlockSchema.parse({
          type: "tool_call",
          toolCallId: content.toolCallId ?? ("unknown" as ToolCallId),
          name: content.name,
          arguments: content.arguments,
          status: content.status ?? "pending",
          result: content.result,
        });
      case "resource_link":
        return ContentBlockSchema.parse({
          type: "resource_link",
          uri: content.uri ?? "",
          name: content.name ?? content.uri ?? "resource",
          title: content.title,
          description: content.description,
          mimeType: content.mimeType,
          size: content.size,
        });
      case "resource":
        return ContentBlockSchema.parse({
          type: "resource",
          resource: content.resource ?? {
            uri: content.uri ?? "",
            text: content.text ?? "",
            mimeType: content.mimeType,
          },
        });
      default: {
        const exhaustive: never = content.type;
        return exhaustive;
      }
    }
  }
}

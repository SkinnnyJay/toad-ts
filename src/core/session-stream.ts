import type {
  ContentBlock as ACPContentBlock,
  SessionNotification,
  ToolCall,
  ToolCallStatus,
  ToolCallUpdate,
} from "@agentclientprotocol/sdk";
import { nanoid } from "nanoid";

import { MessageHandler } from "@/core/message-handler";
import type { AppStore } from "@/store/app-store";
import {
  type ContentBlock,
  type Message,
  type MessageId,
  MessageIdSchema,
  type MessageRole,
  type Session,
  type SessionId,
  SessionIdSchema,
  type ToolCallId,
  ToolCallIdSchema,
} from "@/types/domain";

const STREAM_FINAL_KEYS = ["isFinal", "final"] as const;

type StreamKind =
  | "user_message_chunk"
  | "agent_message_chunk"
  | "agent_thought_chunk"
  | "tool_call"
  | "tool_call_update";

type StreamKey = string;

type StoreAccess = Pick<
  AppStore,
  "appendMessage" | "updateMessage" | "upsertSession" | "getSession" | "getMessage"
>;

export interface SessionStreamOptions {
  messageHandler?: MessageHandler;
  now?: () => number;
  messageIdFactory?: () => MessageId;
}

export interface SessionUpdateSource {
  on(event: "sessionUpdate", handler: (update: SessionNotification) => void): void;
  off(event: "sessionUpdate", handler: (update: SessionNotification) => void): void;
}

export class SessionStream {
  private readonly handler: MessageHandler;
  private readonly now: () => number;
  private readonly messageIdFactory: () => MessageId;
  private readonly activeStreams = new Map<StreamKey, MessageId>();
  private readonly messageRoles = new Map<MessageId, MessageRole>();
  private readonly messageSessions = new Map<MessageId, SessionId>();

  constructor(
    private readonly store: StoreAccess,
    options: SessionStreamOptions = {}
  ) {
    this.handler = options.messageHandler ?? new MessageHandler();
    this.now = options.now ?? (() => Date.now());
    this.messageIdFactory =
      options.messageIdFactory ?? (() => MessageIdSchema.parse(`msg-${nanoid()}`));

    this.handler.on("block", (payload) => this.handleBlock(payload));
    this.handler.on("done", (payload) => this.handleDone(payload));
  }

  attach(source: SessionUpdateSource): () => void {
    const handler = (update: SessionNotification) => this.handleSessionUpdate(update);
    source.on("sessionUpdate", handler);
    return () => source.off("sessionUpdate", handler);
  }

  handleSessionUpdate(notification: SessionNotification): void {
    const sessionId = SessionIdSchema.parse(notification.sessionId);
    const update = notification.update;

    switch (update.sessionUpdate) {
      case "session_info_update":
        this.applySessionInfoUpdate(sessionId, update);
        return;
      case "agent_message_chunk":
        this.handleContentChunk(sessionId, "assistant", update, "message");
        return;
      case "user_message_chunk":
        this.handleContentChunk(sessionId, "user", update, "message");
        return;
      case "agent_thought_chunk":
        this.handleContentChunk(sessionId, "assistant", update, "thought");
        return;
      case "tool_call":
        this.handleToolCall(sessionId, update);
        return;
      case "tool_call_update":
        this.handleToolCallUpdate(sessionId, update);
        return;
      default:
        return;
    }
  }

  finalizeSession(sessionId: SessionId): void {
    const prefix = `${sessionId}:`;
    for (const [key, messageId] of this.activeStreams.entries()) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      this.finalizeStream(key, messageId, sessionId);
    }
  }

  private handleBlock(payload: {
    sessionId: SessionId;
    messageId: MessageId;
    block: ContentBlock;
  }): void {
    const existing = this.store.getMessage(payload.messageId);
    const role = this.messageRoles.get(payload.messageId) ?? "assistant";
    const sessionId = this.messageSessions.get(payload.messageId) ?? payload.sessionId;

    this.ensureSession(sessionId);

    if (existing) {
      this.store.updateMessage({
        messageId: payload.messageId,
        patch: {
          content: [...existing.content, payload.block],
          isStreaming: existing.isStreaming ?? true,
        },
      });
      return;
    }

    const message: Message = {
      id: payload.messageId,
      sessionId,
      role,
      content: [payload.block],
      createdAt: this.now(),
      isStreaming: true,
    };

    this.store.appendMessage(message);
  }

  private handleDone(payload: { sessionId: SessionId; messageId: MessageId }): void {
    const existing = this.store.getMessage(payload.messageId);
    if (!existing) {
      return;
    }

    this.store.updateMessage({
      messageId: payload.messageId,
      patch: { isStreaming: false },
    });
  }

  private handleContentChunk(
    sessionId: SessionId,
    role: MessageRole,
    update: {
      sessionUpdate: StreamKind;
      content: ACPContentBlock;
      _meta?: Record<string, unknown> | null;
    },
    mode: "message" | "thought"
  ): void {
    const key = this.buildStreamKey(sessionId, update.sessionUpdate);
    const messageId = this.getOrCreateMessageId(key, sessionId, role);
    const content = this.mapContentBlock(update.content, mode);

    this.handler.handle({
      sessionId,
      messageId,
      role,
      content,
      isFinal: this.shouldFinalize(update._meta),
    });

    if (this.shouldFinalize(update._meta)) {
      this.finalizeStream(key, messageId, sessionId);
    }
  }

  private handleToolCall(
    sessionId: SessionId,
    update: ToolCall & { sessionUpdate: "tool_call" }
  ): void {
    const toolCallId = ToolCallIdSchema.parse(update.toolCallId);
    const key = this.buildStreamKey(sessionId, update.sessionUpdate, toolCallId);
    const messageId = this.getOrCreateMessageId(key, sessionId, "assistant");

    this.handler.handle({
      sessionId,
      messageId,
      role: "assistant",
      content: this.mapToolCall(update),
      isFinal: this.shouldFinalizeToolStatus(update.status),
    });

    if (this.shouldFinalizeToolStatus(update.status)) {
      this.finalizeStream(key, messageId, sessionId);
    }
  }

  private handleToolCallUpdate(
    sessionId: SessionId,
    update: ToolCallUpdate & { sessionUpdate: "tool_call_update" }
  ): void {
    const toolCallId = ToolCallIdSchema.parse(update.toolCallId);
    const key = this.buildStreamKey(sessionId, "tool_call", toolCallId);
    const messageId = this.getOrCreateMessageId(key, sessionId, "assistant");

    this.handler.handle({
      sessionId,
      messageId,
      role: "assistant",
      content: this.mapToolCall(update),
      isFinal: this.shouldFinalizeToolStatus(update.status),
    });

    if (this.shouldFinalizeToolStatus(update.status)) {
      this.finalizeStream(key, messageId, sessionId);
    }
  }

  private applySessionInfoUpdate(
    sessionId: SessionId,
    update: { title?: string | null; updatedAt?: string | null }
  ): void {
    const existing = this.store.getSession(sessionId);
    const now = this.now();
    const updatedAt = update.updatedAt ? Date.parse(update.updatedAt) : now;

    const session: Session = {
      id: sessionId,
      title: update.title ?? existing?.title,
      agentId: existing?.agentId,
      messageIds: existing?.messageIds ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: Number.isNaN(updatedAt) ? now : updatedAt,
    };

    this.store.upsertSession({ session });
  }

  private ensureSession(sessionId: SessionId): void {
    if (this.store.getSession(sessionId)) {
      return;
    }

    const now = this.now();
    const session: Session = {
      id: sessionId,
      messageIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.store.upsertSession({ session });
  }

  private buildStreamKey(
    sessionId: SessionId,
    kind: StreamKind,
    toolCallId?: ToolCallId
  ): StreamKey {
    const suffix = toolCallId ? `:${toolCallId}` : "";
    return `${sessionId}:${kind}${suffix}`;
  }

  private getOrCreateMessageId(key: StreamKey, sessionId: SessionId, role: MessageRole): MessageId {
    const existing = this.activeStreams.get(key);
    if (existing) {
      return existing;
    }

    const messageId = this.messageIdFactory();
    this.activeStreams.set(key, messageId);
    this.messageRoles.set(messageId, role);
    this.messageSessions.set(messageId, sessionId);
    return messageId;
  }

  private finalizeStream(key: StreamKey, messageId: MessageId, sessionId: SessionId): void {
    this.activeStreams.delete(key);
    this.messageSessions.delete(messageId);
    this.messageRoles.delete(messageId);
    this.handleDone({ sessionId, messageId });
  }

  private shouldFinalize(meta?: Record<string, unknown> | null): boolean {
    if (!meta) {
      return false;
    }

    for (const key of STREAM_FINAL_KEYS) {
      if (key in meta && meta[key] === true) {
        return true;
      }
    }

    return false;
  }

  private shouldFinalizeToolStatus(status?: ToolCallStatus | null): boolean {
    return status === "completed" || status === "failed";
  }

  private mapContentBlock(block: ACPContentBlock, mode: "message" | "thought"): ContentBlock {
    switch (block.type) {
      case "text":
        return {
          type: mode === "thought" ? "thinking" : "text",
          text: block.text,
        };
      case "resource_link":
        return {
          type: "resource_link",
          uri: block.uri,
          name: block.name,
          title: block.title ?? undefined,
          description: block.description ?? undefined,
          mimeType: block.mimeType ?? undefined,
          size: this.mapResourceSize(block.size),
        };
      case "resource":
        return {
          type: "resource",
          resource: this.mapEmbeddedResource(block.resource),
        };
      case "image":
        return {
          type: "resource",
          resource: {
            uri: block.uri ?? "",
            blob: block.data,
            mimeType: block.mimeType,
          },
        };
      case "audio":
        return {
          type: "resource",
          resource: {
            uri: "",
            blob: block.data,
            mimeType: block.mimeType,
          },
        };
      default: {
        const exhaustive: never = block;
        return exhaustive;
      }
    }
  }

  private mapEmbeddedResource(
    resource: { uri: string } & (
      | { text: string; mimeType?: string | null }
      | { blob: string; mimeType?: string | null }
    )
  ):
    | { uri: string; text: string; mimeType?: string }
    | { uri: string; blob: string; mimeType?: string } {
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
  }

  private mapToolCall(call: ToolCall | ToolCallUpdate): ContentBlock {
    return {
      type: "tool_call",
      toolCallId: ToolCallIdSchema.parse(call.toolCallId),
      name: "title" in call ? (call.title ?? undefined) : undefined,
      arguments: this.mapToolArguments(call.rawInput),
      status: this.mapToolStatus(call.status),
      result: call.rawOutput,
    };
  }

  private mapToolArguments(rawInput: unknown): Record<string, unknown> {
    if (rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)) {
      return rawInput as Record<string, unknown>;
    }
    return {};
  }

  private mapToolStatus(
    status?: ToolCallStatus | null
  ): "pending" | "running" | "succeeded" | "failed" {
    switch (status) {
      case "in_progress":
        return "running";
      case "completed":
        return "succeeded";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  }

  private mapResourceSize(size?: bigint | null): number | undefined {
    if (typeof size === "bigint") {
      return Number(size);
    }
    if (typeof size === "number") {
      return size;
    }
    return undefined;
  }
}

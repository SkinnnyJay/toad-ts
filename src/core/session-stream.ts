import type {
  ContentBlock as ACPContentBlock,
  SessionNotification,
  ToolCall,
  ToolCallStatus,
  ToolCallUpdate,
} from "@agentclientprotocol/sdk";
import { nanoid } from "nanoid";

import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CONTENT_MODE } from "@/constants/content-modes";
import { SESSION_MODE } from "@/constants/session-modes";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { STREAM_METADATA_KEY } from "@/constants/stream-metadata";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { AgentPort } from "@/core/agent-port";
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

const STREAM_FINAL_KEYS = [STREAM_METADATA_KEY.IS_FINAL, STREAM_METADATA_KEY.FINAL] as const;

type StreamKind =
  | typeof SESSION_UPDATE_TYPE.USER_MESSAGE_CHUNK
  | typeof SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK
  | typeof SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK
  | typeof SESSION_UPDATE_TYPE.TOOL_CALL
  | typeof SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE;

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

  attach(port: AgentPort): () => void {
    const handler = (update: SessionNotification) => this.handleSessionUpdate(update);
    port.on("sessionUpdate", handler);
    return () => port.off("sessionUpdate", handler);
  }

  handleSessionUpdate(notification: SessionNotification): void {
    const sessionId = SessionIdSchema.parse(notification.sessionId);
    const update = notification.update;

    switch (update.sessionUpdate) {
      case SESSION_UPDATE_TYPE.SESSION_INFO_UPDATE:
        this.applySessionInfoUpdate(sessionId, update);
        return;
      case SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK:
        this.handleContentChunk(
          sessionId,
          "assistant" as MessageRole,
          update,
          CONTENT_MODE.MESSAGE
        );
        return;
      case SESSION_UPDATE_TYPE.USER_MESSAGE_CHUNK:
        this.handleContentChunk(sessionId, "user" as MessageRole, update, CONTENT_MODE.MESSAGE);
        return;
      case SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK:
        this.handleContentChunk(
          sessionId,
          "assistant" as MessageRole,
          update,
          CONTENT_MODE.THOUGHT
        );
        return;
      case SESSION_UPDATE_TYPE.TOOL_CALL:
        this.handleToolCall(sessionId, update);
        return;
      case SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE:
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
    const role = this.messageRoles.get(payload.messageId) ?? ("assistant" as MessageRole);
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
    mode: typeof CONTENT_MODE.MESSAGE | typeof CONTENT_MODE.THOUGHT
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
    update: ToolCall & { sessionUpdate: typeof SESSION_UPDATE_TYPE.TOOL_CALL }
  ): void {
    const messageKey = this.buildStreamKey(sessionId, SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK);
    const messageId = this.getOrCreateMessageId(messageKey, sessionId, "assistant");

    this.handler.handle({
      sessionId,
      messageId,
      role: "assistant",
      content: this.mapToolCall(update),
      isFinal: false,
    });
  }

  private handleToolCallUpdate(
    sessionId: SessionId,
    update: ToolCallUpdate & { sessionUpdate: typeof SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE }
  ): void {
    const messageKey = this.buildStreamKey(sessionId, SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK);
    const messageId = this.getOrCreateMessageId(messageKey, sessionId, "assistant");

    this.handler.handle({
      sessionId,
      messageId,
      role: "assistant",
      content: this.mapToolCall(update),
      isFinal: false,
    });
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
      mode: existing?.mode ?? "auto",
      metadata: existing?.metadata,
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
      mode: SESSION_MODE.AUTO,
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

  /**
   * Checks if a tool call status should trigger finalization.
   * Note: Uses ACP SDK status strings ("completed", "failed", "in_progress") which are external
   * protocol types. These are acceptable as literals per project rules for external library types.
   */

  private mapContentBlock(
    block: ACPContentBlock,
    mode: typeof CONTENT_MODE.MESSAGE | typeof CONTENT_MODE.THOUGHT
  ): ContentBlock {
    switch (block.type) {
      case "text":
        return {
          type:
            mode === CONTENT_MODE.THOUGHT ? CONTENT_BLOCK_TYPE.THINKING : CONTENT_BLOCK_TYPE.TEXT,
          text: block.text,
        };
      case "resource_link":
        return {
          type: CONTENT_BLOCK_TYPE.RESOURCE_LINK,
          uri: block.uri,
          name: block.name,
          title: block.title ?? undefined,
          description: block.description ?? undefined,
          mimeType: block.mimeType ?? undefined,
          size: this.mapResourceSize(block.size),
        };
      case "resource":
        return {
          type: CONTENT_BLOCK_TYPE.RESOURCE,
          resource: this.mapEmbeddedResource(block.resource),
        };
      case "image":
        return {
          type: CONTENT_BLOCK_TYPE.RESOURCE,
          resource: {
            uri: block.uri ?? "",
            blob: block.data,
            mimeType: block.mimeType ?? undefined,
          },
        };
      case "audio":
        return {
          type: CONTENT_BLOCK_TYPE.RESOURCE,
          resource: {
            uri: "",
            blob: block.data,
            mimeType: block.mimeType ?? undefined,
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
    const name = "title" in call && call.title ? call.title : undefined;
    return {
      type: CONTENT_BLOCK_TYPE.TOOL_CALL,
      toolCallId: ToolCallIdSchema.parse(call.toolCallId),
      name,
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
  ):
    | typeof TOOL_CALL_STATUS.PENDING
    | typeof TOOL_CALL_STATUS.RUNNING
    | typeof TOOL_CALL_STATUS.SUCCEEDED
    | typeof TOOL_CALL_STATUS.FAILED {
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

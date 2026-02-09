import { LIMIT } from "@/config/limits";
import { CHAT_MESSAGE } from "@/constants/chat-messages";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { SESSION_MODE } from "@/constants/session-modes";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { TOOL_NAME } from "@/constants/tool-names";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import type { ToolRuntime } from "@/tools/runtime";
import type { ShellCommandConfig } from "@/tools/shell-command-config";
import { parseShellCommandInput } from "@/tools/shell-command-config";
import type { Message, SessionId, SessionMode } from "@/types/domain";
import { MessageIdSchema, ToolCallIdSchema } from "@/types/domain";
import { nanoid } from "nanoid";
import { useCallback, useState } from "react";

export interface MessageSenderOptions {
  sessionMode: SessionMode;
  sessionId?: SessionId;
  effectiveSessionId: SessionId;
  client?: HarnessRuntime | null;
  appendMessage: (message: Message) => void;
  updateMessage: (params: { messageId: Message["id"]; patch: Partial<Message> }) => void;
  onPromptComplete?: (sessionId: SessionId) => void;
  handleSlashCommand: (value: string) => boolean;
  onResetInput: () => void;
  appendSystemMessage: (text: string) => void;
  toolRuntime: ToolRuntime;
  shellCommandConfig: ShellCommandConfig;
}

export interface MessageSenderResult {
  handleSubmit: (value: string) => void;
  modeWarning: string | null;
}

export const useMessageSender = ({
  sessionMode,
  sessionId,
  effectiveSessionId,
  client,
  appendMessage,
  updateMessage,
  onPromptComplete,
  handleSlashCommand,
  onResetInput,
  appendSystemMessage,
  toolRuntime,
  shellCommandConfig,
}: MessageSenderOptions): MessageSenderResult => {
  const [modeWarning, setModeWarning] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (value: string): void => {
      if (!value.trim()) return;
      if (handleSlashCommand(value)) {
        onResetInput();
        return;
      }

      const shellMatch = parseShellCommandInput(value, shellCommandConfig);
      if (shellMatch) {
        if (sessionMode === SESSION_MODE.READ_ONLY) {
          setModeWarning(CHAT_MESSAGE.READ_ONLY_WARNING);
          appendSystemMessage(CHAT_MESSAGE.READ_ONLY_WARNING);
          return;
        }

        setModeWarning(null);
        onResetInput();

        const now = Date.now();
        const toolCallId = ToolCallIdSchema.parse(`tool-${nanoid(LIMIT.NANOID_LENGTH)}`);
        const messageId = MessageIdSchema.parse(`tool-msg-${now}-${nanoid(LIMIT.NANOID_LENGTH)}`);
        const toolCallBlock = {
          type: CONTENT_BLOCK_TYPE.TOOL_CALL,
          toolCallId,
          name: TOOL_NAME.BASH,
          arguments: { command: shellMatch.command, background: shellMatch.background },
          status: TOOL_CALL_STATUS.RUNNING,
        } as const;

        appendMessage({
          id: messageId,
          sessionId: effectiveSessionId,
          role: MESSAGE_ROLE.ASSISTANT,
          content: [toolCallBlock],
          createdAt: now,
          isStreaming: true,
        });

        void toolRuntime.registry
          .execute(
            TOOL_NAME.BASH,
            { command: shellMatch.command, background: shellMatch.background },
            toolRuntime.context
          )
          .then((result) => {
            const status = result.ok
              ? shellMatch.background
                ? TOOL_CALL_STATUS.RUNNING
                : TOOL_CALL_STATUS.SUCCEEDED
              : TOOL_CALL_STATUS.FAILED;
            const updatedBlock = {
              ...toolCallBlock,
              status,
              result: result.ok ? result.output : { error: result.error },
            };
            updateMessage({
              messageId,
              patch: { content: [updatedBlock], isStreaming: shellMatch.background },
            });
          })
          .catch((error) => {
            updateMessage({
              messageId,
              patch: {
                content: [
                  {
                    ...toolCallBlock,
                    status: TOOL_CALL_STATUS.FAILED,
                    result: { error: error instanceof Error ? error.message : String(error) },
                  },
                ],
                isStreaming: false,
              },
            });
          });

        return;
      }
      if (sessionMode === SESSION_MODE.READ_ONLY) {
        setModeWarning(CHAT_MESSAGE.READ_ONLY_WARNING);
        return;
      }
      setModeWarning(null);

      const now = Date.now();
      const userMessage: Message = {
        id: MessageIdSchema.parse(`msg-${now}`),
        sessionId: effectiveSessionId,
        role: MESSAGE_ROLE.USER,
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: value }],
        createdAt: now,
        isStreaming: false,
      };
      appendMessage(userMessage);
      onResetInput();

      if (!client || !sessionId) {
        return;
      }

      void client
        .prompt({
          sessionId,
          prompt: [{ type: "text", text: value }],
        })
        .then(() => {
          onPromptComplete?.(sessionId);
        });
    },
    [
      appendMessage,
      appendSystemMessage,
      effectiveSessionId,
      handleSlashCommand,
      onPromptComplete,
      sessionMode,
      client,
      sessionId,
      onResetInput,
      shellCommandConfig,
      toolRuntime.context,
      toolRuntime.registry,
      updateMessage,
    ]
  );

  return { handleSubmit, modeWarning };
};

import { CHAT_MESSAGE } from "@/constants/chat-messages";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { SESSION_MODE } from "@/constants/session-modes";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import type { Message, SessionId, SessionMode } from "@/types/domain";
import { MessageIdSchema } from "@/types/domain";
import { useCallback, useState } from "react";

export interface MessageSenderOptions {
  sessionMode: SessionMode;
  sessionId?: SessionId;
  effectiveSessionId: SessionId;
  client?: HarnessRuntime | null;
  appendMessage: (message: Message) => void;
  onPromptComplete?: (sessionId: SessionId) => void;
  handleSlashCommand: (value: string) => boolean;
  onResetInput: () => void;
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
  onPromptComplete,
  handleSlashCommand,
  onResetInput,
}: MessageSenderOptions): MessageSenderResult => {
  const [modeWarning, setModeWarning] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (value: string): void => {
      if (!value.trim()) return;
      if (handleSlashCommand(value)) {
        onResetInput();
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
      handleSlashCommand,
      sessionMode,
      effectiveSessionId,
      appendMessage,
      client,
      sessionId,
      onPromptComplete,
      onResetInput,
    ]
  );

  return { handleSubmit, modeWarning };
};

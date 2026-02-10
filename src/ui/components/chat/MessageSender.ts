import type { AgentInfo } from "@/agents/agent-manager";
import { parseAgentMention } from "@/agents/agent-mentions";
import { LIMIT } from "@/config/limits";
import { CHAT_MESSAGE } from "@/constants/chat-messages";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { SESSION_MODE } from "@/constants/session-modes";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { TOOL_NAME } from "@/constants/tool-names";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import type { InteractiveShellResult } from "@/tools/interactive-shell";
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
  agents: AgentInfo[];
  currentAgent?: AgentInfo | null;
  appendMessage: (message: Message) => void;
  updateMessage: (params: { messageId: Message["id"]; patch: Partial<Message> }) => void;
  onPromptStart?: (sessionId: SessionId, prompt: string) => void;
  onPromptComplete?: (sessionId: SessionId) => void;
  handleSlashCommand: (value: string) => boolean;
  onResetInput: () => void;
  appendSystemMessage: (text: string) => void;
  toolRuntime: ToolRuntime;
  shellCommandConfig: ShellCommandConfig;
  runInteractiveShell: (command: string, cwd?: string) => Promise<InteractiveShellResult>;
  runSubAgent?: (
    agent: AgentInfo,
    prompt: string,
    parentSessionId: SessionId
  ) => Promise<SessionId>;
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
  agents,
  currentAgent,
  appendMessage,
  updateMessage,
  onPromptStart,
  onPromptComplete,
  handleSlashCommand,
  onResetInput,
  appendSystemMessage,
  toolRuntime,
  shellCommandConfig,
  runInteractiveShell,
  runSubAgent,
}: MessageSenderOptions): MessageSenderResult => {
  const [modeWarning, setModeWarning] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (value: string): void => {
      if (!value.trim()) return;
      if (handleSlashCommand(value)) {
        onResetInput();
        return;
      }

      const mention = parseAgentMention(value, agents, currentAgent);
      if (mention && runSubAgent) {
        if (sessionMode === SESSION_MODE.READ_ONLY) {
          setModeWarning(CHAT_MESSAGE.READ_ONLY_WARNING);
          appendSystemMessage(CHAT_MESSAGE.READ_ONLY_WARNING);
          return;
        }
        if (!sessionId) {
          appendSystemMessage(CHAT_MESSAGE.SUBAGENT_NO_SESSION);
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
        appendSystemMessage(`${CHAT_MESSAGE.SUBAGENT_DELEGATING} ${mention.agent.name}`);

        void runSubAgent(mention.agent, mention.prompt, sessionId)
          .then((childSessionId) => {
            appendSystemMessage(
              `${CHAT_MESSAGE.SUBAGENT_COMPLETE} ${childSessionId} (${mention.agent.name})`
            );
          })
          .catch((error) => {
            appendSystemMessage(
              `${CHAT_MESSAGE.SUBAGENT_FAILED} ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          });
        return;
      }

      const shellMatch = parseShellCommandInput(value, shellCommandConfig);
      if (shellMatch) {
        if (sessionMode === SESSION_MODE.READ_ONLY) {
          setModeWarning(CHAT_MESSAGE.READ_ONLY_WARNING);
          appendSystemMessage(CHAT_MESSAGE.READ_ONLY_WARNING);
          return;
        }

        if (shellMatch.interactive && shellMatch.background) {
          appendSystemMessage(CHAT_MESSAGE.INTERACTIVE_BACKGROUND_WARNING);
        }

        setModeWarning(null);
        onResetInput();

        const now = Date.now();
        const toolCallId = ToolCallIdSchema.parse(`tool-${nanoid(LIMIT.NANOID_LENGTH)}`);
        const messageId = MessageIdSchema.parse(`tool-msg-${now}-${nanoid(LIMIT.NANOID_LENGTH)}`);
        const background = shellMatch.interactive ? false : shellMatch.background;
        const toolCallBlock = {
          type: CONTENT_BLOCK_TYPE.TOOL_CALL,
          toolCallId,
          name: TOOL_NAME.BASH,
          arguments: { command: shellMatch.command, background },
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

        if (shellMatch.interactive) {
          void runInteractiveShell(shellMatch.command)
            .then((result) => {
              const succeeded = result.exitCode === 0;
              updateMessage({
                messageId,
                patch: {
                  content: [
                    {
                      ...toolCallBlock,
                      status: succeeded ? TOOL_CALL_STATUS.SUCCEEDED : TOOL_CALL_STATUS.FAILED,
                      result,
                    },
                  ],
                  isStreaming: false,
                },
              });
              appendSystemMessage(CHAT_MESSAGE.INTERACTIVE_SHELL_COMPLETE);
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

        void toolRuntime.registry
          .execute(TOOL_NAME.BASH, { command: shellMatch.command, background }, toolRuntime.context)
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

      onPromptStart?.(sessionId, value);

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
      agents,
      appendMessage,
      appendSystemMessage,
      currentAgent,
      effectiveSessionId,
      handleSlashCommand,
      onPromptComplete,
      onPromptStart,
      sessionMode,
      client,
      sessionId,
      onResetInput,
      runInteractiveShell,
      runSubAgent,
      shellCommandConfig,
      toolRuntime.context,
      toolRuntime.registry,
      updateMessage,
    ]
  );

  return { handleSubmit, modeWarning };
};

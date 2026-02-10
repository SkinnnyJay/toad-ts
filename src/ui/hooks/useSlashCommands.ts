import { LIMIT } from "@/config/limits";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { PLAN_STATUS } from "@/constants/plan-status";
import {
  SLASH_COMMAND_MESSAGE,
  formatModeUpdatedMessage,
  formatPlanCreatedMessage,
  formatUnknownCommandMessage,
} from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { TASK_STATUS } from "@/constants/task-status";
import { useAppStore } from "@/store/app-store";
import type { Plan, SessionId } from "@/types/domain";
import { MessageIdSchema, PlanIdSchema, SessionModeSchema, TaskIdSchema } from "@/types/domain";
import { nanoid } from "nanoid";
import { useCallback } from "react";

export interface UseSlashCommandsOptions {
  sessionId?: SessionId;
  effectiveSessionId: SessionId;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
}

export interface UseSlashCommandsResult {
  handleSlashCommand: (value: string) => boolean;
  appendSystemMessage: (text: string) => void;
}

/**
 * Parses a slash command string into command and arguments.
 */
export const parseSlashCommand = (
  value: string
): { command: string | undefined; args: string[] } => {
  if (!value.startsWith("/")) {
    return { command: undefined, args: [] };
  }
  const parts = value.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const args = parts.slice(1);
  return { command, args };
};

/**
 * Hook to handle slash commands in the chat input.
 * Provides command parsing and execution.
 */
export function useSlashCommands({
  sessionId,
  effectiveSessionId,
  onOpenSettings,
  onOpenHelp,
}: UseSlashCommandsOptions): UseSlashCommandsResult {
  const appendMessage = useAppStore((state) => state.appendMessage);
  const upsertSession = useAppStore((state) => state.upsertSession);
  const clearMessagesForSession = useAppStore((state) => state.clearMessagesForSession);
  const upsertPlan = useAppStore((state) => state.upsertPlan);

  const appendSystemMessage = useCallback(
    (text: string): void => {
      const now = Date.now();
      appendMessage({
        id: MessageIdSchema.parse(`sys-${now}`),
        sessionId: effectiveSessionId,
        role: MESSAGE_ROLE.SYSTEM,
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
        createdAt: now,
        isStreaming: false,
      });
    },
    [appendMessage, effectiveSessionId]
  );

  const handleSlashCommand = useCallback(
    (value: string): boolean => {
      const { command, args } = parseSlashCommand(value);
      if (!command) return false;

      if (!sessionId) {
        appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        return true;
      }

      switch (command) {
        case SLASH_COMMAND.HELP: {
          onOpenHelp?.();
          return true;
        }
        case SLASH_COMMAND.SETTINGS: {
          onOpenSettings?.();
          return true;
        }
        case SLASH_COMMAND.MODE: {
          const nextMode = args[0];
          const parsed = SessionModeSchema.safeParse(nextMode);
          if (!parsed.success) {
            appendSystemMessage(SLASH_COMMAND_MESSAGE.INVALID_MODE);
            return true;
          }
          const session = useAppStore.getState().getSession(sessionId);
          if (!session) {
            appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_SESSION_TO_UPDATE);
            return true;
          }
          upsertSession({ session: { ...session, mode: parsed.data } });
          appendSystemMessage(formatModeUpdatedMessage(parsed.data));
          return true;
        }
        case SLASH_COMMAND.CLEAR: {
          clearMessagesForSession(sessionId);
          appendSystemMessage(SLASH_COMMAND_MESSAGE.SESSION_CLEARED);
          return true;
        }
        case SLASH_COMMAND.PLAN: {
          const title = args.join(" ").trim() || "Plan";
          const now = Date.now();
          const planId = PlanIdSchema.parse(`plan-${nanoid(LIMIT.NANOID_LENGTH)}`);
          const planPayload: Plan = {
            id: planId,
            sessionId,
            originalPrompt: title,
            tasks: [
              {
                id: TaskIdSchema.parse(`task-${nanoid(LIMIT.NANOID_LENGTH)}`),
                planId,
                title,
                description: title,
                status: TASK_STATUS.PENDING,
                dependencies: [],
                result: undefined,
                createdAt: now,
              },
            ],
            status: PLAN_STATUS.PLANNING,
            createdAt: now,
            updatedAt: now,
          };
          upsertPlan(planPayload);
          appendSystemMessage(formatPlanCreatedMessage(title));
          return true;
        }
        default: {
          appendSystemMessage(formatUnknownCommandMessage(command ?? ""));
          return true;
        }
      }
    },
    [
      sessionId,
      appendSystemMessage,
      upsertSession,
      clearMessagesForSession,
      upsertPlan,
      onOpenSettings,
      onOpenHelp,
    ]
  );

  return {
    handleSlashCommand,
    appendSystemMessage,
  };
}

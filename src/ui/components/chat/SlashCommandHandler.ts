import { LIMIT } from "@/config/limits";
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
import type { Plan, Session, SessionId } from "@/types/domain";
import { PlanIdSchema, SessionModeSchema, TaskIdSchema } from "@/types/domain";
import { nanoid } from "nanoid";
import { useCallback } from "react";

export interface SlashCommandDeps {
  sessionId?: SessionId;
  appendSystemMessage: (text: string) => void;
  getSession: (sessionId: SessionId) => Session | undefined;
  upsertSession: (params: { session: Session }) => void;
  clearMessagesForSession: (sessionId: SessionId) => void;
  upsertPlan: (plan: Plan) => void;
  now?: () => number;
}

export const runSlashCommand = (value: string, deps: SlashCommandDeps): boolean => {
  if (!value.startsWith("/")) return false;
  const parts = value.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  if (!deps.sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return true;
  }

  switch (command) {
    case SLASH_COMMAND.HELP: {
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.HELP_SUMMARY);
      return true;
    }
    case SLASH_COMMAND.MODE: {
      const nextMode = parts[1];
      const parsed = SessionModeSchema.safeParse(nextMode);
      if (!parsed.success) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.INVALID_MODE);
        return true;
      }
      const session = deps.getSession(deps.sessionId);
      if (!session) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_SESSION_TO_UPDATE);
        return true;
      }
      deps.upsertSession({ session: { ...session, mode: parsed.data } });
      deps.appendSystemMessage(formatModeUpdatedMessage(parsed.data));
      return true;
    }
    case SLASH_COMMAND.CLEAR: {
      deps.clearMessagesForSession(deps.sessionId);
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.SESSION_CLEARED);
      return true;
    }
    case SLASH_COMMAND.PLAN: {
      const title = parts.slice(1).join(" ").trim() || "Plan";
      const now = deps.now?.() ?? Date.now();
      const planId = PlanIdSchema.parse(`plan-${nanoid(LIMIT.NANOID_LENGTH)}`);
      const planPayload: Plan = {
        id: planId,
        sessionId: deps.sessionId,
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
      deps.upsertPlan(planPayload);
      deps.appendSystemMessage(formatPlanCreatedMessage(title));
      return true;
    }
    default: {
      deps.appendSystemMessage(formatUnknownCommandMessage(command ?? ""));
      return true;
    }
  }
};

export interface SlashCommandHandlerOptions {
  sessionId?: SessionId;
  appendSystemMessage: (text: string) => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  now?: () => number;
}

export const useSlashCommandHandler = ({
  sessionId,
  appendSystemMessage,
  onOpenSettings,
  onOpenHelp,
  now,
}: SlashCommandHandlerOptions): ((value: string) => boolean) => {
  const getSession = useAppStore((state) => state.getSession);
  const upsertSession = useAppStore((state) => state.upsertSession);
  const clearMessagesForSession = useAppStore((state) => state.clearMessagesForSession);
  const upsertPlan = useAppStore((state) => state.upsertPlan);

  return useCallback(
    (value: string): boolean => {
      if (!value.startsWith("/")) return false;
      const command = value.trim().split(/\s+/)[0]?.toLowerCase();
      if (command === SLASH_COMMAND.HELP) {
        onOpenHelp?.();
        return true;
      }
      if (command === SLASH_COMMAND.SETTINGS) {
        onOpenSettings?.();
        return true;
      }
      return runSlashCommand(value, {
        sessionId,
        appendSystemMessage,
        getSession,
        upsertSession,
        clearMessagesForSession,
        upsertPlan,
        now,
      });
    },
    [
      sessionId,
      appendSystemMessage,
      getSession,
      upsertSession,
      clearMessagesForSession,
      upsertPlan,
      onOpenHelp,
      onOpenSettings,
      now,
    ]
  );
};

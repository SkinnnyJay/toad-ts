import type { AgentInfo } from "@/agents/agent-manager";
import { LIMIT } from "@/config/limits";
import { PLAN_STATUS } from "@/constants/plan-status";
import {
  SLASH_COMMAND_MESSAGE,
  formatModeUpdatedMessage,
  formatModelCurrentMessage,
  formatModelUpdateFailedMessage,
  formatModelUpdatedMessage,
  formatPlanCreatedMessage,
  formatSessionCreateFailedMessage,
  formatSessionCreatedMessage,
  formatSessionListMessage,
  formatSessionRenamedMessage,
  formatThinkingMessage,
  formatToolDetailsMessage,
  formatUnknownCommandMessage,
} from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { TASK_STATUS } from "@/constants/task-status";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { SessionManager } from "@/core/session-manager";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { useAppStore } from "@/store/app-store";
import type { Plan, Session, SessionId } from "@/types/domain";
import { PlanIdSchema, SessionModeSchema, TaskIdSchema } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { nanoid } from "nanoid";
import { useCallback } from "react";

export interface SlashCommandDeps {
  sessionId?: SessionId;
  appendSystemMessage: (text: string) => void;
  getSession: (sessionId: SessionId) => Session | undefined;
  listSessions: () => Session[];
  upsertSession: (params: { session: Session }) => void;
  clearMessagesForSession: (sessionId: SessionId) => void;
  upsertPlan: (plan: Plan) => void;
  openSessions?: () => void;
  createSession?: (title?: string) => Promise<SessionId | null>;
  setSessionModel?: (modelId: string) => Promise<void>;
  toggleToolDetails?: () => boolean;
  toggleThinking?: () => boolean;
  now?: () => number;
}

export const runSlashCommand = (value: string, deps: SlashCommandDeps): boolean => {
  if (!value.startsWith("/")) return false;
  const parts = value.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const allowsWithoutSession =
    command === SLASH_COMMAND.HELP ||
    command === SLASH_COMMAND.SETTINGS ||
    command === SLASH_COMMAND.CONNECT ||
    command === SLASH_COMMAND.SESSIONS ||
    command === SLASH_COMMAND.NEW;
  if (!deps.sessionId && !allowsWithoutSession) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return true;
  }

  switch (command) {
    case SLASH_COMMAND.HELP: {
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.HELP_SUMMARY);
      return true;
    }
    case SLASH_COMMAND.SESSIONS: {
      if (deps.openSessions) {
        deps.openSessions();
        return true;
      }
      deps.appendSystemMessage(formatSessionListMessage(deps.listSessions()));
      return true;
    }
    case SLASH_COMMAND.NEW: {
      if (!deps.createSession) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_CLIENT);
        return true;
      }
      const title = parts.slice(1).join(" ").trim();
      void deps
        .createSession(title.length > 0 ? title : undefined)
        .then((sessionId) => {
          if (sessionId) {
            deps.appendSystemMessage(formatSessionCreatedMessage(sessionId));
          }
        })
        .catch((error) => {
          deps.appendSystemMessage(
            formatSessionCreateFailedMessage(error instanceof Error ? error.message : String(error))
          );
        });
      return true;
    }
    case SLASH_COMMAND.DETAILS: {
      const enabled = deps.toggleToolDetails?.();
      if (enabled === undefined) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_CLIENT);
        return true;
      }
      deps.appendSystemMessage(formatToolDetailsMessage(enabled));
      return true;
    }
    case SLASH_COMMAND.MODE: {
      if (!deps.sessionId) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        return true;
      }
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
    case SLASH_COMMAND.MODELS: {
      const modelId = parts.slice(1).join(" ").trim();
      if (!modelId) {
        const session = deps.sessionId ? deps.getSession(deps.sessionId) : undefined;
        const currentModel = session?.metadata?.model;
        if (!currentModel) {
          deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_MODEL_CONFIGURED);
        } else {
          deps.appendSystemMessage(formatModelCurrentMessage(currentModel));
        }
        return true;
      }
      if (!deps.setSessionModel) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_CLIENT);
        return true;
      }
      void deps
        .setSessionModel(modelId)
        .then(() => deps.appendSystemMessage(formatModelUpdatedMessage(modelId)))
        .catch((error) =>
          deps.appendSystemMessage(
            formatModelUpdateFailedMessage(error instanceof Error ? error.message : String(error))
          )
        );
      return true;
    }
    case SLASH_COMMAND.CLEAR: {
      if (!deps.sessionId) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        return true;
      }
      deps.clearMessagesForSession(deps.sessionId);
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.SESSION_CLEARED);
      return true;
    }
    case SLASH_COMMAND.PLAN: {
      if (!deps.sessionId) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        return true;
      }
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
    case SLASH_COMMAND.RENAME: {
      const title = parts.slice(1).join(" ").trim();
      if (!title) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.SESSION_RENAME_MISSING);
        return true;
      }
      if (!deps.sessionId) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        return true;
      }
      const session = deps.getSession(deps.sessionId);
      if (!session) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_SESSION_TO_UPDATE);
        return true;
      }
      deps.upsertSession({
        session: {
          ...session,
          title,
          updatedAt: deps.now?.() ?? Date.now(),
        },
      });
      deps.appendSystemMessage(formatSessionRenamedMessage(title));
      return true;
    }
    case SLASH_COMMAND.THINKING: {
      const enabled = deps.toggleThinking?.();
      if (enabled === undefined) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_CLIENT);
        return true;
      }
      deps.appendSystemMessage(formatThinkingMessage(enabled));
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
  onOpenSessions?: () => void;
  client?: HarnessRuntime | null;
  agent?: AgentInfo;
  now?: () => number;
}

export const useSlashCommandHandler = ({
  sessionId,
  appendSystemMessage,
  onOpenSettings,
  onOpenHelp,
  onOpenSessions,
  client,
  agent,
  now,
}: SlashCommandHandlerOptions): ((value: string) => boolean) => {
  const getSession = useAppStore((state) => state.getSession);
  const listSessions = useAppStore((state) => Object.values(state.sessions));
  const upsertSession = useAppStore((state) => state.upsertSession);
  const clearMessagesForSession = useAppStore((state) => state.clearMessagesForSession);
  const upsertPlan = useAppStore((state) => state.upsertPlan);
  const setShowToolDetails = useAppStore((state) => state.setShowToolDetails);
  const setShowThinking = useAppStore((state) => state.setShowThinking);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);

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
      if (command === SLASH_COMMAND.CONNECT) {
        onOpenSettings?.();
        return true;
      }
      return runSlashCommand(value, {
        sessionId,
        appendSystemMessage,
        getSession,
        listSessions: () => listSessions.filter((session): session is Session => Boolean(session)),
        upsertSession,
        clearMessagesForSession,
        upsertPlan,
        openSessions: onOpenSessions,
        createSession: async (title?: string) => {
          if (!client) {
            throw new Error(SLASH_COMMAND_MESSAGE.NO_ACTIVE_CLIENT);
          }
          const sessionManager = new SessionManager(client, useAppStore.getState());
          const mcpConfig = await loadMcpConfig();
          const env = EnvManager.getInstance().getSnapshot();
          const session = await sessionManager.createSession({
            cwd: process.cwd(),
            agentId: agent?.id,
            title: title ?? agent?.name,
            mcpConfig,
            env,
            mode: agent?.sessionMode,
            model: agent?.model,
            temperature: agent?.temperature,
          });
          setCurrentSession(session.id);
          return session.id;
        },
        setSessionModel: async (modelId: string) => {
          if (!client?.setSessionModel || !sessionId) {
            throw new Error("Session model switching not supported.");
          }
          await client.setSessionModel({ sessionId, modelId });
          const session = getSession(sessionId);
          if (session) {
            const metadata = {
              mcpServers: session.metadata?.mcpServers ?? [],
              model: modelId,
              ...(session.metadata?.temperature !== undefined
                ? { temperature: session.metadata.temperature }
                : {}),
              ...(session.metadata?.parentSessionId
                ? { parentSessionId: session.metadata.parentSessionId }
                : {}),
            };
            upsertSession({ session: { ...session, metadata } });
          }
        },
        toggleToolDetails: () => {
          const current = useAppStore.getState().uiState.showToolDetails;
          const next = !current;
          setShowToolDetails(next);
          return next;
        },
        toggleThinking: () => {
          const current = useAppStore.getState().uiState.showThinking;
          const next = !current;
          setShowThinking(next);
          return next;
        },
        now,
      });
    },
    [
      sessionId,
      appendSystemMessage,
      getSession,
      listSessions,
      upsertSession,
      clearMessagesForSession,
      upsertPlan,
      onOpenHelp,
      onOpenSettings,
      onOpenSessions,
      client,
      agent,
      setShowToolDetails,
      setShowThinking,
      setCurrentSession,
      now,
    ]
  );
};

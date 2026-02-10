import { LIMIT } from "@/config/limits";
import { ENV_KEY } from "@/constants/env-keys";
import { PLAN_STATUS } from "@/constants/plan-status";
import { REWIND_MODE } from "@/constants/rewind-modes";
import {
  SLASH_COMMAND_MESSAGE,
  formatCompactionCompleteMessage,
  formatContextMessage,
  formatCostMessage,
  formatDebugMessage,
  formatDoctorMessage,
  formatModeUpdatedMessage,
  formatModelCurrentMessage,
  formatModelListMessage,
  formatModelUpdateFailedMessage,
  formatModelUpdatedMessage,
  formatPlanCreatedMessage,
  formatSessionCreateFailedMessage,
  formatSessionCreatedMessage,
  formatSessionListMessage,
  formatSessionRenamedMessage,
  formatStatsMessage,
  formatThinkingMessage,
  formatToolDetailsMessage,
  formatUnknownCommandMessage,
  formatVimModeMessage,
} from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { TASK_STATUS } from "@/constants/task-status";
import type { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import type { Message, MessageId, Plan, Session, SessionId } from "@/types/domain";
import { PlanIdSchema, SessionModeSchema, TaskIdSchema } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { nanoid } from "nanoid";

import {
  runCopyCommand,
  runMemoryCommand,
  runShareCommand,
  runUnshareCommand,
} from "./slash-command-actions";
import {
  handleRedoCommand,
  handleRewindCommand,
  handleUndoCommand,
} from "./slash-command-checkpoints";
import { buildContextStats } from "./slash-command-helpers";

export interface SlashCommandDeps {
  sessionId?: SessionId;
  appendSystemMessage: (text: string) => void;
  appendMessage?: (message: Message) => void;
  getSession: (sessionId: SessionId) => Session | undefined;
  getMessagesForSession: (sessionId: SessionId) => Message[];
  getPlanBySession: (sessionId: SessionId) => Plan | undefined;
  listSessions: () => Session[];
  upsertSession: (params: { session: Session }) => void;
  clearMessagesForSession: (sessionId: SessionId) => void;
  removeMessages?: (sessionId: SessionId, messageIds: MessageId[]) => void;
  upsertPlan: (plan: Plan) => void;
  openSessions?: () => void;
  createSession?: (title?: string) => Promise<SessionId | null>;
  setSessionModel?: (modelId: string) => Promise<void>;
  toggleToolDetails?: () => boolean;
  toggleThinking?: () => boolean;
  openEditor?: (initialValue: string) => Promise<void>;
  openThemes?: () => void;
  openMemoryFile?: (filePath: string) => Promise<boolean>;
  copyToClipboard?: (text: string) => Promise<boolean>;
  runCompaction?: (sessionId: SessionId) => Promise<SessionId | null>;
  runSummary?: (prompt: string, sessionId: SessionId) => Promise<SessionId | null>;
  checkpointManager?: CheckpointManager;
  toggleVimMode?: () => boolean;
  connectionStatus?: string;
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
    command === SLASH_COMMAND.NEW ||
    command === SLASH_COMMAND.DOCTOR ||
    command === SLASH_COMMAND.DEBUG ||
    command === SLASH_COMMAND.STATS ||
    command === SLASH_COMMAND.MEMORY ||
    command === SLASH_COMMAND.THEMES ||
    command === SLASH_COMMAND.VIM;
  if (!deps.sessionId && !allowsWithoutSession) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return true;
  }

  switch (command) {
    case SLASH_COMMAND.HELP: {
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.HELP_SUMMARY);
      return true;
    }
    case SLASH_COMMAND.DOCTOR: {
      const env = EnvManager.getInstance().getSnapshot();
      const checks = [
        `Connection: ${deps.connectionStatus ?? "unknown"}`,
        `Anthropic API key: ${env[ENV_KEY.ANTHROPIC_API_KEY] ? "set" : "missing"}`,
        `OpenAI API key: ${env[ENV_KEY.OPENAI_API_KEY] ? "set" : "missing"}`,
        `Editor: ${env[ENV_KEY.VISUAL] ?? env[ENV_KEY.EDITOR] ?? "default"}`,
      ];
      deps.appendSystemMessage(formatDoctorMessage(checks));
      return true;
    }
    case SLASH_COMMAND.DEBUG: {
      const session = deps.sessionId ? deps.getSession(deps.sessionId) : undefined;
      const messages = deps.sessionId ? deps.getMessagesForSession(deps.sessionId) : [];
      const plan = deps.sessionId ? deps.getPlanBySession(deps.sessionId) : undefined;
      const lines = [
        `Session: ${deps.sessionId ?? "none"}`,
        `Agent: ${session?.agentId ?? "unknown"}`,
        `Mode: ${session?.mode ?? "unknown"}`,
        `Messages: ${messages.length}`,
        `Plan: ${plan ? plan.status : "none"}`,
      ];
      deps.appendSystemMessage(formatDebugMessage(lines));
      return true;
    }
    case SLASH_COMMAND.STATS: {
      const sessions = deps.listSessions();
      const sessionCount = sessions.length;
      const messageCount = deps.sessionId ? deps.getMessagesForSession(deps.sessionId).length : 0;
      const lines = [`Sessions: ${sessionCount}`, `Current session messages: ${messageCount}`];
      deps.appendSystemMessage(formatStatsMessage(lines));
      return true;
    }
    case SLASH_COMMAND.EDITOR: {
      if (!deps.openEditor) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.EDITOR_NOT_CONFIGURED);
        return true;
      }
      const initialValue = parts.slice(1).join(" ");
      void deps.openEditor(initialValue);
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
    case SLASH_COMMAND.CONTEXT: {
      if (!deps.sessionId) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        return true;
      }
      const messages = deps.getMessagesForSession(deps.sessionId);
      const stats = buildContextStats(messages);
      const blockCount = messages.reduce((sum, message) => sum + message.content.length, 0);
      const lines = [
        `Messages: ${messages.length}`,
        `Blocks: ${blockCount}`,
        `Tokens (est): ${stats.tokens}`,
        `Chars: ${stats.chars}`,
        `Bytes: ${stats.bytes}`,
      ];
      deps.appendSystemMessage(formatContextMessage(lines));
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
        const availableModels = session?.metadata?.availableModels ?? [];
        if (availableModels.length > 0) {
          deps.appendSystemMessage(formatModelListMessage(availableModels, currentModel));
        } else if (!currentModel) {
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
    case SLASH_COMMAND.COST: {
      if (!deps.sessionId) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        return true;
      }
      const messages = deps.getMessagesForSession(deps.sessionId);
      const stats = buildContextStats(messages);
      const lines = ["Cost tracking not configured.", `Tokens (est): ${stats.tokens}`];
      deps.appendSystemMessage(formatCostMessage(lines));
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
    case SLASH_COMMAND.VIM: {
      const enabled = deps.toggleVimMode?.();
      if (enabled === undefined) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.VIM_NOT_AVAILABLE);
        return true;
      }
      deps.appendSystemMessage(formatVimModeMessage(enabled));
      return true;
    }
    case SLASH_COMMAND.COMPACT: {
      if (!deps.sessionId) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        return true;
      }
      if (!deps.runCompaction) {
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COMPACT_FAILED);
        return true;
      }
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COMPACT_STARTING);
      void deps
        .runCompaction(deps.sessionId)
        .then((compactionSessionId) => {
          if (compactionSessionId) {
            deps.appendSystemMessage(formatCompactionCompleteMessage(compactionSessionId));
          } else {
            deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COMPACT_FAILED);
          }
        })
        .catch(() => deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COMPACT_FAILED));
      return true;
    }
    case SLASH_COMMAND.MEMORY: {
      void runMemoryCommand(parts[1]?.toLowerCase(), {
        appendSystemMessage: deps.appendSystemMessage,
        openMemoryFile: deps.openMemoryFile,
      });
      return true;
    }
    case SLASH_COMMAND.COPY: {
      void runCopyCommand(deps.sessionId, {
        appendSystemMessage: deps.appendSystemMessage,
        copyToClipboard: deps.copyToClipboard,
        getMessagesForSession: deps.getMessagesForSession,
      });
      return true;
    }
    case SLASH_COMMAND.SHARE: {
      void runShareCommand(deps.sessionId, {
        appendSystemMessage: deps.appendSystemMessage,
        getSession: deps.getSession,
        getMessagesForSession: deps.getMessagesForSession,
      });
      return true;
    }
    case SLASH_COMMAND.UNSHARE: {
      void runUnshareCommand(deps.sessionId, {
        appendSystemMessage: deps.appendSystemMessage,
      });
      return true;
    }
    case SLASH_COMMAND.UNDO: {
      void handleUndoCommand(
        {
          sessionId: deps.sessionId,
          checkpointManager: deps.checkpointManager,
          appendSystemMessage: deps.appendSystemMessage,
          getMessagesForSession: deps.getMessagesForSession,
          runSummary: deps.runSummary,
        },
        REWIND_MODE.BOTH
      );
      return true;
    }
    case SLASH_COMMAND.REDO: {
      void handleRedoCommand(
        {
          sessionId: deps.sessionId,
          checkpointManager: deps.checkpointManager,
          appendSystemMessage: deps.appendSystemMessage,
          getMessagesForSession: deps.getMessagesForSession,
          runSummary: deps.runSummary,
        },
        REWIND_MODE.BOTH
      );
      return true;
    }
    case SLASH_COMMAND.REWIND: {
      void handleRewindCommand(parts.slice(1), {
        sessionId: deps.sessionId,
        checkpointManager: deps.checkpointManager,
        appendSystemMessage: deps.appendSystemMessage,
        getMessagesForSession: deps.getMessagesForSession,
        runSummary: deps.runSummary,
      });
      return true;
    }
    case SLASH_COMMAND.THEMES: {
      if (deps.openThemes) {
        deps.openThemes();
        return true;
      }
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.THEMES_NOT_AVAILABLE);
      return true;
    }
    default: {
      deps.appendSystemMessage(formatUnknownCommandMessage(command ?? ""));
      return true;
    }
  }
};

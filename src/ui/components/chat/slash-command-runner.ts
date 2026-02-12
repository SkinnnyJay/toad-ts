import { LIMIT } from "@/config/limits";
import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { PLAN_STATUS } from "@/constants/plan-status";
import { REWIND_MODE } from "@/constants/rewind-modes";
import {
  SLASH_COMMAND_MESSAGE,
  formatAgentSessionListMessage,
  formatCompactionCompleteMessage,
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
  formatSessionSwitchFailedMessage,
  formatSessionSwitchedMessage,
  formatThinkingMessage,
  formatToolDetailsMessage,
  formatUnknownCommandMessage,
  formatVimModeMessage,
} from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { TASK_STATUS } from "@/constants/task-status";
import { parseModelsCommandResult } from "@/core/agent-management/models-command-result";
import { parseAgentManagementSessionsFromCommandResult } from "@/core/agent-management/session-list-command-result";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import type {
  AgentManagementCommandResult,
  AgentManagementSession,
} from "@/types/agent-management.types";
import type { Message, MessageId, Plan, Session, SessionId } from "@/types/domain";
import { PlanIdSchema, SessionIdSchema, SessionModeSchema, TaskIdSchema } from "@/types/domain";
import { type SessionSwitchSeed, toSessionSwitchSeed } from "@/ui/utils/session-switcher";
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
import {
  handleContextCommand,
  handleCostCommand,
  handleDebugCommand,
  handleDoctorCommand,
  handleStatsCommand,
} from "./slash-command-diagnostics";
import { handleExportSlashCommand, handleImportSlashCommand } from "./slash-command-export-import";
import {
  handleAddDirCommand,
  handleAgentCommand,
  handleConfigCommand,
  handleInitCommand,
  handleLoginCommand,
  handleLogoutCommand,
  handleMcpCommand,
  handlePermissionsCommand,
  handleReviewCommand,
  handleSecurityReviewCommand,
  handleStatusCommand,
} from "./slash-command-extended";
export interface SlashCommandDeps {
  sessionId?: SessionId;
  appendSystemMessage: (text: string) => void;
  appendMessage?: (message: Message) => void;
  getSession: (sessionId: SessionId) => Session | undefined;
  getMessagesForSession: (sessionId: SessionId) => Message[];
  getPlanBySession: (sessionId: SessionId) => Plan | undefined;
  getContextAttachments?: (sessionId: SessionId) => string[];
  restoreSessionSnapshot?: (session: Session, messages: Message[], plan?: Plan) => void;
  setContextAttachments?: (sessionId: SessionId, attachments: string[]) => void;
  listSessions: () => Session[];
  upsertSession: (params: { session: Session }) => void;
  clearMessagesForSession: (sessionId: SessionId) => void;
  removeMessages?: (sessionId: SessionId, messageIds: MessageId[]) => void;
  upsertPlan: (plan: Plan) => void;
  openSessions?: () => void;
  createSession?: (title?: string) => Promise<SessionId | null>;
  switchToSession?: (sessionId: SessionId, seedSession?: SessionSwitchSeed) => boolean;
  setSessionModel?: (modelId: string) => Promise<void>;
  toggleToolDetails?: () => boolean;
  toggleThinking?: () => boolean;
  openEditor?: (initialValue: string) => Promise<void>;
  openSettings?: () => void;
  openThemes?: () => void;
  openContext?: () => void;
  openHooks?: () => void;
  openProgress?: () => void;
  openAgents?: () => void;
  openSkills?: () => void;
  openCommands?: () => void;
  openMemoryFile?: (filePath: string) => Promise<boolean>;
  copyToClipboard?: (text: string) => Promise<boolean>;
  runCompaction?: (sessionId: SessionId) => Promise<SessionId | null>;
  runSummary?: (prompt: string, sessionId: SessionId) => Promise<SessionId | null>;
  checkpointManager?: CheckpointManager;
  harnesses?: Record<string, HarnessConfig>;
  activeHarnessId?: string;
  activeAgentName?: string;
  runAgentCommand?: (args: string[]) => Promise<AgentManagementCommandResult>;
  listAgentSessions?: () => Promise<AgentManagementSession[]>;
  listCloudAgents?: () => Promise<number>;
  toggleVimMode?: () => boolean;
  connectionStatus?: string;
  now?: () => number;
}

const toNormalizedOptionalString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized;
};

export const runSlashCommand = (value: string, deps: SlashCommandDeps): boolean => {
  if (!value.startsWith("/")) return false;
  const parts = value.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const allowsWithoutSession =
    command === SLASH_COMMAND.HELP ||
    command === SLASH_COMMAND.SETTINGS ||
    command === SLASH_COMMAND.CONFIG ||
    command === SLASH_COMMAND.CONNECT ||
    command === SLASH_COMMAND.SESSIONS ||
    command === SLASH_COMMAND.NEW ||
    command === SLASH_COMMAND.DOCTOR ||
    command === SLASH_COMMAND.DEBUG ||
    command === SLASH_COMMAND.STATS ||
    command === SLASH_COMMAND.STATUS ||
    command === SLASH_COMMAND.MEMORY ||
    command === SLASH_COMMAND.THEMES ||
    command === SLASH_COMMAND.HOOKS ||
    command === SLASH_COMMAND.PROGRESS ||
    command === SLASH_COMMAND.AGENTS ||
    command === SLASH_COMMAND.SKILLS ||
    command === SLASH_COMMAND.COMMANDS ||
    command === SLASH_COMMAND.VIM ||
    command === SLASH_COMMAND.IMPORT ||
    command === SLASH_COMMAND.INIT ||
    command === SLASH_COMMAND.LOGIN ||
    command === SLASH_COMMAND.LOGOUT ||
    command === SLASH_COMMAND.AGENT ||
    command === SLASH_COMMAND.MCP ||
    command === SLASH_COMMAND.MODEL ||
    command === SLASH_COMMAND.MODELS ||
    command === SLASH_COMMAND.PERMISSIONS;
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
      handleDoctorCommand(deps);
      return true;
    }
    case SLASH_COMMAND.DEBUG: {
      handleDebugCommand(deps);
      return true;
    }
    case SLASH_COMMAND.STATS: {
      handleStatsCommand(deps);
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
      const targetSessionId = parts.slice(1).join(" ").trim();
      if (targetSessionId.length > 0) {
        if (!deps.switchToSession) {
          deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.SESSION_SWITCH_NOT_AVAILABLE);
          return true;
        }
        const parsedSessionId = SessionIdSchema.parse(targetSessionId);
        const switched = deps.switchToSession(parsedSessionId);
        if (switched) {
          deps.appendSystemMessage(formatSessionSwitchedMessage(targetSessionId));
          const hydrateSwitchFromSessions = (sessions: AgentManagementSession[]): void => {
            const seed = sessions.find((session) => session.id.trim() === targetSessionId);
            if (!seed) {
              return;
            }
            const switchSeed = toSessionSwitchSeed(seed);
            if (!switchSeed) {
              return;
            }
            deps.switchToSession?.(parsedSessionId, switchSeed);
          };
          if (deps.activeHarnessId === HARNESS_DEFAULT.CURSOR_CLI_ID && deps.listAgentSessions) {
            void deps
              .listAgentSessions()
              .then((sessions) => hydrateSwitchFromSessions(sessions))
              .catch(() => undefined);
          } else if (
            deps.activeHarnessId === HARNESS_DEFAULT.CURSOR_CLI_ID &&
            deps.runAgentCommand
          ) {
            void deps
              .runAgentCommand([AGENT_MANAGEMENT_COMMAND.LIST])
              .then((result) => parseAgentManagementSessionsFromCommandResult(result))
              .then((sessions) => hydrateSwitchFromSessions(sessions))
              .catch(() => undefined);
          }
        } else {
          deps.appendSystemMessage(formatSessionSwitchFailedMessage(targetSessionId));
        }
        return true;
      }

      if (deps.openSessions) {
        deps.openSessions();
      }
      deps.appendSystemMessage(formatSessionListMessage(deps.listSessions()));

      if (
        deps.activeHarnessId !== HARNESS_DEFAULT.CURSOR_CLI_ID ||
        (!deps.listAgentSessions && !deps.runAgentCommand)
      ) {
        return true;
      }

      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.SESSIONS_FETCHING);
      if (deps.listAgentSessions) {
        void deps
          .listAgentSessions()
          .then((sessions) => {
            deps.appendSystemMessage(formatAgentSessionListMessage(sessions));
          })
          .catch((error) => {
            deps.appendSystemMessage(
              `${SLASH_COMMAND_MESSAGE.SESSIONS_NOT_AVAILABLE} ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          });
      } else if (deps.runAgentCommand) {
        void deps
          .runAgentCommand([AGENT_MANAGEMENT_COMMAND.LIST])
          .then((result) => {
            const sessions = parseAgentManagementSessionsFromCommandResult(result);
            deps.appendSystemMessage(formatAgentSessionListMessage(sessions));
          })
          .catch((error) => {
            deps.appendSystemMessage(
              `${SLASH_COMMAND_MESSAGE.SESSIONS_NOT_AVAILABLE} ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          });
      }
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
      handleContextCommand(deps);
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
    case SLASH_COMMAND.MODEL:
    case SLASH_COMMAND.MODELS: {
      const modelId = parts.slice(1).join(" ").trim();
      if (!modelId) {
        const session = deps.sessionId ? deps.getSession(deps.sessionId) : undefined;
        const currentModel = toNormalizedOptionalString(session?.metadata?.model);
        const availableModels = session?.metadata?.availableModels ?? [];
        if (availableModels.length > 0) {
          deps.appendSystemMessage(formatModelListMessage(availableModels, currentModel));
          return true;
        }
        if (!deps.runAgentCommand) {
          if (!currentModel) {
            deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_MODEL_CONFIGURED);
            return true;
          }
          deps.appendSystemMessage(formatModelCurrentMessage(currentModel));
          return true;
        }
        deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.MODELS_FETCHING);
        void deps
          .runAgentCommand([AGENT_MANAGEMENT_COMMAND.MODELS])
          .then((result) => {
            const parsed = (() => {
              try {
                return parseModelsCommandResult(result);
              } catch (error) {
                deps.appendSystemMessage(
                  `${SLASH_COMMAND_MESSAGE.MODELS_NOT_AVAILABLE} ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
                return null;
              }
            })();
            if (!parsed) {
              return;
            }
            if (parsed.models.length === 0) {
              deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_MODELS_AVAILABLE);
              return;
            }
            const parsedCurrentModel = parsed.models.find((model) => model.isDefault)?.id;
            const normalizedModels = parsed.models.map((model) => ({
              modelId: model.id,
              name: model.name,
            }));
            if (deps.sessionId) {
              const activeSession = deps.getSession(deps.sessionId);
              if (activeSession) {
                const model =
                  toNormalizedOptionalString(activeSession.metadata?.model) ?? parsedCurrentModel;
                const metadataBase = {
                  ...(activeSession.metadata ?? { mcpServers: [] }),
                  mcpServers: activeSession.metadata?.mcpServers ?? [],
                };
                deps.upsertSession({
                  session: {
                    ...activeSession,
                    metadata: {
                      ...metadataBase,
                      ...(model ? { model } : {}),
                      availableModels: normalizedModels,
                    },
                  },
                });
              }
            }
            deps.appendSystemMessage(
              formatModelListMessage(normalizedModels, currentModel ?? parsedCurrentModel)
            );
          })
          .catch((error) => {
            deps.appendSystemMessage(
              `${SLASH_COMMAND_MESSAGE.MODELS_NOT_AVAILABLE} ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          });
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
      handleCostCommand(deps);
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
    case SLASH_COMMAND.EXPORT: {
      handleExportSlashCommand(deps, parts[1]);
      return true;
    }
    case SLASH_COMMAND.IMPORT: {
      handleImportSlashCommand(deps, parts[1]);
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
    case SLASH_COMMAND.HOOKS: {
      if (deps.openHooks) {
        deps.openHooks();
        return true;
      }
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.HOOKS_NOT_AVAILABLE);
      return true;
    }
    case SLASH_COMMAND.PROGRESS: {
      if (deps.openProgress) {
        deps.openProgress();
        return true;
      }
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.PROGRESS_NOT_AVAILABLE);
      return true;
    }
    case SLASH_COMMAND.AGENTS: {
      if (deps.openAgents) {
        deps.openAgents();
        return true;
      }
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.AGENTS_NOT_AVAILABLE);
      return true;
    }
    case SLASH_COMMAND.SKILLS: {
      if (deps.openSkills) {
        deps.openSkills();
        return true;
      }
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.SKILLS_NOT_AVAILABLE);
      return true;
    }
    case SLASH_COMMAND.COMMANDS: {
      if (deps.openCommands) {
        deps.openCommands();
        return true;
      }
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COMMANDS_NOT_AVAILABLE);
      return true;
    }
    case SLASH_COMMAND.ADD_DIR: {
      handleAddDirCommand(parts, deps);
      return true;
    }
    case SLASH_COMMAND.PERMISSIONS: {
      handlePermissionsCommand(deps);
      return true;
    }
    case SLASH_COMMAND.STATUS: {
      handleStatusCommand(deps);
      return true;
    }
    case SLASH_COMMAND.LOGIN: {
      handleLoginCommand(deps);
      return true;
    }
    case SLASH_COMMAND.LOGOUT: {
      handleLogoutCommand(deps);
      return true;
    }
    case SLASH_COMMAND.MCP: {
      handleMcpCommand(parts, deps);
      return true;
    }
    case SLASH_COMMAND.AGENT: {
      handleAgentCommand(parts, deps);
      return true;
    }
    case SLASH_COMMAND.CONFIG: {
      handleConfigCommand(deps);
      return true;
    }
    case SLASH_COMMAND.INIT: {
      handleInitCommand(deps);
      return true;
    }
    case SLASH_COMMAND.REVIEW: {
      handleReviewCommand(deps);
      return true;
    }
    case SLASH_COMMAND.SECURITY_REVIEW: {
      handleSecurityReviewCommand(deps);
      return true;
    }
    default: {
      deps.appendSystemMessage(formatUnknownCommandMessage(command ?? ""));
      return true;
    }
  }
};

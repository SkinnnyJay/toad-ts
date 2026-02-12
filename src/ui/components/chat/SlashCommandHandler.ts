import type { AgentInfo } from "@/agents/agent-manager";
import { findHiddenAgentBySuffix } from "@/agents/agent-utils";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { TIMEOUT } from "@/config/timeouts";
import { COMPACTION, SUMMARY } from "@/constants/agent-ids";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENCODING } from "@/constants/encodings";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { SessionMode } from "@/constants/session-modes";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { CursorCloudAgentClient } from "@/core/cursor/cloud-agent-client";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { SessionManager } from "@/core/session-manager";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import type { HarnessConfig } from "@/harness/harnessConfig";
import { useAppStore } from "@/store/app-store";
import type { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import { CursorCloudAgentSchema } from "@/types/cursor-cloud.types";
import type { Message, Session, SessionId } from "@/types/domain";
import { SessionModeSchema } from "@/types/domain";
import { withSessionModel } from "@/ui/utils/session-model-metadata";
import { toSessionModelOptionsFromCloudResponse } from "@/ui/utils/session-model-refresh";
import { type SessionSwitchSeed, switchToSessionWithFallback } from "@/ui/utils/session-switcher";
import { copyToClipboard } from "@/utils/clipboard/clipboard.utils";
import { openExternalEditorForFile } from "@/utils/editor/externalEditor";
import { EnvManager } from "@/utils/env/env.utils";
import { useRenderer } from "@opentui/react";
import { execa } from "execa";
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { runSlashCommand } from "./slash-command-runner";

export { runSlashCommand } from "./slash-command-runner";
export type { SlashCommandDeps } from "./slash-command-runner";

export interface SlashCommandHandlerOptions {
  sessionId?: SessionId;
  appendSystemMessage: (text: string) => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenSessions?: () => void;
  onOpenEditor?: (initialValue: string) => Promise<void>;
  onOpenAgentSelect?: () => void;
  onOpenThemes?: () => void;
  onOpenCloudAgents?: () => void;
  onOpenMcpServers?: () => void;
  onOpenContext?: () => void;
  onOpenHooks?: () => void;
  onOpenProgress?: () => void;
  onOpenAgents?: () => void;
  onOpenSkills?: () => void;
  onOpenCommands?: () => void;
  onToggleVimMode?: () => boolean;
  checkpointManager?: CheckpointManager;
  client?: HarnessRuntime | null;
  agent?: AgentInfo;
  agents?: AgentInfo[];
  subAgentRunner?: SubAgentRunner;
  harnesses?: Record<string, HarnessConfig>;
  now?: () => number;
}

export const useSlashCommandHandler = ({
  sessionId,
  appendSystemMessage,
  onOpenSettings,
  onOpenHelp,
  onOpenSessions,
  onOpenEditor,
  onOpenAgentSelect,
  onOpenThemes,
  onOpenCloudAgents,
  onOpenMcpServers,
  onOpenContext,
  onOpenHooks,
  onOpenProgress,
  onOpenAgents,
  onOpenSkills,
  onOpenCommands,
  onToggleVimMode,
  checkpointManager,
  client,
  agent,
  agents = [],
  subAgentRunner,
  harnesses,
  now,
}: SlashCommandHandlerOptions): ((value: string) => boolean) => {
  const renderer = useRenderer();
  const getSession = useAppStore((state) => state.getSession);
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);
  const getPlanBySession = useAppStore((state) => state.getPlanBySession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const listSessions = useAppStore(useShallow((state) => Object.values(state.sessions)));
  const upsertSession = useAppStore((state) => state.upsertSession);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const clearMessagesForSession = useAppStore((state) => state.clearMessagesForSession);
  const removeMessages = useAppStore((state) => state.removeMessages);
  const upsertPlan = useAppStore((state) => state.upsertPlan);
  const setShowToolDetails = useAppStore((state) => state.setShowToolDetails);
  const setShowThinking = useAppStore((state) => state.setShowThinking);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);
  const getContextAttachments = useAppStore((state) => state.getContextAttachments);
  const setContextAttachments = useAppStore((state) => state.setContextAttachments);
  const restoreSessionSnapshot = useAppStore((state) => state.restoreSessionSnapshot);

  const openMemoryFile = useCallback(
    (filePath: string) =>
      openExternalEditorForFile({
        filePath,
        renderer,
        cwd: process.cwd(),
      }),
    [renderer]
  );

  const extractSummary = useCallback((messages: Message[]): string => {
    const assistantMessages = messages.filter(
      (message) => message.role === MESSAGE_ROLE.ASSISTANT && !message.isStreaming
    );
    const latest = assistantMessages[assistantMessages.length - 1];
    if (!latest) {
      return "";
    }
    return latest.content
      .filter((block) => block.type === CONTENT_BLOCK_TYPE.TEXT)
      .map((block) => block.text ?? "")
      .join("\n")
      .trim();
  }, []);

  const waitForCompactionSummary = useCallback(
    async (compactionSessionId: SessionId): Promise<string> => {
      return new Promise((resolve, reject) => {
        const attemptResolve = (): boolean => {
          const messages = useAppStore.getState().getMessagesForSession(compactionSessionId);
          const summary = extractSummary(messages);
          if (!summary) {
            return false;
          }
          resolve(summary);
          return true;
        };

        if (attemptResolve()) {
          return;
        }

        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error("Compaction summary timed out."));
        }, TIMEOUT.COMPACTION_SUMMARY_MS);

        const unsubscribe = useAppStore.subscribe(() => {
          if (attemptResolve()) {
            clearTimeout(timeout);
            unsubscribe();
          }
        });
      });
    },
    [extractSummary]
  );

  const recordCompactionSummary = useCallback(
    async (parentSessionId: SessionId, compactionSessionId: SessionId) => {
      try {
        const summary = await waitForCompactionSummary(compactionSessionId);
        const session = getSession(parentSessionId);
        if (!session) {
          return;
        }
        upsertSession({
          session: {
            ...session,
            metadata: {
              mcpServers: session.metadata?.mcpServers ?? [],
              model: session.metadata?.model,
              temperature: session.metadata?.temperature,
              parentSessionId: session.metadata?.parentSessionId,
              availableModels: session.metadata?.availableModels,
              compactionSessionId,
              compactionSummary: summary,
            },
          },
        });
      } catch (_error) {
        // Ignore compaction summary failures
      }
    },
    [getSession, upsertSession, waitForCompactionSummary]
  );

  const runCompaction = useCallback(
    async (targetSessionId: SessionId) => {
      if (!subAgentRunner) {
        return null;
      }
      const compactionAgent = findHiddenAgentBySuffix(agents, COMPACTION, agent?.harnessId);
      if (!compactionAgent) {
        return null;
      }
      const compactionSessionId = await subAgentRunner.run({
        parentSessionId: targetSessionId,
        agent: compactionAgent,
        prompt: "Summarize the session for compaction.",
      });
      void recordCompactionSummary(targetSessionId, compactionSessionId);
      return compactionSessionId;
    },
    [agent?.harnessId, agents, recordCompactionSummary, subAgentRunner]
  );

  const runSummary = useCallback(
    async (prompt: string, targetSessionId: SessionId) => {
      if (!subAgentRunner) {
        return null;
      }
      const summaryAgent = findHiddenAgentBySuffix(agents, SUMMARY, agent?.harnessId);
      if (!summaryAgent) {
        return null;
      }
      return subAgentRunner.run({
        parentSessionId: targetSessionId,
        agent: summaryAgent,
        prompt,
      });
    },
    [agent?.harnessId, agents, subAgentRunner]
  );

  const runAgentCommand = useCallback(
    async (args: string[]): Promise<AgentManagementCommandResult> => {
      if (client?.runAgentCommand) {
        return client.runAgentCommand(args);
      }
      if (!agent) {
        throw new Error(SLASH_COMMAND_MESSAGE.AGENT_COMMAND_NOT_AVAILABLE);
      }
      if (!harnesses) {
        throw new Error(SLASH_COMMAND_MESSAGE.AGENT_COMMAND_NOT_AVAILABLE);
      }
      const harness = harnesses[agent.harnessId];
      if (!harness) {
        throw new Error(`No harness config for ${agent.harnessId}.`);
      }
      const snapshot = EnvManager.getInstance().getSnapshot();
      const command =
        agent.harnessId === HARNESS_DEFAULT.CLAUDE_CLI_ID &&
        harness.command === HARNESS_DEFAULT.CLAUDE_COMMAND
          ? "claude"
          : harness.command;
      const result = await execa(command, args, {
        cwd: harness.cwd ?? process.cwd(),
        env: {
          ...snapshot,
          ...harness.env,
        },
        reject: false,
        encoding: ENCODING.UTF8,
        timeout: TIMEOUT.HOOK_PROMPT_MS,
      });
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode ?? 1,
      };
    },
    [agent, client, harnesses]
  );

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
        if (onOpenAgentSelect) {
          onOpenAgentSelect();
        } else {
          onOpenSettings?.();
        }
        return true;
      }
      const listAgentSessions = client?.listAgentSessions;
      return runSlashCommand(value, {
        sessionId,
        appendSystemMessage,
        appendMessage,
        getSession,
        getMessagesForSession,
        getPlanBySession,
        listSessions: () => listSessions.filter((session): session is Session => Boolean(session)),
        upsertSession,
        clearMessagesForSession,
        removeMessages,
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
        switchToSession: (targetSessionId, seedSession?: SessionSwitchSeed) => {
          return switchToSessionWithFallback({
            targetSessionId,
            getSession,
            upsertSession,
            setCurrentSession,
            agent,
            seedSession,
            now,
          });
        },
        setSessionModel: async (modelId: string) => {
          if (!client?.setSessionModel || !sessionId) {
            throw new Error("Session model switching not supported.");
          }
          await client.setSessionModel({ sessionId, modelId });
          const session = getSession(sessionId);
          if (session) {
            upsertSession({ session: withSessionModel(session, modelId) });
          }
        },
        setSessionMode: async (modeId: SessionMode) => {
          if (!client?.setSessionMode || !sessionId) {
            throw new Error("Session mode switching not supported.");
          }
          const mode = SessionModeSchema.parse(modeId);
          await client.setSessionMode({ sessionId, modeId: mode });
          const session = getSession(sessionId);
          if (session) {
            upsertSession({ session: { ...session, mode } });
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
        toggleVimMode: onToggleVimMode,
        openEditor: onOpenEditor,
        openSettings: onOpenSettings,
        openThemes: onOpenThemes,
        openCloudAgents: onOpenCloudAgents,
        openMcpPanel: onOpenMcpServers,
        openContext: onOpenContext,
        openHooks: onOpenHooks,
        openProgress: onOpenProgress,
        openAgents: onOpenAgents,
        openSkills: onOpenSkills,
        openCommands: onOpenCommands,
        openMemoryFile,
        copyToClipboard,
        runCompaction,
        runSummary,
        checkpointManager,
        harnesses,
        activeHarnessId: agent?.harnessId,
        activeAgentName: agent?.name,
        runAgentCommand,
        listAgentSessions: listAgentSessions ?? undefined,
        listCloudAgents:
          agent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID
            ? async () => {
                const cloudClient = new CursorCloudAgentClient();
                const response = await cloudClient.listAgents({ limit: 100 });
                return Array.isArray(response.agents) ? response.agents.length : 0;
              }
            : undefined,
        listCloudModels:
          agent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID
            ? async () => {
                const cloudClient = new CursorCloudAgentClient();
                const response = await cloudClient.listModels();
                return toSessionModelOptionsFromCloudResponse(response);
              }
            : undefined,
        listCloudAgentItems:
          agent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID
            ? async () => {
                const cloudClient = new CursorCloudAgentClient();
                const response = await cloudClient.listAgents({ limit: 20 });
                const rawAgents = Array.isArray(response.agents) ? response.agents : [];
                return rawAgents.map((rawAgent) => {
                  const cloudAgent = CursorCloudAgentSchema.parse(rawAgent);
                  return {
                    id: cloudAgent.id,
                    status: cloudAgent.status,
                    model: cloudAgent.model,
                    updatedAt: cloudAgent.updated_at,
                  };
                });
              }
            : undefined,
        getCloudAgentItem:
          agent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID
            ? async (agentId) => {
                const cloudClient = new CursorCloudAgentClient();
                const response = CursorCloudAgentSchema.parse(await cloudClient.getAgent(agentId));
                return {
                  id: response.id,
                  status: response.status,
                  model: response.model,
                };
              }
            : undefined,
        stopCloudAgentItem:
          agent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID
            ? async (agentId) => {
                const cloudClient = new CursorCloudAgentClient();
                return cloudClient.stopAgent(agentId);
              }
            : undefined,
        followupCloudAgentItem:
          agent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID
            ? async (agentId, prompt) => {
                const cloudClient = new CursorCloudAgentClient();
                return cloudClient.addFollowup(agentId, { prompt });
              }
            : undefined,
        connectionStatus,
        getContextAttachments,
        setContextAttachments,
        restoreSessionSnapshot,
        now,
      });
    },
    [
      sessionId,
      appendSystemMessage,
      appendMessage,
      getSession,
      getMessagesForSession,
      getPlanBySession,
      connectionStatus,
      listSessions,
      upsertSession,
      clearMessagesForSession,
      removeMessages,
      upsertPlan,
      onOpenHelp,
      onOpenSettings,
      onOpenSessions,
      onOpenEditor,
      onOpenAgentSelect,
      onOpenThemes,
      onOpenCloudAgents,
      onOpenMcpServers,
      onOpenContext,
      onOpenHooks,
      onOpenProgress,
      onOpenAgents,
      onOpenSkills,
      onOpenCommands,
      onToggleVimMode,
      checkpointManager,
      client,
      agent,
      openMemoryFile,
      runCompaction,
      runSummary,
      runAgentCommand,
      setShowToolDetails,
      setShowThinking,
      setCurrentSession,
      getContextAttachments,
      setContextAttachments,
      restoreSessionSnapshot,
      harnesses,
      now,
    ]
  );
};

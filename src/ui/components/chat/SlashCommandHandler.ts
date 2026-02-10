import type { AgentInfo } from "@/agents/agent-manager";
import { findHiddenAgentBySuffix } from "@/agents/agent-utils";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { COMPACTION, SUMMARY } from "@/constants/agent-ids";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { SessionManager } from "@/core/session-manager";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { useAppStore } from "@/store/app-store";
import type { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import type { Session, SessionId } from "@/types/domain";
import { copyToClipboard } from "@/utils/clipboard/clipboard.utils";
import { openExternalEditorForFile } from "@/utils/editor/externalEditor";
import { EnvManager } from "@/utils/env/env.utils";
import { useRenderer } from "@opentui/react";
import { useCallback } from "react";
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
  checkpointManager?: CheckpointManager;
  client?: HarnessRuntime | null;
  agent?: AgentInfo;
  agents?: AgentInfo[];
  subAgentRunner?: SubAgentRunner;
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
  checkpointManager,
  client,
  agent,
  agents = [],
  subAgentRunner,
  now,
}: SlashCommandHandlerOptions): ((value: string) => boolean) => {
  const renderer = useRenderer();
  const getSession = useAppStore((state) => state.getSession);
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);
  const getPlanBySession = useAppStore((state) => state.getPlanBySession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const listSessions = useAppStore((state) => Object.values(state.sessions));
  const upsertSession = useAppStore((state) => state.upsertSession);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const clearMessagesForSession = useAppStore((state) => state.clearMessagesForSession);
  const removeMessages = useAppStore((state) => state.removeMessages);
  const upsertPlan = useAppStore((state) => state.upsertPlan);
  const setShowToolDetails = useAppStore((state) => state.setShowToolDetails);
  const setShowThinking = useAppStore((state) => state.setShowThinking);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);

  const openMemoryFile = useCallback(
    (filePath: string) =>
      openExternalEditorForFile({
        filePath,
        renderer,
        cwd: process.cwd(),
      }),
    [renderer]
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
      return subAgentRunner.run({
        parentSessionId: targetSessionId,
        agent: compactionAgent,
        prompt: "Summarize the session for compaction.",
      });
    },
    [agent?.harnessId, agents, subAgentRunner]
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
              ...(session.metadata?.availableModels
                ? { availableModels: session.metadata.availableModels }
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
        openEditor: onOpenEditor,
        openThemes: onOpenThemes,
        openMemoryFile,
        copyToClipboard,
        runCompaction,
        runSummary,
        checkpointManager,
        connectionStatus,
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
      checkpointManager,
      client,
      agent,
      openMemoryFile,
      runCompaction,
      runSummary,
      setShowToolDetails,
      setShowThinking,
      setCurrentSession,
      now,
    ]
  );
};

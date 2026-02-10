import type { AgentInfo } from "@/agents/agent-manager";
import { findHiddenAgentBySuffix } from "@/agents/agent-utils";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { TIMEOUT } from "@/config/timeouts";
import { COMPACTION, SUMMARY } from "@/constants/agent-ids";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { SessionManager } from "@/core/session-manager";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { useAppStore } from "@/store/app-store";
import type { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import type { Message, Session, SessionId } from "@/types/domain";
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
  onOpenContext?: () => void;
  onOpenHooks?: () => void;
  onToggleVimMode?: () => boolean;
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
  onOpenContext,
  onOpenHooks,
  onToggleVimMode,
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
        toggleVimMode: onToggleVimMode,
        openEditor: onOpenEditor,
        openThemes: onOpenThemes,
        openContext: onOpenContext,
        openHooks: onOpenHooks,
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
      onOpenContext,
      onOpenHooks,
      onToggleVimMode,
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

import type { AgentInfo } from "@/agents/agent-manager";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { SessionManager } from "@/core/session-manager";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { useAppStore } from "@/store/app-store";
import type { Session, SessionId } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
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
  onOpenEditor,
  client,
  agent,
  now,
}: SlashCommandHandlerOptions): ((value: string) => boolean) => {
  const getSession = useAppStore((state) => state.getSession);
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);
  const getPlanBySession = useAppStore((state) => state.getPlanBySession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
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
        getMessagesForSession,
        getPlanBySession,
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
        connectionStatus,
        now,
      });
    },
    [
      sessionId,
      appendSystemMessage,
      getSession,
      getMessagesForSession,
      getPlanBySession,
      connectionStatus,
      listSessions,
      upsertSession,
      clearMessagesForSession,
      upsertPlan,
      onOpenHelp,
      onOpenSettings,
      onOpenSessions,
      onOpenEditor,
      client,
      agent,
      setShowToolDetails,
      setShowThinking,
      setCurrentSession,
      now,
    ]
  );
};

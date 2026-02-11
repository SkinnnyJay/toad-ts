import type { AgentInfo } from "@/agents/agent-manager";
import type { NavigationDirection } from "@/constants/navigation-direction";
import { NAVIGATION_DIRECTION } from "@/constants/navigation-direction";
import { VIEW, type View } from "@/constants/views";
import type { Session } from "@/types/domain";
import type { SessionId } from "@/types/domain";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { clearScreen } from "@/utils/terminal/clearScreen.utils";
import { useCallback } from "react";

export interface UseAppNavigationOptions {
  currentSessionId?: SessionId;
  sessionId?: SessionId;
  sessionsById: Partial<Record<SessionId, Session>>;
  getSession: (sessionId: SessionId) => Session | undefined;
  setCurrentSession: (sessionId: SessionId) => void;
  setSessionId: (sessionId: SessionId) => void;
  view: View;
  setView: (view: View) => void;
  agentInfoMap: Map<AgentInfo["id"], AgentInfo>;
  agentOptions: AgentOption[];
  selectedAgent?: AgentInfo | null;
  selectAgent: (agent: AgentInfo) => void;
}

export interface UseAppNavigationResult {
  handleSelectSession: (sessionId: SessionId) => void;
  handleAgentSelect: (agent: AgentOption) => void;
  handleAgentSwitchRequest: () => void;
  handleAgentSelectCancel: () => void;
  navigateChildSession: (direction: NavigationDirection) => void;
}

export const useAppNavigation = ({
  currentSessionId,
  sessionId,
  sessionsById,
  getSession,
  setCurrentSession,
  setSessionId,
  view,
  setView,
  agentInfoMap,
  agentOptions,
  selectedAgent,
  selectAgent,
}: UseAppNavigationOptions): UseAppNavigationResult => {
  const handleSelectSession = useCallback(
    (selectedSessionId: SessionId) => {
      const session = getSession(selectedSessionId);
      if (session) {
        setCurrentSession(selectedSessionId);
        setSessionId(selectedSessionId);
        if (view !== VIEW.CHAT) {
          setView(VIEW.CHAT);
        }
      }
    },
    [getSession, setCurrentSession, setSessionId, setView, view]
  );

  const handleAgentSelect = useCallback(
    (agent: AgentOption) => {
      const info = agentInfoMap.get(agent.id);
      if (info) {
        selectAgent(info);
      }
    },
    [agentInfoMap, selectAgent]
  );

  const handleAgentSwitchRequest = useCallback(() => {
    if (agentOptions.length === 0) return;
    clearScreen();
    setView(VIEW.AGENT_SELECT);
  }, [agentOptions.length, setView]);

  const handleAgentSelectCancel = useCallback(() => {
    if (selectedAgent) {
      setView(VIEW.CHAT);
    }
  }, [selectedAgent, setView]);

  const navigateChildSession = useCallback(
    (direction: NavigationDirection) => {
      const activeSessionId = currentSessionId ?? sessionId;
      if (!activeSessionId) return;
      const activeSession = sessionsById[activeSessionId];
      if (!activeSession) return;
      const parentId = activeSession.metadata?.parentSessionId ?? activeSession.id;
      const parentSession = sessionsById[parentId];
      if (!parentSession) return;
      const children = Object.values(sessionsById)
        .filter((session): session is Session => Boolean(session))
        .filter((session) => session.metadata?.parentSessionId === parentId)
        .sort((a, b) => a.createdAt - b.createdAt);
      const chain: Session[] = [parentSession, ...children];
      if (chain.length <= 1) return;
      const index = chain.findIndex((session) => session.id === activeSessionId);
      if (index < 0) return;
      const nextIndex =
        direction === NAVIGATION_DIRECTION.NEXT
          ? (index + 1) % chain.length
          : (index - 1 + chain.length) % chain.length;
      const target = chain[nextIndex];
      if (target) {
        setCurrentSession(target.id);
        setSessionId(target.id);
        if (view !== VIEW.CHAT) {
          setView(VIEW.CHAT);
        }
      }
    },
    [currentSessionId, sessionId, sessionsById, setCurrentSession, setSessionId, setView, view]
  );

  return {
    handleSelectSession,
    handleAgentSelect,
    handleAgentSwitchRequest,
    handleAgentSelectCancel,
    navigateChildSession,
  };
};

import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";
import { PLAN_STATUS } from "@/constants/plan-status";
import { RENDER_STAGE } from "@/constants/render-stage";
import { VIEW, type View } from "@/constants/views";
import { claudeCliHarnessAdapter } from "@/core/claude-cli-harness";
import { mockHarnessAdapter } from "@/core/mock-harness";
import { SessionStream } from "@/core/session-stream";
import { HarnessRegistry } from "@/harness/harnessRegistry";
import { useAppStore } from "@/store/app-store";
import { createPersistenceConfig } from "@/store/persistence/persistence-config";
import { PersistenceManager } from "@/store/persistence/persistence-manager";
import { createPersistenceProvider } from "@/store/persistence/persistence-provider";
import type { SessionId } from "@/types/domain";
import { AgentSelect } from "@/ui/components/AgentSelect";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { AsciiBanner } from "@/ui/components/AsciiBanner";
import { Chat } from "@/ui/components/Chat";
import { HelpModal } from "@/ui/components/HelpModal";
import { LoadingScreen } from "@/ui/components/LoadingScreen";
import { SessionsPopup } from "@/ui/components/SessionsPopup";
import { SettingsModal } from "@/ui/components/SettingsModal";
import { Sidebar } from "@/ui/components/Sidebar";
import { StatusFooter } from "@/ui/components/StatusFooter";
import {
  useAppKeyboardShortcuts,
  useDefaultAgentSelection,
  useHarnessConnection,
  useSessionHydration,
  useTerminalDimensions,
} from "@/ui/hooks";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

export function App(): ReactNode {
  const [view, setView] = useState<View>(VIEW.AGENT_SELECT);

  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const getPlanBySession = useAppStore((state) => state.getPlanBySession);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);

  // Terminal dimensions hook
  const terminalDimensions = useTerminalDimensions();

  // Environment and persistence setup
  const env = useMemo(() => new Env(EnvManager.getInstance()), []);
  const persistenceConfig = useMemo(() => createPersistenceConfig(env), [env]);
  const persistenceManager = useMemo(() => {
    const provider = createPersistenceProvider(persistenceConfig);
    const writeMode = persistenceConfig.sqlite?.writeMode ?? PERSISTENCE_WRITE_MODE.PER_MESSAGE;
    const batchDelay = persistenceConfig.sqlite?.batchDelay ?? TIMEOUT.BATCH_DELAY_MS;
    return new PersistenceManager(useAppStore, provider, { writeMode, batchDelay });
  }, [persistenceConfig]);

  // Session hydration hook
  const {
    isHydrated,
    hasHarnesses,
    harnessConfigs,
    agentOptions,
    agentInfoMap,
    defaultAgentId,
    loadError,
    stage,
    progress,
    statusMessage,
    setStage,
    setProgress,
    setStatusMessage,
    setLoadError,
  } = useSessionHydration({
    persistenceManager,
    initialProgress: 5,
    initialStatusMessage: "Preparing…",
  });

  // Default agent selection hook
  const { selectedAgent, selectAgent } = useDefaultAgentSelection({
    isHydrated,
    hasHarnesses,
    agentInfoMap,
    defaultAgentId,
    onStageChange: setStage,
    onProgressChange: setProgress,
    onStatusMessageChange: setStatusMessage,
    onViewChange: setView,
  });

  // Harness registry and session stream
  const harnessRegistry = useMemo(
    () => new HarnessRegistry([claudeCliHarnessAdapter, mockHarnessAdapter]),
    []
  );
  const sessionStream = useMemo(() => new SessionStream(useAppStore.getState()), []);

  // Harness connection hook
  const { client, sessionId: connectionSessionId } = useHarnessConnection({
    selectedAgent,
    harnessConfigs,
    harnessRegistry,
    sessionStream,
    onStageChange: setStage,
    onProgressChange: setProgress,
    onStatusMessageChange: setStatusMessage,
    onLoadErrorChange: setLoadError,
    onViewChange: setView,
  });

  // Session ID state (tracks both connection and store)
  const [sessionId, setSessionId] = useState<SessionId | undefined>(currentSessionId);

  // Sync session ID from connection
  useEffect(() => {
    if (connectionSessionId) {
      setSessionId(connectionSessionId);
    }
  }, [connectionSessionId]);

  // Sync session ID from store
  useEffect(() => {
    if (currentSessionId) {
      setSessionId(currentSessionId);
    }
  }, [currentSessionId]);

  // Keyboard shortcuts hook
  const {
    focusTarget,
    isSessionsPopupOpen,
    setIsSessionsPopupOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isHelpOpen,
    setIsHelpOpen,
  } = useAppKeyboardShortcuts({ view });

  // Plan progress calculation
  const plan = useMemo(() => {
    const id = sessionId ?? currentSessionId;
    if (!id) return undefined;
    return getPlanBySession(id);
  }, [currentSessionId, getPlanBySession, sessionId]);

  const planProgress = useMemo(() => {
    if (!plan || !plan.tasks || plan.tasks.length === 0) return undefined;
    const completed = plan.tasks.filter((task) => task.status === PLAN_STATUS.COMPLETED).length;
    return { completed, total: plan.tasks.length };
  }, [plan]);
  void planProgress;

  // Set initial load status on mount
  useEffect(() => {
    setProgress(5);
    setStatusMessage("Loading TOADSTOOL…");
  }, [setProgress, setStatusMessage]);

  // Handlers
  const handlePromptComplete = useCallback(
    (id: SessionId) => {
      sessionStream.finalizeSession(id);
    },
    [sessionStream]
  );

  const handleSelectSession = useCallback(
    (selectedSessionId: SessionId) => {
      const session = useAppStore.getState().getSession(selectedSessionId);
      if (session) {
        setCurrentSession(selectedSessionId);
        setSessionId(selectedSessionId);
        if (view !== VIEW.CHAT) {
          setView(VIEW.CHAT);
        }
      }
    },
    [setCurrentSession, view]
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

  // Render error state
  if (stage === RENDER_STAGE.ERROR) {
    return (
      <box padding={1} flexDirection="column" gap={1}>
        <text fg={COLOR.RED}>Error: {loadError ?? statusMessage}</text>
        {loadError ? <text attributes={TextAttributes.DIM}>{loadError}</text> : null}
      </box>
    );
  }

  // Render loading state
  if (
    stage === RENDER_STAGE.LOADING ||
    stage === RENDER_STAGE.CONNECTING ||
    !isHydrated ||
    !hasHarnesses
  ) {
    return <LoadingScreen progress={progress} status={statusMessage} />;
  }

  // Calculate layout dimensions
  const sidebarWidth = Math.floor(terminalDimensions.columns * UI.SIDEBAR_WIDTH_RATIO);
  const mainWidth = terminalDimensions.columns - sidebarWidth - LIMIT.LAYOUT_BORDER_PADDING;

  return (
    <box flexDirection="column" height={terminalDimensions.rows}>
      {view === VIEW.AGENT_SELECT && <AsciiBanner />}
      {loadError ? (
        <box flexDirection="column" gap={1}>
          <text fg={COLOR.RED}>Error: {loadError}</text>
          <text attributes={TextAttributes.DIM}>
            Check that Claude CLI is installed and accessible
          </text>
        </box>
      ) : null}
      {view === VIEW.AGENT_SELECT ? (
        <AgentSelect agents={agentOptions} onSelect={handleAgentSelect} />
      ) : (
        <box flexDirection="column" height="100%" flexGrow={1} minHeight={0}>
          <box flexDirection="row" flexGrow={1} minHeight={0} marginBottom={1}>
            <Sidebar
              width={sidebarWidth}
              currentAgentName={selectedAgent?.name}
              focusTarget={focusTarget}
            />
            <box
              flexDirection="column"
              width={mainWidth}
              flexGrow={1}
              border={true}
              borderStyle="single"
              borderColor={COLOR.GRAY}
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
            >
              {isSessionsPopupOpen ? (
                <SessionsPopup
                  isOpen={isSessionsPopupOpen}
                  onClose={() => setIsSessionsPopupOpen(false)}
                  onSelectSession={handleSelectSession}
                />
              ) : isSettingsOpen ? (
                <SettingsModal
                  key="settings-modal"
                  isOpen={isSettingsOpen}
                  onClose={() => {
                    setIsSettingsOpen(false);
                  }}
                  agents={agentOptions}
                />
              ) : isHelpOpen ? (
                <HelpModal
                  key="help-modal"
                  isOpen={isHelpOpen}
                  onClose={() => {
                    setIsHelpOpen(false);
                  }}
                />
              ) : (
                <Chat
                  key={`chat-${sessionId ?? "no-session"}`}
                  sessionId={sessionId}
                  agent={selectedAgent ?? undefined}
                  client={client}
                  onPromptComplete={handlePromptComplete}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenHelp={() => setIsHelpOpen(true)}
                  focusTarget={focusTarget}
                />
              )}
            </box>
          </box>
          <box flexShrink={0}>
            <StatusFooter
              taskProgress={undefined}
              planProgress={planProgress}
              focusTarget={focusTarget}
            />
          </box>
        </box>
      )}
    </box>
  );
}

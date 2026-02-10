import { SubAgentRunner } from "@/agents/subagent-runner";
import type { KeybindConfig } from "@/config/app-config";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { BACKGROUND_TASK_STATUS } from "@/constants/background-task-status";
import { COLOR } from "@/constants/colors";
import { PERFORMANCE_MARK, PERFORMANCE_MEASURE } from "@/constants/performance-marks";
import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";
import { PLAN_STATUS } from "@/constants/plan-status";
import { RENDER_STAGE } from "@/constants/render-stage";
import { VIEW, type View } from "@/constants/views";
import { claudeCliHarnessAdapter } from "@/core/claude-cli-harness";
import { mockHarnessAdapter } from "@/core/mock-harness";
import { SessionStream } from "@/core/session-stream";
import { HarnessRegistry } from "@/harness/harnessRegistry";
import { useAppStore } from "@/store/app-store";
import { useBackgroundTaskStore } from "@/store/background-task-store";
import { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import { registerCheckpointManager } from "@/store/checkpoints/checkpoint-service";
import { createPersistenceConfig } from "@/store/persistence/persistence-config";
import { PersistenceManager } from "@/store/persistence/persistence-manager";
import { createPersistenceProvider } from "@/store/persistence/persistence-provider";
import { AgentIdSchema, type Session, type SessionId } from "@/types/domain";
import { AgentSelect } from "@/ui/components/AgentSelect";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { AsciiBanner } from "@/ui/components/AsciiBanner";
import { BackgroundTasksModal } from "@/ui/components/BackgroundTasksModal";
import { Chat } from "@/ui/components/Chat";
import { HelpModal } from "@/ui/components/HelpModal";
import { LoadingScreen } from "@/ui/components/LoadingScreen";
import { RewindModal } from "@/ui/components/RewindModal";
import { SessionsPopup } from "@/ui/components/SessionsPopup";
import { SettingsModal } from "@/ui/components/SettingsModal";
import { Sidebar } from "@/ui/components/Sidebar";
import { StatusFooter } from "@/ui/components/StatusFooter";
import { ThemesModal } from "@/ui/components/ThemesModal";
import {
  useAppConfig,
  useAppKeyboardShortcuts,
  useCheckpointUI,
  useDefaultAgentSelection,
  useExecutionEngine,
  useHarnessConnection,
  useSessionHydration,
  useTerminalDimensions,
} from "@/ui/hooks";
import { ThemeProvider } from "@/ui/theme/theme-context";
import { applyThemeColors } from "@/ui/theme/theme-definitions";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

export function App(): ReactNode {
  const [view, setView] = useState<View>(VIEW.AGENT_SELECT);
  const startupMeasured = useRef(false);

  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const theme = useAppStore((state) => state.uiState.theme);
  const getPlanBySession = useAppStore((state) => state.getPlanBySession);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);
  const sessionsById = useAppStore((state) => state.sessions);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);

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

  const checkpointManager = useMemo(() => new CheckpointManager(useAppStore), []);

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

  const { config: appConfig, updateConfig } = useAppConfig();
  const configDefaultAgentId = useMemo(() => {
    const candidate = appConfig.defaults?.agent;
    if (!candidate) {
      return undefined;
    }
    const parsed = AgentIdSchema.safeParse(candidate);
    return parsed.success ? parsed.data : undefined;
  }, [appConfig.defaults?.agent]);

  // Default agent selection hook
  const { selectedAgent, selectAgent } = useDefaultAgentSelection({
    isHydrated,
    hasHarnesses,
    agentInfoMap,
    defaultAgentId,
    configDefaultAgentId,
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
  const subAgentRunner = useMemo(
    () =>
      new SubAgentRunner({
        harnessRegistry,
        harnessConfigs,
        sessionStream,
        store: useAppStore.getState(),
      }),
    [harnessConfigs, harnessRegistry, sessionStream]
  );

  useExecutionEngine({ subAgentRunner, agentInfoMap });

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

  const activeSessionId = sessionId ?? currentSessionId;

  const backgroundTasks = useBackgroundTaskStore((state) => state.tasks);
  const taskProgress = useMemo(() => {
    const tasks = Object.values(backgroundTasks);
    if (tasks.length === 0) return undefined;
    const completed = tasks.filter(
      (task) =>
        task.status === BACKGROUND_TASK_STATUS.COMPLETED ||
        task.status === BACKGROUND_TASK_STATUS.FAILED ||
        task.status === BACKGROUND_TASK_STATUS.CANCELLED
    ).length;
    return { completed, total: tasks.length };
  }, [backgroundTasks]);

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

  useEffect(() => {
    registerCheckpointManager(checkpointManager);
    return () => {
      registerCheckpointManager(null);
    };
  }, [checkpointManager]);

  useEffect(() => {
    applyThemeColors(theme);
  }, [theme]);

  useEffect(() => {
    if (stage !== RENDER_STAGE.READY || startupMeasured.current) {
      return;
    }
    performance.mark(PERFORMANCE_MARK.STARTUP_READY);
    performance.measure(
      PERFORMANCE_MEASURE.STARTUP,
      PERFORMANCE_MARK.STARTUP_START,
      PERFORMANCE_MARK.STARTUP_READY
    );
    startupMeasured.current = true;
  }, [stage]);

  const handlePromptComplete = useCallback(
    (id: SessionId) => {
      sessionStream.finalizeSession(id);
      void checkpointManager.finalizeCheckpoint(id);
    },
    [checkpointManager, sessionStream]
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

  const handleAgentSwitchRequest = useCallback(() => {
    if (agentOptions.length === 0) return;
    setView(VIEW.AGENT_SELECT);
  }, [agentOptions.length]);

  const handleAgentSelectCancel = useCallback(() => {
    if (selectedAgent) {
      setView(VIEW.CHAT);
    }
  }, [selectedAgent]);

  const navigateChildSession = useCallback(
    (direction: "prev" | "next") => {
      const activeSessionId = currentSessionId ?? sessionId;
      if (!activeSessionId) return;
      const activeSession = sessionsById[activeSessionId];
      if (!activeSession) return;
      const parentId = activeSession.metadata?.parentSessionId ?? activeSession.id;
      const parentSession = sessionsById[parentId];
      if (!parentSession) return;
      const children = Object.values(sessionsById)
        .filter((session): session is Session => {
          if (!session) {
            return false;
          }
          return session.metadata?.parentSessionId === parentId;
        })
        .sort((a, b) => a.createdAt - b.createdAt);
      const chain: Session[] = [parentSession, ...children];
      if (chain.length <= 1) return;
      const index = chain.findIndex((session) => session.id === activeSessionId);
      if (index < 0) return;
      const nextIndex =
        direction === "next"
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
    [currentSessionId, sessionId, sessionsById, setCurrentSession, view]
  );

  const {
    focusTarget,
    isSessionsPopupOpen,
    setIsSessionsPopupOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isHelpOpen,
    setIsHelpOpen,
    isBackgroundTasksOpen,
    setIsBackgroundTasksOpen,
    isThemesOpen,
    setIsThemesOpen,
    isRewindOpen,
    setIsRewindOpen,
  } = useAppKeyboardShortcuts({
    view,
    onNavigateChildSession: navigateChildSession,
    keybinds: appConfig.keybinds,
  });
  const handleUpdateKeybinds = useCallback(
    (keybinds: KeybindConfig) => {
      void updateConfig({ keybinds });
    },
    [updateConfig]
  );

  const { checkpointStatus, handleRewindSelect } = useCheckpointUI({
    checkpointManager,
    activeSessionId,
    appendMessage,
    getMessagesForSession,
    agentInfoMap,
    selectedAgent,
    subAgentRunner,
    onCloseRewind: () => setIsRewindOpen(false),
  });

  if (stage === RENDER_STAGE.ERROR) {
    return (
      <ThemeProvider theme={theme}>
        <box padding={1} flexDirection="column" gap={1}>
          <text fg={COLOR.RED}>Error: {loadError ?? statusMessage}</text>
          {loadError ? <text attributes={TextAttributes.DIM}>{loadError}</text> : null}
        </box>
      </ThemeProvider>
    );
  }

  if (
    stage === RENDER_STAGE.LOADING ||
    stage === RENDER_STAGE.CONNECTING ||
    !isHydrated ||
    !hasHarnesses
  ) {
    return (
      <ThemeProvider theme={theme}>
        <LoadingScreen progress={progress} status={statusMessage} />
      </ThemeProvider>
    );
  }

  const sidebarWidth = Math.floor(terminalDimensions.columns * UI.SIDEBAR_WIDTH_RATIO);
  const mainWidth = terminalDimensions.columns - sidebarWidth - LIMIT.LAYOUT_BORDER_PADDING;

  return (
    <ThemeProvider theme={theme}>
      <box key={`theme-${theme}`} flexDirection="column" height={terminalDimensions.rows}>
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
          <AgentSelect
            agents={agentOptions}
            onSelect={handleAgentSelect}
            selectedId={selectedAgent?.id}
            onCancel={selectedAgent ? handleAgentSelectCancel : undefined}
          />
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
                ) : isBackgroundTasksOpen ? (
                  <BackgroundTasksModal
                    isOpen={isBackgroundTasksOpen}
                    onClose={() => setIsBackgroundTasksOpen(false)}
                    tasks={Object.values(backgroundTasks)}
                  />
                ) : isRewindOpen ? (
                  <RewindModal
                    isOpen={isRewindOpen}
                    checkpointStatus={checkpointStatus}
                    onClose={() => {
                      setIsRewindOpen(false);
                    }}
                    onSelect={handleRewindSelect}
                  />
                ) : isSettingsOpen ? (
                  <SettingsModal
                    key="settings-modal"
                    isOpen={isSettingsOpen}
                    onClose={() => {
                      setIsSettingsOpen(false);
                    }}
                    agents={agentOptions}
                    keybinds={appConfig.keybinds}
                    onUpdateKeybinds={handleUpdateKeybinds}
                  />
                ) : isThemesOpen ? (
                  <ThemesModal
                    isOpen={isThemesOpen}
                    onClose={() => {
                      setIsThemesOpen(false);
                    }}
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
                    agents={Array.from(agentInfoMap.values())}
                    client={client}
                    onPromptComplete={handlePromptComplete}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenHelp={() => setIsHelpOpen(true)}
                    onOpenSessions={() => setIsSessionsPopupOpen(true)}
                    onOpenThemes={() => setIsThemesOpen(true)}
                    onOpenAgentSelect={handleAgentSwitchRequest}
                    checkpointManager={checkpointManager}
                    subAgentRunner={subAgentRunner}
                    focusTarget={focusTarget}
                  />
                )}
              </box>
            </box>
            <box flexShrink={0}>
              <StatusFooter
                taskProgress={taskProgress}
                planProgress={planProgress}
                checkpointStatus={checkpointStatus}
                focusTarget={focusTarget}
              />
            </box>
          </box>
        )}
      </box>
    </ThemeProvider>
  );
}

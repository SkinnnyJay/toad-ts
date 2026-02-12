import { SubAgentRunner } from "@/agents/subagent-runner";
import type { KeybindConfig } from "@/config/app-config";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { BACKGROUND_TASK_STATUS } from "@/constants/background-task-status";
import { BREADCRUMB_PLACEMENT } from "@/constants/breadcrumb-placement";
import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS, filterSlashCommandsForAgent } from "@/constants/command-definitions";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { DISCOVERY_SUBPATH } from "@/constants/discovery-subpaths";
import { FOCUS_TARGET } from "@/constants/focus-target";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { MCP_MANAGEMENT_SUBCOMMAND } from "@/constants/mcp-management-subcommands";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { PERFORMANCE_MARK, PERFORMANCE_MEASURE } from "@/constants/performance-marks";
import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";
import { PLAN_STATUS } from "@/constants/plan-status";
import { RENDER_STAGE } from "@/constants/render-stage";
import { SESSION_MODE, type SessionMode, getNextSessionMode } from "@/constants/session-modes";
import { formatModeUpdatedMessage } from "@/constants/slash-command-messages";
import { VIEW, type View } from "@/constants/views";
import { claudeCliHarnessAdapter } from "@/core/claude-cli-harness";
import { codexCliHarnessAdapter } from "@/core/codex-cli-harness";
import {
  filterCommandsForAgent,
  filterSkillsForAgent,
  loadCommands,
  loadSkills,
} from "@/core/cross-tool";
import { CursorCloudAgentClient } from "@/core/cursor/cloud-agent-client";
import { cursorCliHarnessAdapter } from "@/core/cursor/cursor-cli-harness";
import { geminiCliHarnessAdapter } from "@/core/gemini-cli-harness";
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
import { CursorCloudAgentSchema } from "@/types/cursor-cloud.types";
import { AgentIdSchema, MessageIdSchema, type SessionId } from "@/types/domain";
import { AgentDiscoveryModal } from "@/ui/components/AgentDiscoveryModal";
import { AgentSelect } from "@/ui/components/AgentSelect";
import { AsciiBanner } from "@/ui/components/AsciiBanner";
import { BackgroundTasksModal } from "@/ui/components/BackgroundTasksModal";
import { BreadcrumbBar } from "@/ui/components/BreadcrumbBar";
import { Chat } from "@/ui/components/Chat";
import { type CloudAgentListItem, CloudAgentsModal } from "@/ui/components/CloudAgentsModal";
import { ContextModal } from "@/ui/components/ContextModal";
import { HelpModal } from "@/ui/components/HelpModal";
import { HooksModal } from "@/ui/components/HooksModal";
import { LoadingScreen } from "@/ui/components/LoadingScreen";
import { McpServersModal } from "@/ui/components/McpServersModal";
import { ProgressModal } from "@/ui/components/ProgressModal";
import { RewindModal } from "@/ui/components/RewindModal";
import { SessionsPopup } from "@/ui/components/SessionsPopup";
import { SettingsModal } from "@/ui/components/SettingsModal";
import { Sidebar } from "@/ui/components/Sidebar";
import { SkillsCommandsModal } from "@/ui/components/SkillsCommandsModal";
import { StatusFooter } from "@/ui/components/StatusFooter";
import { ThemesModal } from "@/ui/components/ThemesModal";
import {
  useAppConfig,
  useAppKeyboardShortcuts,
  useAppNavigation,
  useCheckpointUI,
  useContextStats,
  useCursorCloudAgentCount,
  useCursorNativeSessionIds,
  useDefaultAgentSelection,
  useExecutionEngine,
  useHarnessConnection,
  useHookManager,
  useSessionHydration,
  useTerminalDimensions,
} from "@/ui/hooks";
import { useAutoTitle } from "@/ui/hooks/useAutoTitle";
import { useRepoWorkflow } from "@/ui/hooks/useRepoWorkflow";
import { ThemeProvider } from "@/ui/theme/theme-context";
import { applyThemeColors } from "@/ui/theme/theme-definitions";
import { sortCloudAgentItemsByRecency } from "@/ui/utils/cloud-agent-list";
import {
  type McpServerListItem,
  parseMcpServerListCommandResult,
  parseMcpServerToolsCommandResult,
  toMcpServersFromSession,
} from "@/ui/utils/mcp-server-list";
import { withSessionAvailableModels, withSessionModel } from "@/ui/utils/session-model-metadata";
import { resolveSessionModelOptions } from "@/ui/utils/session-model-refresh";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { playCompletionSound } from "@/utils/sound/completion-sound.utils";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

const UNKNOWN_REPO_OWNER = "unknown";

export function App(): ReactNode {
  const [view, setView] = useState<View>(VIEW.AGENT_SELECT);
  const [queuedBreadcrumbSkill, setQueuedBreadcrumbSkill] = useState<string | null>(null);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isHooksOpen, setIsHooksOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isAgentDiscoveryOpen, setIsAgentDiscoveryOpen] = useState(false);
  const [isCloudAgentsOpen, setIsCloudAgentsOpen] = useState(false);
  const [cloudAgents, setCloudAgents] = useState<CloudAgentListItem[]>([]);
  const [cloudAgentsLoading, setCloudAgentsLoading] = useState(false);
  const [cloudAgentsError, setCloudAgentsError] = useState<string | null>(null);
  const [isMcpServersOpen, setIsMcpServersOpen] = useState(false);
  const [mcpServers, setMcpServers] = useState<McpServerListItem[]>([]);
  const [mcpServersLoading, setMcpServersLoading] = useState(false);
  const [mcpServersError, setMcpServersError] = useState<string | null>(null);
  const startupMeasured = useRef(false);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const theme = useAppStore((state) => state.uiState.theme);
  const getPlanBySession = useAppStore((state) => state.getPlanBySession);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);
  const sessionsById = useAppStore(useShallow((state) => state.sessions));
  const appendMessage = useAppStore((state) => state.appendMessage);
  const upsertSession = useAppStore((state) => state.upsertSession);
  const getSession = useAppStore((state) => state.getSession);
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);
  const setLoadedSkills = useAppStore((state) => state.setLoadedSkills);
  const setLoadedCommands = useAppStore((state) => state.setLoadedCommands);
  const loadedSkills = useAppStore(useShallow((state) => state.loadedSkills));
  const loadedCommands = useAppStore(useShallow((state) => state.loadedCommands));
  const terminalDimensions = useTerminalDimensions();
  const env = useMemo(() => new Env(EnvManager.getInstance()), []);
  const persistenceConfig = useMemo(() => createPersistenceConfig(env), [env]);
  const persistenceManager = useMemo(() => {
    const provider = createPersistenceProvider(persistenceConfig);
    const writeMode = persistenceConfig.sqlite?.writeMode ?? PERSISTENCE_WRITE_MODE.PER_MESSAGE;
    const batchDelay = persistenceConfig.sqlite?.batchDelay ?? TIMEOUT.BATCH_DELAY_MS;
    return new PersistenceManager(useAppStore, provider, { writeMode, batchDelay });
  }, [persistenceConfig]);
  const checkpointManager = useMemo(() => new CheckpointManager(useAppStore), []);
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
  const harnessRegistry = useMemo(
    () =>
      new HarnessRegistry([
        claudeCliHarnessAdapter,
        geminiCliHarnessAdapter,
        codexCliHarnessAdapter,
        cursorCliHarnessAdapter,
        mockHarnessAdapter,
      ]),
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
  useExecutionEngine({ subAgentRunner, agentInfoMap, routingRules: appConfig.routing.rules });
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
  const [sessionId, setSessionId] = useState<SessionId | undefined>(currentSessionId);
  useEffect(() => {
    if (connectionSessionId) {
      setSessionId(connectionSessionId);
    }
  }, [connectionSessionId]);
  useEffect(() => {
    if (currentSessionId) {
      setSessionId(currentSessionId);
    }
  }, [currentSessionId]);
  const activeSessionId = sessionId ?? currentSessionId;
  const activeSession = useMemo(
    () => (activeSessionId ? getSession(activeSessionId) : undefined),
    [activeSessionId, getSession]
  );
  const agentContext = useMemo(
    () =>
      selectedAgent
        ? { id: selectedAgent.id, name: selectedAgent.name, harnessId: selectedAgent.harnessId }
        : null,
    [selectedAgent]
  );
  const filteredSkills = useMemo(
    () => filterSkillsForAgent(loadedSkills, agentContext),
    [loadedSkills, agentContext]
  );
  const filteredCommands = useMemo(
    () => filterCommandsForAgent(loadedCommands, agentContext),
    [loadedCommands, agentContext]
  );
  const filteredSlashCommands = useMemo(
    () => filterSlashCommandsForAgent(COMMAND_DEFINITIONS, agentContext),
    [agentContext]
  );
  const { count: cloudAgentCount } = useCursorCloudAgentCount({
    enabled: selectedAgent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID,
  });
  const contextStats = useContextStats(activeSessionId);
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
  const planProgress = useMemo(() => {
    const id = sessionId ?? currentSessionId;
    if (!id) return undefined;
    const plan = getPlanBySession(id);
    if (!plan || plan.tasks.length === 0) return undefined;
    const completed = plan.tasks.filter((task) => task.status === PLAN_STATUS.COMPLETED).length;
    return { completed, total: plan.tasks.length };
  }, [currentSessionId, getPlanBySession, sessionId]);
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
    const cwd = process.cwd();
    void loadSkills(cwd).then((skills) => setLoadedSkills(skills));
    void loadCommands(cwd).then((commands) => setLoadedCommands(commands));
  }, [setLoadedSkills, setLoadedCommands]);
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
  const autoTitle = useAutoTitle();
  const handlePromptComplete = useCallback(
    (id: SessionId) => {
      sessionStream.finalizeSession(id);
      void checkpointManager.finalizeCheckpoint(id);
      autoTitle(id);
      playCompletionSound();
    },
    [autoTitle, checkpointManager, sessionStream]
  );
  const {
    handleSelectSession,
    handleAgentSelect,
    handleAgentSwitchRequest,
    handleAgentSelectCancel,
    navigateChildSession,
  } = useAppNavigation({
    currentSessionId,
    sessionId,
    sessionsById,
    getSession,
    upsertSession,
    setCurrentSession,
    setSessionId,
    view,
    setView,
    agentInfoMap,
    agentOptions,
    selectedAgent,
    selectAgent,
  });
  const handleUpdateKeybinds = useCallback(
    (keybinds: KeybindConfig) => {
      void updateConfig({ keybinds });
    },
    [updateConfig]
  );
  const appendSystemMessage = useCallback(
    (text: string) => {
      if (!activeSessionId) {
        return;
      }
      const now = Date.now();
      appendMessage({
        id: MessageIdSchema.parse(`sys-${now}`),
        sessionId: activeSessionId,
        role: MESSAGE_ROLE.SYSTEM,
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
        createdAt: now,
        isStreaming: false,
      });
    },
    [activeSessionId, appendMessage]
  );
  const handleCyclePermissionMode = useCallback(() => {
    if (!activeSessionId) {
      return;
    }
    const session = getSession(activeSessionId);
    if (!session) {
      return;
    }
    const nextMode = getNextSessionMode(session.mode ?? SESSION_MODE.AUTO);
    upsertSession({ session: { ...session, mode: nextMode } });
    appendSystemMessage(formatModeUpdatedMessage(nextMode));
  }, [activeSessionId, appendSystemMessage, getSession, upsertSession]);

  const handleToggleVimMode = useCallback(() => {
    const nextEnabled = !appConfig.vim.enabled;
    void updateConfig({ vim: { enabled: nextEnabled } });
    return nextEnabled;
  }, [appConfig.vim.enabled, updateConfig]);

  const handleSelectSessionModel = useCallback(
    async (modelId: string) => {
      if (!client?.setSessionModel || !activeSessionId) {
        throw new Error("Session model switching not supported.");
      }
      await client.setSessionModel({ sessionId: activeSessionId, modelId });
      const session = getSession(activeSessionId);
      if (!session) {
        return;
      }
      upsertSession({
        session: withSessionModel(session, modelId),
      });
    },
    [activeSessionId, client, getSession, upsertSession]
  );

  const handleSelectSessionMode = useCallback(
    async (modeId: SessionMode) => {
      if (!client?.setSessionMode || !activeSessionId) {
        throw new Error("Session mode switching not supported.");
      }
      await client.setSessionMode({ sessionId: activeSessionId, modeId });
      const session = getSession(activeSessionId);
      if (!session) {
        return;
      }
      upsertSession({
        session: {
          ...session,
          mode: modeId,
        },
      });
    },
    [activeSessionId, client, getSession, upsertSession]
  );

  const handleRefreshSessionModels = useCallback(async () => {
    if (!activeSessionId) {
      throw new Error("No active session selected.");
    }
    const runAgentCommand = client?.runAgentCommand;
    const options = await resolveSessionModelOptions({
      runCommand: runAgentCommand
        ? async () => runAgentCommand([AGENT_MANAGEMENT_COMMAND.MODELS])
        : undefined,
      runCloud:
        selectedAgent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID
          ? async () => {
              const cloudClient = new CursorCloudAgentClient();
              return cloudClient.listModels();
            }
          : undefined,
    });
    const session = getSession(activeSessionId);
    if (!session) {
      return;
    }
    upsertSession({
      session: withSessionAvailableModels(session, {
        availableModels: options.availableModels,
        fallbackModelId: options.defaultModelId,
      }),
    });
  }, [
    activeSessionId,
    client?.runAgentCommand,
    getSession,
    selectedAgent?.harnessId,
    upsertSession,
  ]);

  const handleRefreshCloudAgents = useCallback(async () => {
    if (selectedAgent?.harnessId !== HARNESS_DEFAULT.CURSOR_CLI_ID) {
      setCloudAgentsError("Cloud agents are only available for Cursor harness sessions.");
      setCloudAgents([]);
      return;
    }
    setCloudAgentsLoading(true);
    setCloudAgentsError(null);
    try {
      const cloudClient = new CursorCloudAgentClient();
      const response = await cloudClient.listAgents({ limit: 100 });
      const rawAgents = Array.isArray(response.agents) ? response.agents : [];
      const mappedAgents = rawAgents.map((rawAgent) => {
        const cloudAgent = CursorCloudAgentSchema.parse(rawAgent);
        return {
          id: cloudAgent.id,
          status: cloudAgent.status,
          model: cloudAgent.model,
          updatedAt: cloudAgent.updated_at,
        };
      });
      setCloudAgents(sortCloudAgentItemsByRecency(mappedAgents));
    } catch (error) {
      setCloudAgentsError(error instanceof Error ? error.message : String(error));
    } finally {
      setCloudAgentsLoading(false);
    }
  }, [selectedAgent?.harnessId]);

  const handleOpenCloudAgents = useCallback(() => {
    setIsCloudAgentsOpen(true);
    void handleRefreshCloudAgents();
  }, [handleRefreshCloudAgents]);

  const handleFetchCloudAgentStatus = useCallback(
    async (agentId: string): Promise<CloudAgentListItem> => {
      const cloudClient = new CursorCloudAgentClient();
      const response = CursorCloudAgentSchema.parse(await cloudClient.getAgent(agentId));
      return {
        id: response.id,
        status: response.status,
        model: response.model,
        updatedAt: response.updated_at,
      };
    },
    []
  );

  const handleStopCloudAgent = useCallback(
    async (agentId: string): Promise<void> => {
      const cloudClient = new CursorCloudAgentClient();
      await cloudClient.stopAgent(agentId);
      await handleRefreshCloudAgents();
    },
    [handleRefreshCloudAgents]
  );

  const handleFollowupCloudAgent = useCallback(
    async (agentId: string, prompt: string): Promise<void> => {
      const cloudClient = new CursorCloudAgentClient();
      await cloudClient.addFollowup(agentId, { prompt });
      await handleRefreshCloudAgents();
    },
    [handleRefreshCloudAgents]
  );

  const toSessionConfiguredMcpServers = useCallback((): McpServerListItem[] => {
    if (!activeSessionId) {
      return [];
    }
    return toMcpServersFromSession(getSession(activeSessionId));
  }, [activeSessionId, getSession]);

  const handleRefreshMcpServers = useCallback(async (): Promise<void> => {
    const configuredServers = toSessionConfiguredMcpServers();
    if (!client?.runAgentCommand) {
      setMcpServers(configuredServers);
      setMcpServersError("MCP command is not available for the active provider.");
      return;
    }
    setMcpServersLoading(true);
    setMcpServersError(null);
    try {
      const result = await client.runAgentCommand([
        AGENT_MANAGEMENT_COMMAND.MCP,
        MCP_MANAGEMENT_SUBCOMMAND.LIST,
      ]);
      const parsedServers = parseMcpServerListCommandResult(result);
      setMcpServers(parsedServers.length > 0 ? parsedServers : configuredServers);
    } catch (error) {
      setMcpServers(configuredServers);
      setMcpServersError(error instanceof Error ? error.message : String(error));
    } finally {
      setMcpServersLoading(false);
    }
  }, [client?.runAgentCommand, toSessionConfiguredMcpServers]);

  const handleOpenMcpServers = useCallback(() => {
    setIsMcpServersOpen(true);
    void handleRefreshMcpServers();
  }, [handleRefreshMcpServers]);

  const handleEnableMcpServer = useCallback(
    async (serverId: string): Promise<void> => {
      if (!client?.runAgentCommand) {
        throw new Error("MCP command is not available for the active provider.");
      }
      await client.runAgentCommand([
        AGENT_MANAGEMENT_COMMAND.MCP,
        MCP_MANAGEMENT_SUBCOMMAND.ENABLE,
        serverId,
      ]);
      await handleRefreshMcpServers();
    },
    [client?.runAgentCommand, handleRefreshMcpServers]
  );

  const handleDisableMcpServer = useCallback(
    async (serverId: string): Promise<void> => {
      if (!client?.runAgentCommand) {
        throw new Error("MCP command is not available for the active provider.");
      }
      await client.runAgentCommand([
        AGENT_MANAGEMENT_COMMAND.MCP,
        MCP_MANAGEMENT_SUBCOMMAND.DISABLE,
        serverId,
      ]);
      await handleRefreshMcpServers();
    },
    [client?.runAgentCommand, handleRefreshMcpServers]
  );

  const handleListMcpServerTools = useCallback(
    async (serverId: string): Promise<string[]> => {
      if (!client?.runAgentCommand) {
        throw new Error("MCP command is not available for the active provider.");
      }
      const result = await client.runAgentCommand([
        AGENT_MANAGEMENT_COMMAND.MCP,
        MCP_MANAGEMENT_SUBCOMMAND.LIST_TOOLS,
        serverId,
      ]);
      return parseMcpServerToolsCommandResult(result, serverId);
    },
    [client?.runAgentCommand]
  );

  const breadcrumbPlacement = appConfig.ui.breadcrumb.placement;
  const breadcrumbVisible = breadcrumbPlacement !== BREADCRUMB_PLACEMENT.HIDDEN;
  const workspacePath = process.cwd();
  const { info: repoWorkflowInfo, loading: repoWorkflowLoading } = useRepoWorkflow({
    pollIntervalMs: appConfig.ui.breadcrumb.pollIntervalMs,
    enabled: breadcrumbVisible,
  });
  const statusFooterPrStatus = repoWorkflowInfo?.prUrl
    ? {
        url: repoWorkflowInfo.prUrl,
        reviewDecision: repoWorkflowInfo.status,
      }
    : undefined;
  const cloudDispatchContext = useMemo(() => {
    if (!repoWorkflowInfo) {
      return undefined;
    }
    const repository =
      repoWorkflowInfo.owner === UNKNOWN_REPO_OWNER
        ? repoWorkflowInfo.repoName
        : `${repoWorkflowInfo.owner}/${repoWorkflowInfo.repoName}`;
    return {
      repository,
      branch: repoWorkflowInfo.branch,
    };
  }, [repoWorkflowInfo]);
  const handleRunBreadcrumbAction = useCallback(() => {
    if (repoWorkflowInfo?.action?.skill) {
      setQueuedBreadcrumbSkill(repoWorkflowInfo.action.skill);
    }
  }, [repoWorkflowInfo]);

  useEffect(() => {
    if (selectedAgent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID) {
      return;
    }
    if (!isCloudAgentsOpen) {
      return;
    }
    setIsCloudAgentsOpen(false);
  }, [isCloudAgentsOpen, selectedAgent?.harnessId]);

  useHookManager({
    hooks: appConfig.hooks,
    agentInfoMap,
    subAgentRunner,
  });
  const {
    focusTarget,
    setFocusTarget,
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
    isSkillsOpen,
    setIsSkillsOpen,
    isCommandsOpen,
    setIsCommandsOpen,
  } = useAppKeyboardShortcuts({
    view,
    onNavigateChildSession: navigateChildSession,
    keybinds: appConfig.keybinds,
    onCyclePermissionMode: handleCyclePermissionMode,
    onRunBreadcrumbAction: handleRunBreadcrumbAction,
    hasOtherModalOpen:
      isContextOpen ||
      isHooksOpen ||
      isProgressOpen ||
      isAgentDiscoveryOpen ||
      isCloudAgentsOpen ||
      isMcpServersOpen,
  });
  const {
    sessions: nativeCursorSessions,
    loading: nativeCursorSessionsLoading,
    error: nativeCursorSessionsError,
    refresh: refreshNativeCursorSessions,
  } = useCursorNativeSessionIds({
    enabled: isSessionsPopupOpen && selectedAgent?.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID,
    client,
  });
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
        <box height={terminalDimensions.rows} width={terminalDimensions.columns}>
          <LoadingScreen progress={progress} status={statusMessage} />
        </box>
      </ThemeProvider>
    );
  }
  const sidebarWidth = Math.floor(terminalDimensions.columns * UI.SIDEBAR_WIDTH_RATIO);
  const mainWidth = terminalDimensions.columns - sidebarWidth - LIMIT.LAYOUT_BORDER_PADDING;
  return (
    <ThemeProvider theme={theme}>
      <box key={`theme-${theme}`} flexDirection="column" height={terminalDimensions.rows}>
        {loadError ? (
          <box flexDirection="column" gap={1}>
            <text fg={COLOR.RED}>Error: {loadError}</text>
            <text attributes={TextAttributes.DIM}>
              Check that Claude CLI is installed and accessible
            </text>
          </box>
        ) : null}
        {view === VIEW.AGENT_SELECT ? (
          <box flexDirection="column" flexGrow={1} height="100%" width="100%">
            <AsciiBanner />
            <AgentSelect
              agents={agentOptions}
              onSelect={handleAgentSelect}
              selectedId={selectedAgent?.id}
              onCancel={selectedAgent ? handleAgentSelectCancel : undefined}
            />
            <box flexGrow={1} />
          </box>
        ) : (
          <box flexDirection="column" height="100%" flexGrow={1} minHeight={0}>
            {breadcrumbPlacement === BREADCRUMB_PLACEMENT.TOP ? (
              <box flexShrink={0} border={true} borderStyle="single" borderColor={COLOR.GRAY}>
                <BreadcrumbBar
                  info={repoWorkflowInfo}
                  loading={repoWorkflowLoading}
                  showAction={appConfig.ui.breadcrumb.showAction}
                  onActionPress={setQueuedBreadcrumbSkill}
                />
              </box>
            ) : null}
            <box flexDirection="row" flexGrow={1} minHeight={0} marginBottom={1}>
              {breadcrumbPlacement === BREADCRUMB_PLACEMENT.LEFT ? (
                <box flexDirection="column" width={sidebarWidth} flexShrink={0}>
                  <box flexShrink={0} border={true} borderStyle="single" borderColor={COLOR.GRAY}>
                    <BreadcrumbBar
                      info={repoWorkflowInfo}
                      loading={repoWorkflowLoading}
                      showAction={appConfig.ui.breadcrumb.showAction}
                      onActionPress={setQueuedBreadcrumbSkill}
                    />
                  </box>
                  <Sidebar
                    width={sidebarWidth}
                    currentAgentName={selectedAgent?.name}
                    currentSessionId={activeSessionId}
                    onSelectSession={handleSelectSession}
                    focusTarget={focusTarget}
                    onFocusTab={setFocusTarget}
                  />
                </box>
              ) : (
                <Sidebar
                  width={sidebarWidth}
                  currentAgentName={selectedAgent?.name}
                  currentSessionId={activeSessionId}
                  onSelectSession={handleSelectSession}
                  focusTarget={focusTarget}
                  onFocusTab={setFocusTarget}
                />
              )}
              <box
                flexDirection="column"
                width={mainWidth}
                flexGrow={1}
                border={true}
                borderStyle={focusTarget === FOCUS_TARGET.CHAT ? "double" : "single"}
                borderColor={focusTarget === FOCUS_TARGET.CHAT ? COLOR.CYAN : COLOR.GRAY}
                paddingLeft={1}
                paddingRight={1}
                paddingTop={1}
                paddingBottom={1}
              >
                {breadcrumbPlacement === BREADCRUMB_PLACEMENT.RIGHT ? (
                  <box flexShrink={0} marginBottom={1}>
                    <BreadcrumbBar
                      info={repoWorkflowInfo}
                      loading={repoWorkflowLoading}
                      showAction={appConfig.ui.breadcrumb.showAction}
                      onActionPress={setQueuedBreadcrumbSkill}
                    />
                  </box>
                ) : null}
                {isSessionsPopupOpen ? (
                  <SessionsPopup
                    isOpen={isSessionsPopupOpen}
                    onClose={() => setIsSessionsPopupOpen(false)}
                    onSelectSession={handleSelectSession}
                    onRefreshExternalSessions={refreshNativeCursorSessions}
                    externalSessions={nativeCursorSessions}
                    externalSessionLoading={nativeCursorSessionsLoading}
                    externalSessionError={nativeCursorSessionsError}
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
                    onGoToSelectionOptions={() => {
                      setIsRewindOpen(false);
                      handleAgentSwitchRequest();
                    }}
                  />
                ) : isContextOpen ? (
                  <ContextModal
                    isOpen={isContextOpen}
                    sessionId={activeSessionId}
                    onClose={() => {
                      setIsContextOpen(false);
                    }}
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
                    currentMode={activeSession?.mode}
                    onSelectMode={handleSelectSessionMode}
                    availableModels={activeSession?.metadata?.availableModels ?? []}
                    currentModelId={activeSession?.metadata?.model}
                    onSelectModel={handleSelectSessionModel}
                    onRefreshModels={handleRefreshSessionModels}
                  />
                ) : isHooksOpen ? (
                  <HooksModal
                    isOpen={isHooksOpen}
                    hooks={appConfig.hooks}
                    onClose={() => setIsHooksOpen(false)}
                  />
                ) : isAgentDiscoveryOpen ? (
                  <AgentDiscoveryModal
                    isOpen={isAgentDiscoveryOpen}
                    agents={Array.from(agentInfoMap.values())}
                    onClose={() => setIsAgentDiscoveryOpen(false)}
                  />
                ) : isProgressOpen ? (
                  <ProgressModal
                    isOpen={isProgressOpen}
                    sessionId={activeSessionId ?? undefined}
                    onClose={() => setIsProgressOpen(false)}
                  />
                ) : isCloudAgentsOpen ? (
                  <CloudAgentsModal
                    isOpen={isCloudAgentsOpen}
                    agents={cloudAgents}
                    loading={cloudAgentsLoading}
                    error={cloudAgentsError}
                    onClose={() => setIsCloudAgentsOpen(false)}
                    onRefresh={handleRefreshCloudAgents}
                    onFetchStatus={handleFetchCloudAgentStatus}
                    onStopAgent={handleStopCloudAgent}
                    onSendFollowup={handleFollowupCloudAgent}
                  />
                ) : isMcpServersOpen ? (
                  <McpServersModal
                    isOpen={isMcpServersOpen}
                    servers={mcpServers}
                    loading={mcpServersLoading}
                    error={mcpServersError}
                    onClose={() => setIsMcpServersOpen(false)}
                    onRefresh={handleRefreshMcpServers}
                    onEnableServer={handleEnableMcpServer}
                    onDisableServer={handleDisableMcpServer}
                    onListServerTools={handleListMcpServerTools}
                  />
                ) : isThemesOpen ? (
                  <ThemesModal isOpen={isThemesOpen} onClose={() => setIsThemesOpen(false)} />
                ) : isSkillsOpen ? (
                  <SkillsCommandsModal
                    isOpen={isSkillsOpen}
                    mode={DISCOVERY_SUBPATH.SKILLS}
                    skills={filteredSkills}
                    onClose={() => setIsSkillsOpen(false)}
                  />
                ) : isCommandsOpen ? (
                  <SkillsCommandsModal
                    isOpen={isCommandsOpen}
                    mode={DISCOVERY_SUBPATH.COMMANDS}
                    commands={filteredCommands}
                    onClose={() => setIsCommandsOpen(false)}
                  />
                ) : isHelpOpen ? (
                  <HelpModal
                    key="help-modal"
                    isOpen={isHelpOpen}
                    commands={filteredSlashCommands}
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
                    slashCommands={filteredSlashCommands}
                    onPromptComplete={handlePromptComplete}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenHelp={() => setIsHelpOpen(true)}
                    onOpenSessions={() => setIsSessionsPopupOpen(true)}
                    onOpenThemes={() => setIsThemesOpen(true)}
                    onOpenCloudAgents={handleOpenCloudAgents}
                    onOpenMcpServers={handleOpenMcpServers}
                    onOpenContext={() => setIsContextOpen(true)}
                    onOpenHooks={() => setIsHooksOpen(true)}
                    onOpenProgress={() => setIsProgressOpen(true)}
                    onOpenAgents={() => setIsAgentDiscoveryOpen(true)}
                    onOpenSkills={() => setIsSkillsOpen(true)}
                    onOpenCommands={() => setIsCommandsOpen(true)}
                    onOpenAgentSelect={handleAgentSwitchRequest}
                    onToggleVimMode={handleToggleVimMode}
                    vimEnabled={appConfig.vim.enabled}
                    harnesses={harnessConfigs}
                    checkpointManager={checkpointManager}
                    subAgentRunner={subAgentRunner}
                    focusTarget={focusTarget}
                    queuedBreadcrumbSkill={queuedBreadcrumbSkill}
                    onConsumeQueuedBreadcrumbSkill={() => setQueuedBreadcrumbSkill(null)}
                    hideRepoInHeader={breadcrumbVisible}
                    cloudDispatchContext={cloudDispatchContext}
                  />
                )}
              </box>
            </box>
            {breadcrumbPlacement === BREADCRUMB_PLACEMENT.BOTTOM ? (
              <box flexShrink={0} border={true} borderStyle="single" borderColor={COLOR.GRAY}>
                <BreadcrumbBar
                  info={repoWorkflowInfo}
                  loading={repoWorkflowLoading}
                  showAction={appConfig.ui.breadcrumb.showAction}
                  onActionPress={setQueuedBreadcrumbSkill}
                />
              </box>
            ) : null}
            <box flexShrink={0}>
              <StatusFooter
                taskProgress={taskProgress}
                planProgress={planProgress}
                checkpointStatus={checkpointStatus}
                contextStats={contextStats ?? undefined}
                focusTarget={focusTarget}
                connectionStatus={connectionStatus}
                sessionMode={activeSession?.mode}
                sessionId={activeSessionId}
                agentName={selectedAgent?.name}
                modelName={activeSession?.metadata?.model}
                cloudAgentCount={cloudAgentCount ?? undefined}
                workspacePath={workspacePath}
                prStatus={statusFooterPrStatus}
              />
            </box>
          </box>
        )}
      </box>
    </ThemeProvider>
  );
}

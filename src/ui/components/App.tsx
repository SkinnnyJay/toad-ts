import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";
import { RENDER_STAGE, type RenderStage } from "@/constants/render-stage";
import { VIEW, type View } from "@/constants/views";
import { claudeCliHarnessAdapter } from "@/core/claude-cli-harness";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { mockHarnessAdapter } from "@/core/mock-harness";
import { SessionManager } from "@/core/session-manager";
import { SessionStream } from "@/core/session-stream";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { loadHarnessConfig } from "@/harness/harnessConfig";
import type { HarnessConfig } from "@/harness/harnessConfig";
import { HarnessRegistry } from "@/harness/harnessRegistry";
import { useAppStore } from "@/store/app-store";
import { createPersistenceConfig } from "@/store/persistence/persistence-config";
import { PersistenceManager } from "@/store/persistence/persistence-manager";
import { createPersistenceProvider } from "@/store/persistence/persistence-provider";
import { getDefaultProvider } from "@/store/settings/settings-manager";
import type { AgentId, SessionId } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";
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
import { withTimeout } from "@/utils/async/withTimeout";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { Box, Text, useInput, useStdout } from "ink";
import { TerminalInfoProvider } from "ink-picture";
import { useCallback, useEffect, useMemo, useState } from "react";

interface AgentInfo {
  id: AgentId;
  harnessId: string;
  name: string;
  description?: string;
}

const clearScreen = (): void => {
  process.stdout.write("\x1b[3J\x1b[H\x1b[2J");
};

const buildAgentOptions = (
  harnesses: Record<string, HarnessConfig>
): { options: AgentOption[]; infoMap: Map<AgentId, AgentInfo> } => {
  const options: AgentOption[] = [];
  const infoMap = new Map<AgentId, AgentInfo>();

  for (const config of Object.values(harnesses)) {
    const id = AgentIdSchema.parse(config.id);
    const info: AgentInfo = {
      id,
      harnessId: config.id,
      name: config.name,
      description: config.description,
    };
    options.push({ id, name: info.name, description: info.description });
    infoMap.set(id, info);
  }

  return { options, infoMap };
};

export function App(): JSX.Element {
  const { stdout } = useStdout();
  const [view, setView] = useState<View>(VIEW.AGENT_SELECT);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [client, setClient] = useState<HarnessRuntime | null>(null);
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [agentInfoMap, setAgentInfoMap] = useState<Map<AgentId, AgentInfo>>(new Map());
  const [harnessConfigs, setHarnessConfigs] = useState<Record<string, HarnessConfig>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSessionsPopupOpen, setIsSessionsPopupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [stage, setStage] = useState<RenderStage>(RENDER_STAGE.LOADING);
  const [progress, setProgress] = useState<number>(5);
  const [statusMessage, setStatusMessage] = useState<string>("Preparing…");
  const [defaultAgentId, setDefaultAgentId] = useState<AgentId | null>(null);
  const [hasHarnesses, setHasHarnesses] = useState(false);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(FOCUS_TARGET.CHAT);
  const [terminalDimensions, setTerminalDimensions] = useState({
    rows: stdout?.rows ?? UI.TERMINAL_DEFAULT_ROWS,
    columns: stdout?.columns ?? UI.TERMINAL_DEFAULT_COLUMNS,
  });

  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);

  const [sessionId, setSessionId] = useState<SessionId | undefined>(currentSessionId);
  const sessionStream = useMemo(() => new SessionStream(useAppStore.getState()), []);

  const env = useMemo(() => new Env(EnvManager.getInstance()), []);
  const persistenceConfig = useMemo(() => createPersistenceConfig(env), [env]);
  const persistenceManager = useMemo(() => {
    const provider = createPersistenceProvider(persistenceConfig);
    const writeMode = persistenceConfig.sqlite?.writeMode ?? PERSISTENCE_WRITE_MODE.PER_MESSAGE;
    const batchDelay = persistenceConfig.sqlite?.batchDelay ?? TIMEOUT.BATCH_DELAY_MS;
    return new PersistenceManager(useAppStore, provider, { writeMode, batchDelay });
  }, [persistenceConfig]);

  const harnessRegistry = useMemo(
    () => new HarnessRegistry([claudeCliHarnessAdapter, mockHarnessAdapter]),
    []
  );

  const handlePromptComplete = useCallback(
    (id: SessionId) => {
      sessionStream.finalizeSession(id);
    },
    [sessionStream]
  );

  const handleSelectSession = useCallback(
    (sessionId: SessionId) => {
      const session = useAppStore.getState().getSession(sessionId);
      if (session) {
        setCurrentSession(sessionId);
        setSessionId(sessionId);
        // If the session has a different agent, we might need to reconnect
        // For now, just switch the session
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
        clearScreen();
        setStatusMessage(`Connecting to ${info.name}…`);
        setProgress((current) => Math.max(current, UI.PROGRESS.CONNECTION_START));
        setStage(RENDER_STAGE.CONNECTING);
        setSelectedAgent(info);
        setView(VIEW.CHAT);
      }
    },
    [agentInfoMap]
  );

  // Handle focus shortcuts: Command+1,2,3,4,5 for focus, Option+1,2,3,4,5 for collapse
  useInput((input, key) => {
    if (view !== VIEW.CHAT) return;

    // Option+` (backtick) to focus back on chat
    // Option/Alt key combinations send escape sequences on macOS terminals
    // Option+` typically sends '\x1b`' or similar escape sequence
    const isOptionBacktick =
      input.length >= 2 && input.charCodeAt(0) === 0x1b && input.slice(1) === "`";
    if (isOptionBacktick) {
      setFocusTarget(FOCUS_TARGET.CHAT);
      return;
    }

    // Command+number sets focus (1=Files, 2=Plan, 3=Context, 4=Sessions, 5=Sub-agents)
    if ((key.meta || key.ctrl) && /^[1-5]$/.test(input)) {
      const focusMap: Record<string, FocusTarget> = {
        "1": FOCUS_TARGET.FILES,
        "2": FOCUS_TARGET.PLAN,
        "3": "context",
        "4": "sessions",
        "5": "agent",
      };
      setFocusTarget(focusMap[input] ?? FOCUS_TARGET.CHAT);
      return;
    }

    // Legacy: Command+F for files focus
    if ((key.meta || key.ctrl) && (input === "f" || input === "F")) {
      setFocusTarget(FOCUS_TARGET.FILES);
      return;
    }

    if (key.escape) {
      setFocusTarget(FOCUS_TARGET.CHAT);
    }
    if (key.ctrl && (input === "s" || input === "S")) {
      setIsSessionsPopupOpen((prev) => !prev);
    }
  });

  useEffect(() => {
    clearScreen();
    setProgress(5);
    setStatusMessage("Loading TOADSTOOL…");
  }, []);

  // Track terminal resize
  useEffect(() => {
    const handleResize = () => {
      setTerminalDimensions({
        rows: stdout?.rows ?? 24,
        columns: stdout?.columns ?? 80,
      });
    };
    stdout?.on("resize", handleResize);
    return () => {
      if (stdout?.off) {
        stdout.off("resize", handleResize);
      } else if (stdout?.removeListener) {
        stdout.removeListener("resize", handleResize);
      }
    };
  }, [stdout]);

  useEffect(() => {
    if (currentSessionId) {
      setSessionId(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    let active = true;
    setStatusMessage("Hydrating sessions…");
    setProgress((current) => Math.max(current, UI.PROGRESS.INITIAL));
    void (async () => {
      try {
        await persistenceManager.hydrate();
        if (!active) return;
        persistenceManager.start();
        setIsHydrated(true);
        setProgress((current) => Math.max(current, UI.PROGRESS.HARNESS_LOADING));
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
        setStage(RENDER_STAGE.ERROR);
        setStatusMessage(message);
      }
    })();

    return () => {
      active = false;
      void persistenceManager.close();
    };
  }, [persistenceManager]);

  useEffect(() => {
    let active = true;
    setStatusMessage("Loading providers…");
    setProgress((current) => Math.max(current, UI.PROGRESS.CONFIG_LOADING));
    void (async () => {
      try {
        const config = await loadHarnessConfig();
        if (!active) return;
        setHarnessConfigs(config.harnesses);
        const { options, infoMap } = buildAgentOptions(config.harnesses);
        setAgentOptions(options);
        setAgentInfoMap(infoMap);
        setHasHarnesses(true);
        const parsedDefault = AgentIdSchema.safeParse(config.harnessId);
        setDefaultAgentId(parsedDefault.success ? parsedDefault.data : null);
        setProgress((current) => Math.max(current, UI.PROGRESS.CONFIG_LOADED));
      } catch (error) {
        const fallback = createDefaultHarnessConfig();
        if (!active) return;
        setLoadError(null);
        setHarnessConfigs(fallback.harnesses);
        const { options, infoMap } = buildAgentOptions(fallback.harnesses);
        setAgentOptions(options);
        setAgentInfoMap(infoMap);
        setHasHarnesses(true);
        setDefaultAgentId(AgentIdSchema.parse(fallback.harnessId));
        if (error instanceof Error && error.message !== "No harnesses configured.") {
          setLoadError(error.message);
        }
        setProgress((current) => Math.max(current, UI.PROGRESS.CONFIG_LOADED));
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !hasHarnesses || selectedAgent) {
      return;
    }

    let active = true;

    // Check for default provider from settings
    void (async () => {
      try {
        const defaultProvider = await getDefaultProvider();
        if (!active) return;
        if (defaultProvider?.agentId) {
          const info = agentInfoMap.get(defaultProvider.agentId);
          if (info) {
            clearScreen();
            setStatusMessage(`Connecting to ${info.name}…`);
            setProgress((current) => Math.max(current, UI.PROGRESS.CONNECTION_START));
            setStage(RENDER_STAGE.CONNECTING);
            setSelectedAgent(info);
            setView(VIEW.CHAT);
            return;
          }
        }
      } catch (error) {
        // If settings load fails, fall through to default behavior
        if (!active) return;
      }

      // Fallback to harness config default or show agent select
      if (defaultAgentId) {
        const info = agentInfoMap.get(defaultAgentId);
        if (info) {
          clearScreen();
          setStatusMessage(`Connecting to ${info.name}...`);
          setProgress((current) => Math.max(current, 60));
          setStage("connecting");
          setSelectedAgent(info);
          setView(VIEW.CHAT);
          return;
        }
      }

      if (!active) return;
      clearScreen();
      setStage(RENDER_STAGE.READY);
      setProgress((current) => Math.max(current, UI.PROGRESS.COMPLETE));
      setView(VIEW.AGENT_SELECT);
      setStatusMessage("Select a provider");
    })();

    return () => {
      active = false;
    };
  }, [agentInfoMap, defaultAgentId, hasHarnesses, isHydrated, selectedAgent]);

  useEffect(() => {
    if (!selectedAgent) {
      setClient(null);
      return;
    }

    const harnessConfig = harnessConfigs[selectedAgent.harnessId];
    if (!harnessConfig) {
      setLoadError(`Harness '${selectedAgent.harnessId}' not configured.`);
      setStage("error");
      setStatusMessage("Harness not configured");
      return;
    }

    const adapter = harnessRegistry.get(harnessConfig.id);
    if (!adapter) {
      setLoadError(`Harness adapter '${harnessConfig.id}' not registered.`);
      setStage("error");
      setStatusMessage("Harness adapter missing");
      return;
    }

    if (
      harnessConfig.command.includes(HARNESS_DEFAULT.CLAUDE_COMMAND) &&
      !process.env.ANTHROPIC_API_KEY
    ) {
      setLoadError(
        "Claude Code ACP adapter requires ANTHROPIC_API_KEY. Set it in your environment or .env file."
      );
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      setStage("error");
      setStatusMessage("Missing ANTHROPIC_API_KEY");
      return;
    }

    const runtime = adapter.createHarness(harnessConfig);
    const detach = sessionStream.attach(runtime);
    const sessionManager = new SessionManager(runtime, useAppStore.getState());

    runtime.on("state", (status) => setConnectionStatus(status));
    runtime.on("error", (error) => {
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      setLoadError(error.message);
      setCurrentSession(undefined);
      setStage("error");
      setStatusMessage(error.message);
    });

    let active = true;
    setSessionId(undefined);
    setCurrentSession(undefined);
    setClient(runtime);
    setLoadError(null);
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    setStage("connecting");
    setStatusMessage(`Connecting to ${selectedAgent.name}…`);
    setProgress((current) => Math.max(current, 60));
    clearScreen();

    void (async () => {
      try {
        await withTimeout(runtime.connect(), "connect", TIMEOUT.SESSION_BOOTSTRAP_MS);
        if (!active) return;
        setStatusMessage("Initializing session…");
        setProgress((current) => Math.max(current, UI.PROGRESS.CONNECTION_ESTABLISHED));

        await withTimeout(runtime.initialize(), "initialize", TIMEOUT.SESSION_BOOTSTRAP_MS);
        if (!active) return;
        setStatusMessage("Preparing tools…");
        setProgress((current) => Math.max(current, UI.PROGRESS.SESSION_READY));

        const mcpConfig = await loadMcpConfig();
        const session = await withTimeout(
          sessionManager.createSession({
            cwd: process.cwd(),
            agentId: AgentIdSchema.parse(harnessConfig.id),
            title: harnessConfig.name,
            mcpConfig,
            env: process.env,
          }),
          "create session",
          TIMEOUT.SESSION_BOOTSTRAP_MS
        );
        if (!active) return;
        setSessionId(session.id);
        setCurrentSession(session.id);
        setView(VIEW.CHAT);
        setProgress(UI.PROGRESS.COMPLETE);
        setStatusMessage("Ready");
        clearScreen();
        setStage(RENDER_STAGE.READY);
      } catch (error) {
        if (active) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setLoadError(errorMessage);
          setConnectionStatus(CONNECTION_STATUS.ERROR);
          setCurrentSession(undefined);
          setStage(RENDER_STAGE.ERROR);
          setStatusMessage(errorMessage);
        }
      }
    })();

    return () => {
      active = false;
      detach();
      void runtime.disconnect();
      setClient(null);
    };
  }, [
    harnessConfigs,
    harnessRegistry,
    selectedAgent,
    sessionStream,
    setConnectionStatus,
    setCurrentSession,
  ]);

  if (stage === RENDER_STAGE.ERROR) {
    return (
      <Box padding={1} flexDirection="column" gap={1}>
        <Text color={COLOR.RED}>Error: {loadError ?? statusMessage}</Text>
        {loadError ? <Text dimColor>{loadError}</Text> : null}
      </Box>
    );
  }

  if (
    stage === RENDER_STAGE.LOADING ||
    stage === RENDER_STAGE.CONNECTING ||
    !isHydrated ||
    !hasHarnesses
  ) {
    return <LoadingScreen progress={progress} status={statusMessage} />;
  }

  // Calculate layout dimensions
  const sidebarWidth = Math.floor(terminalDimensions.columns * 0.15);
  const mainWidth = terminalDimensions.columns - sidebarWidth - 4; // Account for borders and gaps

  return (
    <TerminalInfoProvider>
      <Box flexDirection="column" height={terminalDimensions.rows}>
        {view === "agent-select" && <AsciiBanner />}
        {loadError ? (
          <Box flexDirection="column" gap={1}>
            <Text color={COLOR.RED}>Error: {loadError}</Text>
            <Text dimColor>Check that Claude CLI is installed and accessible</Text>
          </Box>
        ) : null}
        {view === "agent-select" ? (
          <AgentSelect agents={agentOptions} onSelect={handleAgentSelect} />
        ) : (
          <Box flexDirection="column" height="100%" flexGrow={1} minHeight={0}>
            <Box flexDirection="row" flexGrow={1} minHeight={0} marginBottom={1}>
              <Sidebar
                width={sidebarWidth}
                currentAgentName={selectedAgent?.name}
                focusTarget={focusTarget}
              />
              <Box
                flexDirection="column"
                width={mainWidth}
                flexGrow={1}
                borderStyle="single"
                borderColor={COLOR.GRAY}
                paddingX={1}
                paddingY={1}
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
              </Box>
            </Box>
            <Box flexShrink={0}>
              <StatusFooter taskProgress={undefined} focusTarget={focusTarget} />
            </Box>
          </Box>
        )}
      </Box>
    </TerminalInfoProvider>
  );
}

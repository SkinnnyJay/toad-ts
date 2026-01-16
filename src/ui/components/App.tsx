import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";
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
import { Box, Text, useInput } from "ink";
import { TerminalInfoProvider } from "ink-picture";
import { useCallback, useEffect, useMemo, useState } from "react";

interface AgentInfo {
  id: AgentId;
  harnessId: string;
  name: string;
  description?: string;
}

type RenderStage = "loading" | "connecting" | "ready" | "error";

const SESSION_BOOTSTRAP_TIMEOUT_MS = 8_000;

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
  const [stage, setStage] = useState<RenderStage>("loading");
  const [progress, setProgress] = useState<number>(5);
  const [statusMessage, setStatusMessage] = useState<string>("Preparing...");
  const [defaultAgentId, setDefaultAgentId] = useState<AgentId | null>(null);
  const [hasHarnesses, setHasHarnesses] = useState(false);

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

  // Handle Ctrl+S to toggle sessions popup (only in chat view)
  useInput((input, key) => {
    if (view === "chat" && key.ctrl && (input === "s" || input === "S")) {
      setIsSessionsPopupOpen((prev) => !prev);
    }
  });

  useEffect(() => {
    clearScreen();
    setProgress(5);
    setStatusMessage("Loading TOADSTOOL...");
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      setSessionId(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    let active = true;
    setStatusMessage("Hydrating sessions...");
    setProgress((current) => Math.max(current, 10));
    void (async () => {
      try {
        await persistenceManager.hydrate();
        if (!active) return;
        persistenceManager.start();
        setIsHydrated(true);
        setProgress((current) => Math.max(current, 30));
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
        setStage("error");
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
    setStatusMessage("Loading providers...");
    setProgress((current) => Math.max(current, 35));
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
        setProgress((current) => Math.max(current, 45));
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
        setProgress((current) => Math.max(current, 45));
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
            setStatusMessage(`Connecting to ${info.name}...`);
            setProgress((current) => Math.max(current, 60));
            setStage("connecting");
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
      setStage("ready");
      setProgress((current) => Math.max(current, 100));
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
    setStatusMessage(`Connecting to ${selectedAgent.name}...`);
    setProgress((current) => Math.max(current, 60));
    clearScreen();

    void (async () => {
      try {
        await withTimeout(runtime.connect(), "connect", SESSION_BOOTSTRAP_TIMEOUT_MS);
        if (!active) return;
        setStatusMessage("Initializing session...");
        setProgress((current) => Math.max(current, 75));

        await withTimeout(runtime.initialize(), "initialize", SESSION_BOOTSTRAP_TIMEOUT_MS);
        if (!active) return;
        setStatusMessage("Preparing tools...");
        setProgress((current) => Math.max(current, 85));

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
          SESSION_BOOTSTRAP_TIMEOUT_MS
        );
        if (!active) return;
        setSessionId(session.id);
        setCurrentSession(session.id);
        setView("chat");
        setProgress(100);
        setStatusMessage("Ready");
        clearScreen();
        setStage("ready");
      } catch (error) {
        if (active) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setLoadError(errorMessage);
          setConnectionStatus(CONNECTION_STATUS.ERROR);
          setCurrentSession(undefined);
          setStage("error");
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

  if (stage === "error") {
    return (
      <Box padding={1} flexDirection="column" gap={1}>
        <Text color={COLOR.RED}>Error: {loadError ?? statusMessage}</Text>
        {loadError ? <Text dimColor>{loadError}</Text> : null}
      </Box>
    );
  }

  if (stage === "loading" || stage === "connecting" || !isHydrated || !hasHarnesses) {
    return <LoadingScreen progress={progress} status={statusMessage} />;
  }

  return (
    <TerminalInfoProvider>
      <Box flexDirection="column" padding={1} gap={1} height="100%">
        {view === "agent-select" && <AsciiBanner />}
        {loadError ? (
          <Box flexDirection="column" gap={1}>
            <Text color={COLOR.RED}>Error: {loadError}</Text>
            <Text dimColor>Check that Claude CLI is installed and accessible</Text>
          </Box>
        ) : null}
        {view === "agent-select" ? (
          <AgentSelect
            agents={agentOptions}
            onSelect={(agent) => {
              const info = agentInfoMap.get(agent.id);
              if (info) {
                clearScreen();
                setStatusMessage(`Connecting to ${info.name}...`);
                setProgress((current) => Math.max(current, 60));
                setStage("connecting");
                setSelectedAgent(info);
                setView(VIEW.CHAT);
              }
            }}
          />
        ) : (
          <Box flexDirection="row" gap={1} flexGrow={1} height="100%">
            <Sidebar width="30%" currentAgentName={selectedAgent?.name} />
            <Box
              flexDirection="column"
              flexGrow={1}
              height="100%"
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
                />
              )}
            </Box>
          </Box>
        )}
        <StatusFooter taskProgress={undefined} />
      </Box>
    </TerminalInfoProvider>
  );
}

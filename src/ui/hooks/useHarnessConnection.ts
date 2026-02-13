import type { AgentInfo } from "@/agents/agent-manager";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { RENDER_STAGE, type RenderStage } from "@/constants/render-stage";
import { VIEW } from "@/constants/views";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { SessionManager } from "@/core/session-manager";
import type { SessionStream } from "@/core/session-stream";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { HarnessRegistry } from "@/harness/harnessRegistry";
import { useAppStore } from "@/store/app-store";
import type { Session, SessionId } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";
import { withTimeout } from "@/utils/async/withTimeout";
import { EnvManager } from "@/utils/env/env.utils";
import { clearScreen } from "@/utils/terminal/clearScreen.utils";
import { useEffect, useState } from "react";

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException => {
  return typeof error === "object" && error !== null && "code" in error;
};

/**
 * Formats harness errors into user-friendly messages.
 */
export const formatHarnessError = (
  error: unknown,
  context: { agentName?: string; command?: string }
): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (isErrnoException(error)) {
    if (error.code === ERROR_CODE.ENOENT) {
      const cmd = context.command ?? "claude-code-acp";
      return `Command '${cmd}' not found for ${context.agentName ?? "agent"}. Install it or update TOADSTOOL_CLAUDE_COMMAND.`;
    }
    if (error.code === ERROR_CODE.EACCES) {
      const cmd = context.command ?? "agent command";
      return `Permission denied starting ${context.agentName ?? "agent"} (${cmd}). Check executable permissions.`;
    }
  }
  return context.agentName ? `Unable to connect to ${context.agentName}: ${message}` : message;
};

export interface UseHarnessConnectionOptions {
  selectedAgent: AgentInfo | null;
  harnessConfigs: Record<string, HarnessConfig>;
  harnessRegistry: HarnessRegistry;
  sessionStream: SessionStream;
  onStageChange: (stage: RenderStage) => void;
  onProgressChange: (progress: number | ((current: number) => number)) => void;
  onStatusMessageChange: (message: string) => void;
  onLoadErrorChange: (error: string | null) => void;
  onViewChange: (view: typeof VIEW.CHAT | typeof VIEW.AGENT_SELECT) => void;
}

export interface UseHarnessConnectionResult {
  client: HarnessRuntime | null;
  sessionId: SessionId | undefined;
}

export const isCursorHarness = (harnessId: string): boolean => {
  return harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID;
};

export const selectLatestSessionForHarness = (
  sessions: Session[],
  harnessId: string
): Session | undefined => {
  const matches = sessions
    .filter((session) => session.agentId === harnessId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return matches[0];
};

/**
 * Hook to manage harness connection lifecycle.
 * Handles connecting to the selected agent, creating sessions, and error handling.
 */
export function useHarnessConnection({
  selectedAgent,
  harnessConfigs,
  harnessRegistry,
  sessionStream,
  onStageChange,
  onProgressChange,
  onStatusMessageChange,
  onLoadErrorChange,
  onViewChange,
}: UseHarnessConnectionOptions): UseHarnessConnectionResult {
  const [client, setClient] = useState<HarnessRuntime | null>(null);
  const [sessionId, setSessionId] = useState<SessionId | undefined>(undefined);

  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);
  const sessions = useAppStore((state): Session[] =>
    Object.values(state.sessions).filter((session): session is Session => Boolean(session))
  );

  useEffect(() => {
    if (!selectedAgent) {
      setClient(null);
      return;
    }

    const harnessConfig = harnessConfigs[selectedAgent.harnessId];
    if (!harnessConfig) {
      onLoadErrorChange(`Harness '${selectedAgent.harnessId}' not configured.`);
      onStageChange(RENDER_STAGE.ERROR);
      onStatusMessageChange("Harness not configured");
      return;
    }

    const effectiveConfig: HarnessConfig = {
      ...harnessConfig,
      permissions: selectedAgent.permissions ?? harnessConfig.permissions,
    };

    const adapter = harnessRegistry.get(effectiveConfig.id);
    if (!adapter) {
      onLoadErrorChange(`Harness adapter '${effectiveConfig.id}' not registered.`);
      onStageChange(RENDER_STAGE.ERROR);
      onStatusMessageChange("Harness adapter missing");
      return;
    }

    const env = EnvManager.getInstance().getSnapshot();
    if (
      effectiveConfig.command.includes(HARNESS_DEFAULT.CLAUDE_COMMAND) &&
      !env[ENV_KEY.ANTHROPIC_API_KEY]
    ) {
      onLoadErrorChange(
        "Claude Code ACP adapter requires ANTHROPIC_API_KEY. Set it in your environment or .env file."
      );
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      onStageChange(RENDER_STAGE.ERROR);
      onStatusMessageChange("Missing ANTHROPIC_API_KEY");
      return;
    }

    const runtime = adapter.createHarness(effectiveConfig);
    const detach = sessionStream.attach(runtime);
    const sessionManager = new SessionManager(runtime, useAppStore.getState());

    runtime.on("state", (status) => setConnectionStatus(status));
    runtime.on("error", (error) => {
      const message = formatHarnessError(error, {
        agentName: selectedAgent?.name ?? harnessConfig.name,
        command: harnessConfig.command,
      });
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      onLoadErrorChange(message);
      setCurrentSession(undefined);
      onStageChange(RENDER_STAGE.ERROR);
      onStatusMessageChange(message);
    });

    let active = true;
    setSessionId(undefined);
    setCurrentSession(undefined);
    setClient(runtime);
    onLoadErrorChange(null);
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    onStageChange(RENDER_STAGE.CONNECTING);
    onStatusMessageChange(`Connecting to ${selectedAgent.name}…`);
    onProgressChange((current) => Math.max(current, UI.PROGRESS.CONNECTION_START));
    clearScreen();

    void (async () => {
      try {
        await withTimeout(runtime.connect(), "connect", TIMEOUT.SESSION_BOOTSTRAP_MS);
        if (!active) return;
        onStatusMessageChange("Initializing session…");
        onProgressChange((current) => Math.max(current, UI.PROGRESS.CONNECTION_ESTABLISHED));

        await withTimeout(runtime.initialize(), "initialize", TIMEOUT.SESSION_BOOTSTRAP_MS);
        if (!active) return;
        onStatusMessageChange("Preparing tools…");
        onProgressChange((current) => Math.max(current, UI.PROGRESS.SESSION_READY));

        if (isCursorHarness(effectiveConfig.id)) {
          const resumeSession = selectLatestSessionForHarness(sessions, effectiveConfig.id);
          if (resumeSession) {
            setSessionId(resumeSession.id);
            setCurrentSession(resumeSession.id);
            onViewChange(VIEW.CHAT);
            onProgressChange(UI.PROGRESS.COMPLETE);
            onStatusMessageChange("Ready (resumed previous session)");
            clearScreen();
            onStageChange(RENDER_STAGE.READY);
            return;
          }
        }

        const mcpConfig = await loadMcpConfig();
        const session = await withTimeout(
          sessionManager.createSession({
            cwd: process.cwd(),
            agentId: AgentIdSchema.parse(effectiveConfig.id),
            title: effectiveConfig.name,
            mcpConfig,
            env,
            mode: selectedAgent.sessionMode,
            model: selectedAgent.model,
            temperature: selectedAgent.temperature,
          }),
          "create session",
          TIMEOUT.SESSION_BOOTSTRAP_MS
        );
        if (!active) return;
        setSessionId(session.id);
        setCurrentSession(session.id);
        onViewChange(VIEW.CHAT);
        onProgressChange(UI.PROGRESS.COMPLETE);
        onStatusMessageChange("Ready");
        clearScreen();
        onStageChange(RENDER_STAGE.READY);
      } catch (error) {
        if (active) {
          const friendly = formatHarnessError(error, {
            agentName: selectedAgent?.name ?? harnessConfig.name,
            command: harnessConfig.command,
          });
          const retryNote =
            LIMIT.MAX_CONNECTION_RETRIES > 1
              ? ` (after ${LIMIT.MAX_CONNECTION_RETRIES} attempts)`
              : "";
          const errorMessage = `${friendly}${retryNote}`;
          onLoadErrorChange(errorMessage);
          setConnectionStatus(CONNECTION_STATUS.ERROR);
          setCurrentSession(undefined);
          onStageChange(RENDER_STAGE.ERROR);
          onStatusMessageChange(errorMessage);
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
    onStageChange,
    onProgressChange,
    onStatusMessageChange,
    onLoadErrorChange,
    onViewChange,
    sessions,
  ]);

  return { client, sessionId };
}

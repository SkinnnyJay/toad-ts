import type { AgentInfo } from "@/agents/agent-manager";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CURSOR_AUTH_GUIDANCE } from "@/constants/cursor-auth-guidance";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { HARNESS_INSTALL_GUIDANCE } from "@/constants/harness-install-guidance";
import { RENDER_STAGE, type RenderStage } from "@/constants/render-stage";
import { VIEW } from "@/constants/views";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { SessionManager } from "@/core/session-manager";
import type { SessionStream } from "@/core/session-stream";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { HarnessRegistry } from "@/harness/harnessRegistry";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";
import { toErrorMessage } from "@/ui/utils/auth-error-matcher";
import { isAuthFailureMessage } from "@/ui/utils/auth-error-matcher";
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
  context: { agentName?: string; command?: string; harnessId?: string }
): string => {
  const message = toErrorMessage(error) ?? String(error);
  if (
    context.harnessId === HARNESS_DEFAULT.CURSOR_CLI_ID &&
    (message === CURSOR_AUTH_GUIDANCE.LOGIN_REQUIRED ||
      isAuthFailureMessage(message, { includeCursorApiKeyHint: true }))
  ) {
    return CURSOR_AUTH_GUIDANCE.LOGIN_REQUIRED;
  }
  const defaultCommandForHarness = (harnessId: string | undefined): string => {
    switch (harnessId) {
      case HARNESS_DEFAULT.GEMINI_CLI_ID:
        return HARNESS_DEFAULT.GEMINI_COMMAND;
      case HARNESS_DEFAULT.CODEX_CLI_ID:
        return HARNESS_DEFAULT.CODEX_COMMAND;
      case HARNESS_DEFAULT.CURSOR_CLI_ID:
        return HARNESS_DEFAULT.CURSOR_COMMAND;
      default:
        return HARNESS_DEFAULT.CLAUDE_COMMAND;
    }
  };
  const commandEnvKeyForHarness = (harnessId: string | undefined): string | undefined => {
    switch (harnessId) {
      case HARNESS_DEFAULT.CLAUDE_CLI_ID:
        return ENV_KEY.TOADSTOOL_CLAUDE_COMMAND;
      case HARNESS_DEFAULT.GEMINI_CLI_ID:
        return ENV_KEY.TOADSTOOL_GEMINI_COMMAND;
      case HARNESS_DEFAULT.CODEX_CLI_ID:
        return ENV_KEY.TOADSTOOL_CODEX_COMMAND;
      case HARNESS_DEFAULT.CURSOR_CLI_ID:
        return ENV_KEY.TOADSTOOL_CURSOR_COMMAND;
      default:
        return undefined;
    }
  };
  const installHintForHarness = (harnessId: string | undefined): string | undefined => {
    switch (harnessId) {
      case HARNESS_DEFAULT.CLAUDE_CLI_ID:
        return HARNESS_INSTALL_GUIDANCE[HARNESS_DEFAULT.CLAUDE_CLI_ID];
      case HARNESS_DEFAULT.GEMINI_CLI_ID:
        return HARNESS_INSTALL_GUIDANCE[HARNESS_DEFAULT.GEMINI_CLI_ID];
      case HARNESS_DEFAULT.CODEX_CLI_ID:
        return HARNESS_INSTALL_GUIDANCE[HARNESS_DEFAULT.CODEX_CLI_ID];
      case HARNESS_DEFAULT.CURSOR_CLI_ID:
        return HARNESS_INSTALL_GUIDANCE[HARNESS_DEFAULT.CURSOR_CLI_ID];
      default:
        return undefined;
    }
  };
  if (isErrnoException(error)) {
    if (error.code === ERROR_CODE.ENOENT) {
      const cmd = context.command ?? defaultCommandForHarness(context.harnessId);
      const commandEnvKey = commandEnvKeyForHarness(context.harnessId);
      const installHint = installHintForHarness(context.harnessId);
      const commandHint = commandEnvKey
        ? `${installHint ?? "Install it."} Or update ${commandEnvKey}.`
        : `${installHint ?? "Install it."} Or update harness command configuration.`;
      return `Command '${cmd}' not found for ${context.agentName ?? "agent"}. ${commandHint}`;
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
        harnessId: selectedAgent?.harnessId ?? harnessConfig.id,
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
            harnessId: selectedAgent?.harnessId ?? harnessConfig.id,
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
  ]);

  return { client, sessionId };
}

import {
  AGENT_MANAGEMENT_COMMAND,
  type AgentManagementCapability,
  HARNESS_ID,
  HARNESS_MANAGEMENT_CAPABILITIES,
} from "@/constants/agent-management-commands";
import { ENV_KEY } from "@/constants/env-keys";
import {
  parseCursorAboutOutput,
  parseCursorModelsOutput,
  parseCursorStatusOutput,
} from "@/core/cursor/cursor-command-parsers";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { Session } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { COMMAND_RESULT_EMPTY, HARNESS_MESSAGE } from "./agent-management-command-helpers";

export const isCursorHarness = (harness: HarnessConfig): boolean =>
  harness.id === HARNESS_ID.CURSOR_CLI;

export const hasCapability = (
  harness: HarnessConfig | undefined,
  capability: AgentManagementCapability
): boolean => {
  if (!harness) {
    return false;
  }
  const supported = HARNESS_MANAGEMENT_CAPABILITIES[harness.id];
  if (!supported) {
    return false;
  }
  return supported.includes(capability);
};

export const unsupportedCapabilityMessage = (
  harness: HarnessConfig,
  capability: AgentManagementCapability
): string => {
  return `${capability} ${HARNESS_MESSAGE.NOT_SUPPORTED} (${harness.name})`;
};

export const resolveNativeCommandArgs = (
  harness: HarnessConfig,
  command: string,
  args: string[] = []
): string[] => {
  if (command === AGENT_MANAGEMENT_COMMAND.ABOUT) {
    if (isCursorHarness(harness)) {
      return [AGENT_MANAGEMENT_COMMAND.ABOUT];
    }
    return ["--version"];
  }
  if (command === AGENT_MANAGEMENT_COMMAND.STATUS && harness.id === HARNESS_ID.CODEX_CLI) {
    return [AGENT_MANAGEMENT_COMMAND.LOGIN, AGENT_MANAGEMENT_COMMAND.STATUS];
  }
  if (command === AGENT_MANAGEMENT_COMMAND.STATUS && harness.id === HARNESS_ID.GEMINI_CLI) {
    return ["list-sessions"];
  }
  return [command, ...args];
};

export const getMergedHarnessEnv = (harness: HarnessConfig): NodeJS.ProcessEnv => {
  return {
    ...EnvManager.getInstance().getSnapshot(),
    ...harness.env,
  };
};

export const mapStatusLines = (context: {
  connectionStatus?: string;
  session?: Session;
  activeAgentName?: string;
  activeHarness?: HarnessConfig;
}): string[] => {
  return [
    `Connection: ${context.connectionStatus ?? "unknown"}`,
    `Session: ${context.session?.id ?? "none"}`,
    `Agent: ${context.activeAgentName ?? "none"}`,
    `Harness: ${context.activeHarness?.id ?? "none"}`,
    `Mode: ${context.session?.mode ?? "none"}`,
    `Model: ${context.session?.metadata?.model ?? "default"}`,
  ];
};

export const mapMcpLines = (session: Session | undefined): string[] => {
  const mcpServers = session?.metadata?.mcpServers ?? [];
  if (mcpServers.length === 0) {
    return ["No MCP servers configured for this session."];
  }
  return mcpServers.map((server, index) => {
    if ("url" in server) {
      return `${index + 1}. ${server.name} (${server.url})`;
    }
    return `${index + 1}. ${server.name} (${server.command})`;
  });
};

export const mapCursorStatusLines = (stdout: string, stderr: string): string[] => {
  const env = EnvManager.getInstance().getSnapshot();
  const auth = parseCursorStatusOutput(stdout, stderr, env[ENV_KEY.CURSOR_API_KEY]);
  return [
    `Authenticated: ${auth.authenticated ? "yes" : "no"}`,
    `Method: ${auth.method ?? "none"}`,
    `Email: ${auth.email ?? "unknown"}`,
  ];
};

export const mapClaudeStatusLines = (harness: HarnessConfig): string[] => {
  const env = getMergedHarnessEnv(harness);
  const hasApiKey = Boolean(env[ENV_KEY.ANTHROPIC_API_KEY]);
  return [
    `Authenticated: ${hasApiKey ? "yes" : "no"}`,
    `Method: ${hasApiKey ? "api_key" : "none"}`,
  ];
};

export const mapGeminiStatusLines = (harness: HarnessConfig): string[] => {
  const env = getMergedHarnessEnv(harness);
  const hasGoogleApiKey = Boolean(env[ENV_KEY.GOOGLE_API_KEY]);
  const hasGeminiApiKey = Boolean(env[ENV_KEY.GEMINI_API_KEY]);
  const hasApiKey = hasGoogleApiKey || hasGeminiApiKey;
  const keySource = hasGoogleApiKey
    ? ENV_KEY.GOOGLE_API_KEY
    : hasGeminiApiKey
      ? ENV_KEY.GEMINI_API_KEY
      : "unset";
  return [
    `Authenticated: ${hasApiKey ? "yes" : "no"}`,
    `Method: ${hasApiKey ? "api_key" : "none"}`,
    `Key source: ${keySource}`,
  ];
};

export const mapCursorModelLines = (stdout: string): string[] => {
  const models = parseCursorModelsOutput(stdout);
  if (models.models.length === 0) {
    return ["No models reported by cursor-agent."];
  }
  return models.models.map((model) => {
    const tags = [
      model.id === models.currentModel ? "current" : "",
      model.id === models.defaultModel ? "default" : "",
    ]
      .filter((value) => value.length > 0)
      .join(", ");
    const tagSuffix = tags.length > 0 ? ` [${tags}]` : "";
    return `- ${model.id}${tagSuffix}`;
  });
};

export const mapCursorAboutLines = (stdout: string): string[] => {
  const about = parseCursorAboutOutput(stdout);
  const prioritizedLines = [
    about.cliVersion ? `Version: ${about.cliVersion}` : undefined,
    about.model ? `Model: ${about.model}` : undefined,
    about.os ? `OS: ${about.os}` : undefined,
    about.terminal ? `Terminal: ${about.terminal}` : undefined,
    about.shell ? `Shell: ${about.shell}` : undefined,
    about.userEmail ? `User: ${about.userEmail}` : undefined,
  ].filter((line): line is string => line !== undefined);
  if (prioritizedLines.length > 0) {
    return prioritizedLines;
  }
  const fallback = Object.entries(about.fields).map(([key, value]) => `${key}: ${value}`);
  return fallback.length > 0 ? fallback : [COMMAND_RESULT_EMPTY];
};

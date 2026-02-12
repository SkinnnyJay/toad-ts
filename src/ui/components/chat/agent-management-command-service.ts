import { LIMIT } from "@/config/limits";
import { AGENT_MANAGEMENT_COMMAND, HARNESS_ID } from "@/constants/agent-management-commands";
import { ENV_KEY } from "@/constants/env-keys";
import {
  parseCursorModelsOutput,
  parseCursorStatusOutput,
} from "@/core/cursor/cursor-command-parsers";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { Session } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { execa } from "execa";

export interface AgentManagementContext {
  activeHarness?: HarnessConfig;
  activeAgentName?: string;
  session?: Session;
  connectionStatus?: string;
}

interface HarnessCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const isCursorHarness = (harness: HarnessConfig): boolean => harness.id === HARNESS_ID.CURSOR_CLI;

const runHarnessCommand = async (
  harness: HarnessConfig,
  args: string[]
): Promise<HarnessCommandResult> => {
  const env = {
    ...EnvManager.getInstance().getSnapshot(),
    ...harness.env,
  };
  const result = await execa(harness.command, [...harness.args, ...args], {
    cwd: harness.cwd,
    env,
    reject: false,
    timeout: LIMIT.PROVIDER_HEALTH_TIMEOUT_MS,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode ?? 1,
  };
};

const mapStatusLines = (context: AgentManagementContext): string[] => {
  return [
    `Connection: ${context.connectionStatus ?? "unknown"}`,
    `Session: ${context.session?.id ?? "none"}`,
    `Agent: ${context.activeAgentName ?? "none"}`,
    `Harness: ${context.activeHarness?.id ?? "none"}`,
    `Mode: ${context.session?.mode ?? "none"}`,
    `Model: ${context.session?.metadata?.model ?? "default"}`,
  ];
};

const mapMcpLines = (session: Session | undefined): string[] => {
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

const mapCursorStatusLines = (stdout: string, stderr: string): string[] => {
  const env = EnvManager.getInstance().getSnapshot();
  const auth = parseCursorStatusOutput(stdout, stderr, env[ENV_KEY.CURSOR_API_KEY]);
  return [
    `Authenticated: ${auth.authenticated ? "yes" : "no"}`,
    `Method: ${auth.method ?? "none"}`,
    `Email: ${auth.email ?? "unknown"}`,
  ];
};

const mapCursorModelLines = (stdout: string): string[] => {
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

export const runAgentCommand = async (
  command: string,
  context: AgentManagementContext
): Promise<string[]> => {
  const harness = context.activeHarness;
  switch (command) {
    case AGENT_MANAGEMENT_COMMAND.AGENT:
      return mapStatusLines(context);
    case AGENT_MANAGEMENT_COMMAND.MCP:
      return mapMcpLines(context.session);
    case AGENT_MANAGEMENT_COMMAND.LOGIN:
      if (!harness) {
        return ["No active harness selected."];
      }
      return [`Run \`${harness.command} ${harness.args.join(" ")} login\` in a terminal.`];
    case AGENT_MANAGEMENT_COMMAND.LOGOUT:
      if (!harness) {
        return ["No active harness selected."];
      }
      {
        const result = await runHarnessCommand(harness, [AGENT_MANAGEMENT_COMMAND.LOGOUT]);
        if (result.exitCode !== 0) {
          return [
            `Logout command failed for ${harness.name}.`,
            result.stderr || result.stdout || "No output available.",
          ];
        }
        return [result.stdout || "Logout completed."];
      }
    case AGENT_MANAGEMENT_COMMAND.STATUS:
      if (!harness) {
        return mapStatusLines(context);
      }
      {
        const result = await runHarnessCommand(harness, [AGENT_MANAGEMENT_COMMAND.STATUS]);
        if (result.exitCode !== 0) {
          return mapStatusLines(context);
        }
        if (isCursorHarness(harness)) {
          return mapCursorStatusLines(result.stdout, result.stderr);
        }
        return [result.stdout || result.stderr || "Status command produced no output."];
      }
    case AGENT_MANAGEMENT_COMMAND.MODELS:
      if (!harness) {
        const availableModels = context.session?.metadata?.availableModels ?? [];
        if (availableModels.length === 0) {
          return ["No models available for current session."];
        }
        return availableModels.map((model) => `- ${model.modelId}`);
      }
      {
        const result = await runHarnessCommand(harness, [AGENT_MANAGEMENT_COMMAND.MODELS]);
        if (result.exitCode !== 0) {
          return [result.stderr || "Failed to list models."];
        }
        if (isCursorHarness(harness)) {
          return mapCursorModelLines(result.stdout);
        }
        return [result.stdout || "No models output."];
      }
    default:
      return ["Unsupported management command."];
  }
};

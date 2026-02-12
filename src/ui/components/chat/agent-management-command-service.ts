import { LIMIT } from "@/config/limits";
import {
  AGENT_MANAGEMENT_CAPABILITY,
  AGENT_MANAGEMENT_COMMAND,
  HARNESS_ID,
} from "@/constants/agent-management-commands";
import {
  parseClaudeMcpListOutput,
  parseCodexLoginStatusOutput,
  parseMcpListOutput,
} from "@/core/cli-agent/agent-command-parsers";
import { CursorCloudAgentClient } from "@/core/cursor/cloud-agent-client";
import { parseCursorMcpListOutput } from "@/core/cursor/cursor-command-parsers";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { Session } from "@/types/domain";
import {
  formatAboutResult,
  formatLoginResult,
  formatMcpList,
  formatModelsResult,
  formatStatusResult,
} from "@/ui/formatters/agent-command-formatter";
import { execa } from "execa";
import { resolveGeminiStatusLines } from "./agent-management-command-gemini";
import {
  AGENT_MESSAGE,
  AGENT_SUBCOMMAND,
  CLOUD_AGENT_MESSAGE,
  CLOUD_AGENT_SUBCOMMAND,
  COMMAND_RESULT_EMPTY,
  HARNESS_MESSAGE,
  MCP_MESSAGE,
  MCP_SUBCOMMAND,
  parseCloudListArgs,
  toErrorMessage,
  toHarnessCommand,
} from "./agent-management-command-helpers";
import {
  getMergedHarnessEnv,
  hasCapability,
  isCursorHarness,
  mapClaudeStatusLines,
  mapCursorAboutLines,
  mapCursorLoginLines,
  mapCursorLogoutLines,
  mapCursorModelLines,
  mapCursorStatusLines,
  mapMcpLines,
  mapStatusLines,
  parseAboutVersionForHarness,
  resolveNativeCommandArgs,
  unsupportedCapabilityMessage,
} from "./agent-management-command-resolver";

export interface AgentManagementContext {
  activeHarness?: HarnessConfig;
  activeAgentName?: string;
  session?: Session;
  connectionStatus?: string;
  cloudClient?: Pick<
    CursorCloudAgentClient,
    | "listAgents"
    | "launchAgent"
    | "stopAgent"
    | "followupAgent"
    | "getConversation"
    | "waitForAgentStatus"
  >;
}

interface HarnessCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const MCP_SUPPORTED_SUBCOMMANDS_BY_HARNESS: Record<string, string[]> = {
  [HARNESS_ID.CURSOR_CLI]: [
    MCP_SUBCOMMAND.LIST,
    MCP_SUBCOMMAND.LIST_TOOLS,
    MCP_SUBCOMMAND.ENABLE,
    MCP_SUBCOMMAND.DISABLE,
    MCP_SUBCOMMAND.LOGIN,
  ],
  [HARNESS_ID.CLAUDE_CLI]: [MCP_SUBCOMMAND.LIST],
};

const runHarnessCommand = async (
  harness: HarnessConfig,
  args: string[]
): Promise<HarnessCommandResult> => {
  const env = getMergedHarnessEnv(harness);
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

const getCloudClient = (
  context: AgentManagementContext
): Pick<
  CursorCloudAgentClient,
  | "listAgents"
  | "launchAgent"
  | "stopAgent"
  | "followupAgent"
  | "getConversation"
  | "waitForAgentStatus"
> => {
  if (context.cloudClient) {
    return context.cloudClient;
  }
  return new CursorCloudAgentClient();
};

const runMcpCommand = async (
  context: AgentManagementContext,
  args: string[]
): Promise<string[]> => {
  const harness = context.activeHarness;
  if (!harness) {
    return mapMcpLines(context.session);
  }
  if (!hasCapability(harness, AGENT_MANAGEMENT_CAPABILITY.MCP)) {
    return [unsupportedCapabilityMessage(harness, AGENT_MANAGEMENT_CAPABILITY.MCP)];
  }

  const [subcommand = MCP_SUBCOMMAND.LIST, ...subArgs] = args;
  const commandsRequiringServerId: string[] = [
    MCP_SUBCOMMAND.LIST_TOOLS,
    MCP_SUBCOMMAND.ENABLE,
    MCP_SUBCOMMAND.DISABLE,
    MCP_SUBCOMMAND.LOGIN,
  ];
  if (commandsRequiringServerId.includes(subcommand) && !subArgs[0]?.trim()) {
    return [MCP_MESSAGE.MISSING_SERVER_ID];
  }

  if (
    subcommand !== MCP_SUBCOMMAND.LIST &&
    subcommand !== MCP_SUBCOMMAND.LIST_TOOLS &&
    subcommand !== MCP_SUBCOMMAND.ENABLE &&
    subcommand !== MCP_SUBCOMMAND.DISABLE &&
    subcommand !== MCP_SUBCOMMAND.LOGIN
  ) {
    return [MCP_MESSAGE.USAGE];
  }

  const supportedSubcommands = MCP_SUPPORTED_SUBCOMMANDS_BY_HARNESS[harness.id] ?? [];
  if (!supportedSubcommands.includes(subcommand)) {
    return [`${MCP_MESSAGE.UNSUPPORTED_SUBCOMMAND} (${harness.name})`];
  }

  const commandArgs = resolveNativeCommandArgs(harness, AGENT_MANAGEMENT_COMMAND.MCP, [
    subcommand,
    ...subArgs,
  ]);
  const result = await runHarnessCommand(harness, commandArgs);
  if (result.exitCode !== 0) {
    return [result.stderr || result.stdout || COMMAND_RESULT_EMPTY];
  }

  if (isCursorHarness(harness) && subcommand === MCP_SUBCOMMAND.LIST) {
    const parsed = parseCursorMcpListOutput(result.stdout);
    if (parsed.length === 0) {
      return [COMMAND_RESULT_EMPTY];
    }
    return formatMcpList(parsed, harness.name);
  }

  if (subcommand === MCP_SUBCOMMAND.LIST) {
    const parsed =
      harness.id === HARNESS_ID.CLAUDE_CLI
        ? parseClaudeMcpListOutput(result.stdout)
        : parseMcpListOutput(result.stdout);
    if (parsed.length > 0) {
      return formatMcpList(parsed, harness.name);
    }
  }

  const lines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.length > 0 ? lines : [COMMAND_RESULT_EMPTY];
};

const runCloudAgentCommand = async (
  context: AgentManagementContext,
  args: string[]
): Promise<string[]> => {
  const harness = context.activeHarness;
  if (!harness || !isCursorHarness(harness)) {
    return [CLOUD_AGENT_MESSAGE.CURSOR_ONLY];
  }

  const [subcommand, ...subArgs] = args;
  if (!subcommand) {
    return [CLOUD_AGENT_MESSAGE.USAGE];
  }
  switch (subcommand) {
    case CLOUD_AGENT_SUBCOMMAND.LIST: {
      const cloudClient = getCloudClient(context);
      const { limit, cursor } = parseCloudListArgs(subArgs);
      const list = await cloudClient.listAgents({ limit, cursor });
      if (list.items.length === 0) {
        return ["No active cloud agents."];
      }
      const lines = list.items.map((agent) => `- ${agent.id} (${agent.status ?? "unknown"})`);
      if (list.nextCursor) {
        lines.push(`Next cursor: ${list.nextCursor}`);
      }
      return lines;
    }
    case CLOUD_AGENT_SUBCOMMAND.LAUNCH: {
      const prompt = subArgs.join(" ").trim();
      if (!prompt) {
        return [CLOUD_AGENT_MESSAGE.MISSING_PROMPT];
      }
      const cloudClient = getCloudClient(context);
      const launchResponse = await cloudClient.launchAgent({
        prompt,
        model: context.session?.metadata?.model,
      });
      try {
        const agent = await cloudClient.waitForAgentStatus(launchResponse.agent.id);
        const conversation = await cloudClient.getConversation(launchResponse.agent.id);
        return [
          `Dispatched cloud agent: ${launchResponse.agent.id}`,
          `Status: ${agent.status ?? "unknown"}`,
          `Conversation messages: ${conversation.messages.length}`,
        ];
      } catch (error) {
        return [
          `Dispatched cloud agent: ${launchResponse.agent.id}`,
          `${CLOUD_AGENT_MESSAGE.PENDING_STATUS} ${toErrorMessage(error)}`,
        ];
      }
    }
    case CLOUD_AGENT_SUBCOMMAND.STOP: {
      const agentId = subArgs[0]?.trim();
      if (!agentId) {
        return [CLOUD_AGENT_MESSAGE.MISSING_AGENT_ID];
      }
      const cloudClient = getCloudClient(context);
      await cloudClient.stopAgent(agentId);
      return [`Stopped cloud agent: ${agentId}`];
    }
    case CLOUD_AGENT_SUBCOMMAND.FOLLOWUP: {
      const agentId = subArgs[0]?.trim();
      const prompt = subArgs.slice(1).join(" ").trim();
      if (!agentId || !prompt) {
        return [CLOUD_AGENT_MESSAGE.MISSING_FOLLOWUP];
      }
      const cloudClient = getCloudClient(context);
      const response = await cloudClient.followupAgent(agentId, { prompt });
      return [
        `Follow-up sent to cloud agent: ${agentId}`,
        `Status: ${response.status ?? "unknown"}`,
      ];
    }
    case CLOUD_AGENT_SUBCOMMAND.CONVERSATION: {
      const agentId = subArgs[0]?.trim();
      if (!agentId) {
        return [CLOUD_AGENT_MESSAGE.MISSING_CONVERSATION];
      }
      const cloudClient = getCloudClient(context);
      const conversation = await cloudClient.getConversation(agentId);
      const messageCount = conversation.messages.length;
      return [
        `Cloud conversation: ${conversation.id}`,
        `Messages: ${messageCount}`,
        messageCount > 0
          ? "Use cloud dashboard for detailed transcript rendering."
          : "No conversation messages recorded yet.",
      ];
    }
    default:
      return [CLOUD_AGENT_MESSAGE.USAGE];
  }
};

const resolveAgentRootCommand = (subcommand: string | undefined): string | undefined => {
  switch (subcommand) {
    case AGENT_SUBCOMMAND.LOGIN:
      return AGENT_MANAGEMENT_COMMAND.LOGIN;
    case AGENT_SUBCOMMAND.LOGOUT:
      return AGENT_MANAGEMENT_COMMAND.LOGOUT;
    case AGENT_SUBCOMMAND.STATUS:
      return AGENT_MANAGEMENT_COMMAND.STATUS;
    case AGENT_SUBCOMMAND.MODELS:
      return AGENT_MANAGEMENT_COMMAND.MODELS;
    case AGENT_SUBCOMMAND.ABOUT:
      return AGENT_MANAGEMENT_COMMAND.ABOUT;
    default:
      return undefined;
  }
};

export const runAgentCommand = async (
  command: string,
  context: AgentManagementContext,
  args: string[] = []
): Promise<string[]> => {
  const harness = context.activeHarness;
  switch (command) {
    case AGENT_MANAGEMENT_COMMAND.AGENT:
      if (args.length === 0) {
        return runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, context);
      }
      if (args[0] === AGENT_SUBCOMMAND.CLOUD) {
        return runCloudAgentCommand(context, args.slice(1));
      }
      if (args[0] === AGENT_SUBCOMMAND.MCP) {
        return runMcpCommand(context, args.slice(1));
      }
      {
        const delegatedCommand = resolveAgentRootCommand(args[0]);
        if (delegatedCommand) {
          return runAgentCommand(delegatedCommand, context, args.slice(1));
        }
      }
      return [AGENT_MESSAGE.UNSUPPORTED_SUBCOMMAND];
    case AGENT_MANAGEMENT_COMMAND.MCP:
      return runMcpCommand(context, args);
    case AGENT_MANAGEMENT_COMMAND.LOGIN:
      if (!harness) {
        return [HARNESS_MESSAGE.NO_ACTIVE_HARNESS];
      }
      if (!hasCapability(harness, AGENT_MANAGEMENT_CAPABILITY.LOGIN)) {
        if (harness.id === HARNESS_ID.GEMINI_CLI) {
          return [HARNESS_MESSAGE.GEMINI_LOGIN];
        }
        return [unsupportedCapabilityMessage(harness, AGENT_MANAGEMENT_CAPABILITY.LOGIN)];
      }
      if (harness.id === HARNESS_ID.CURSOR_CLI) {
        const result = await runHarnessCommand(
          harness,
          resolveNativeCommandArgs(harness, AGENT_MANAGEMENT_COMMAND.LOGIN)
        );
        return mapCursorLoginLines(harness, result.stdout, result.stderr);
      }
      if (harness.id === HARNESS_ID.CODEX_CLI) {
        return formatLoginResult(
          {
            supported: true,
            command: toHarnessCommand(
              harness.command,
              harness.args,
              AGENT_MANAGEMENT_COMMAND.LOGIN
            ),
            requiresBrowser: true,
          },
          harness.name
        );
      }
      return [
        `Run \`${toHarnessCommand(harness.command, harness.args, AGENT_MANAGEMENT_COMMAND.LOGIN)}\` in a terminal.`,
      ];
    case AGENT_MANAGEMENT_COMMAND.LOGOUT:
      if (!harness) {
        return [HARNESS_MESSAGE.NO_ACTIVE_HARNESS];
      }
      if (!hasCapability(harness, AGENT_MANAGEMENT_CAPABILITY.LOGOUT)) {
        return [unsupportedCapabilityMessage(harness, AGENT_MANAGEMENT_CAPABILITY.LOGOUT)];
      }
      {
        const result = await runHarnessCommand(
          harness,
          resolveNativeCommandArgs(harness, AGENT_MANAGEMENT_COMMAND.LOGOUT)
        );
        if (harness.id === HARNESS_ID.CURSOR_CLI) {
          return mapCursorLogoutLines(harness, result.stdout, result.stderr);
        }
        if (result.exitCode !== 0) {
          return [
            `Logout command failed for ${harness.name}.`,
            result.stderr || result.stdout || COMMAND_RESULT_EMPTY,
          ];
        }
        return [result.stdout || "Logout completed."];
      }
    case AGENT_MANAGEMENT_COMMAND.ABOUT:
      if (!harness) {
        return [HARNESS_MESSAGE.NO_ACTIVE_HARNESS];
      }
      if (!hasCapability(harness, AGENT_MANAGEMENT_CAPABILITY.ABOUT)) {
        return [unsupportedCapabilityMessage(harness, AGENT_MANAGEMENT_CAPABILITY.ABOUT)];
      }
      {
        const result = await runHarnessCommand(
          harness,
          resolveNativeCommandArgs(harness, AGENT_MANAGEMENT_COMMAND.ABOUT)
        );
        if (result.exitCode !== 0) {
          return [result.stderr || result.stdout || COMMAND_RESULT_EMPTY];
        }
        if (isCursorHarness(harness)) {
          return mapCursorAboutLines(result.stdout);
        }
        const aboutOutput = result.stdout || result.stderr;
        const version = parseAboutVersionForHarness(harness, aboutOutput);
        return formatAboutResult(
          {
            supported: true,
            version,
            message: !version ? aboutOutput || COMMAND_RESULT_EMPTY : undefined,
          },
          harness.name
        );
      }
    case AGENT_MANAGEMENT_COMMAND.STATUS:
      if (!harness) {
        return mapStatusLines(context);
      }
      if (!hasCapability(harness, AGENT_MANAGEMENT_CAPABILITY.STATUS)) {
        return [unsupportedCapabilityMessage(harness, AGENT_MANAGEMENT_CAPABILITY.STATUS)];
      }
      if (harness.id === HARNESS_ID.CLAUDE_CLI) {
        return mapClaudeStatusLines(harness);
      }
      if (harness.id === HARNESS_ID.GEMINI_CLI) {
        return resolveGeminiStatusLines(harness, runHarnessCommand);
      }
      {
        const result = await runHarnessCommand(
          harness,
          resolveNativeCommandArgs(harness, AGENT_MANAGEMENT_COMMAND.STATUS)
        );
        if (result.exitCode !== 0) {
          return mapStatusLines(context);
        }
        if (isCursorHarness(harness)) {
          return mapCursorStatusLines(result.stdout, result.stderr);
        }
        if (harness.id === HARNESS_ID.CODEX_CLI) {
          const parsed = parseCodexLoginStatusOutput(result.stdout, result.stderr);
          return formatStatusResult({
            supported: true,
            authenticated: parsed.authenticated,
            ...(parsed.email ? { email: parsed.email } : {}),
            message: parsed.message,
          });
        }
        return [result.stdout || result.stderr || "Status command produced no output."];
      }
    case AGENT_MANAGEMENT_COMMAND.MODELS:
      if (!harness) {
        const availableModels = context.session?.metadata?.availableModels ?? [];
        if (availableModels.length === 0) {
          return ["No models available for current session."];
        }
        return formatModelsResult(
          {
            supported: true,
            models: availableModels.map((model) => model.modelId),
            activeModel: context.session?.metadata?.model,
          },
          context.activeAgentName ?? "Current session"
        );
      }
      if (!hasCapability(harness, AGENT_MANAGEMENT_CAPABILITY.MODELS)) {
        return [
          unsupportedCapabilityMessage(harness, AGENT_MANAGEMENT_CAPABILITY.MODELS),
          HARNESS_MESSAGE.MODELS_USE_FLAG,
        ];
      }
      {
        const result = await runHarnessCommand(
          harness,
          resolveNativeCommandArgs(harness, AGENT_MANAGEMENT_COMMAND.MODELS)
        );
        if (result.exitCode !== 0) {
          return [result.stderr || "Failed to list models."];
        }
        if (isCursorHarness(harness)) {
          return mapCursorModelLines(result.stdout);
        }
        const parsedModels = result.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        return formatModelsResult(
          {
            supported: true,
            models: parsedModels,
            message: result.stdout ? undefined : "No models output.",
          },
          harness.name
        );
      }
    default:
      return ["Unsupported management command."];
  }
};

import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { MCP_MANAGEMENT_SUBCOMMAND } from "@/constants/mcp-management-subcommands";
import {
  parseStdoutWithCombinedFallback,
  toCommandFailureMessage,
} from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { Session } from "@/types/domain";

export const MCP_SERVER_STATUS = {
  ENABLED: "enabled",
  DISABLED: "disabled",
  CONFIGURED: "configured",
  UNKNOWN: "unknown",
} as const;

export type McpServerStatus = (typeof MCP_SERVER_STATUS)[keyof typeof MCP_SERVER_STATUS];

export interface McpServerListItem {
  id: string;
  status: McpServerStatus;
  enabled: boolean | null;
}

const TOOL_PREVIEW_LIMIT = 8;

const MCP_SERVER_LIST = {
  HEADER_ID: "id",
  HEADER_NAME: "name",
  HEADER_SERVER: "server",
  HEADER_STATUS: "status",
  LINE_PREFIX_PATTERN: /^(?:[-*•]\s*)?(?:\[\d+\]\s*)?/,
  STATUS_PATTERN: /^([A-Za-z0-9._:/-]+)(?:\s*[:|-]\s*|\s+)\(?([A-Za-z-]+)\)?(?:\s|$)/,
  NOISE_PATTERN:
    /^(?:\[(?:warn|warning|error|info|debug)[^\]]*\]\s*|(?:warning|warn|error|info|debug)\b[:\s-])/i,
  EXPLICIT_EMPTY_PATTERN: /\b(?:no\s+mcp\s+servers?|0\s+servers?|no\s+servers?\s+configured)\b/i,
} as const;

const MCP_STATUS_TOKEN = {
  ENABLED: "enabled",
  ACTIVE: "active",
  CONNECTED: "connected",
  DISABLED: "disabled",
  INACTIVE: "inactive",
  DISCONNECTED: "disconnected",
} as const;

const MCP_SERVER_LIST_COMMAND_FAILED = `Failed to run \`${AGENT_MANAGEMENT_COMMAND.MCP} ${MCP_MANAGEMENT_SUBCOMMAND.LIST}\`.`;
const MCP_SERVER_TOOLS_COMMAND_FAILED_PREFIX = `Failed to run \`${AGENT_MANAGEMENT_COMMAND.MCP} ${MCP_MANAGEMENT_SUBCOMMAND.LIST_TOOLS}\` for`;

const HEADER_TOKENS: readonly string[] = [
  MCP_SERVER_LIST.HEADER_ID,
  MCP_SERVER_LIST.HEADER_NAME,
  MCP_SERVER_LIST.HEADER_SERVER,
  MCP_SERVER_LIST.HEADER_STATUS,
];

const ENABLED_STATUS_TOKENS: readonly string[] = [
  MCP_STATUS_TOKEN.ENABLED,
  MCP_STATUS_TOKEN.ACTIVE,
  MCP_STATUS_TOKEN.CONNECTED,
];

const DISABLED_STATUS_TOKENS: readonly string[] = [
  MCP_STATUS_TOKEN.DISABLED,
  MCP_STATUS_TOKEN.INACTIVE,
  MCP_STATUS_TOKEN.DISCONNECTED,
];

const MCP_SERVER_STATUS_RANK: Record<McpServerStatus, number> = {
  [MCP_SERVER_STATUS.ENABLED]: 0,
  [MCP_SERVER_STATUS.CONFIGURED]: 1,
  [MCP_SERVER_STATUS.DISABLED]: 2,
  [MCP_SERVER_STATUS.UNKNOWN]: 3,
};

const toCanonicalStatus = (statusToken: string): McpServerStatus => {
  if (ENABLED_STATUS_TOKENS.includes(statusToken)) {
    return MCP_SERVER_STATUS.ENABLED;
  }
  if (DISABLED_STATUS_TOKENS.includes(statusToken)) {
    return MCP_SERVER_STATUS.DISABLED;
  }
  return MCP_SERVER_STATUS.UNKNOWN;
};

const toEnabled = (status: McpServerStatus): boolean | null => {
  if (status === MCP_SERVER_STATUS.ENABLED) {
    return true;
  }
  if (status === MCP_SERVER_STATUS.DISABLED) {
    return false;
  }
  return null;
};

const toNormalizedLine = (line: string): string => {
  return line.trim().replace(MCP_SERVER_LIST.LINE_PREFIX_PATTERN, "");
};

const toMcpServerFromLine = (line: string): McpServerListItem | null => {
  const normalizedLine = toNormalizedLine(line);
  if (normalizedLine.length === 0) {
    return null;
  }
  if (MCP_SERVER_LIST.EXPLICIT_EMPTY_PATTERN.test(normalizedLine)) {
    return null;
  }
  if (MCP_SERVER_LIST.NOISE_PATTERN.test(normalizedLine)) {
    return null;
  }

  const [firstToken] = normalizedLine.split(/\s+/, 1);
  const normalizedFirstToken = firstToken?.toLowerCase();
  if (!normalizedFirstToken || HEADER_TOKENS.includes(normalizedFirstToken)) {
    return null;
  }

  const statusMatch = normalizedLine.match(MCP_SERVER_LIST.STATUS_PATTERN);
  if (!statusMatch) {
    if (/\s/.test(normalizedLine)) {
      return null;
    }
    return {
      id: normalizedLine,
      status: MCP_SERVER_STATUS.UNKNOWN,
      enabled: null,
    };
  }

  const [, id = "", statusTokenRaw = ""] = statusMatch;
  const statusToken = statusTokenRaw.toLowerCase();
  const status = toCanonicalStatus(statusToken);

  return {
    id,
    status,
    enabled: toEnabled(status),
  };
};

const toUniqueMcpServers = (servers: McpServerListItem[]): McpServerListItem[] => {
  const mergedById = new Map<string, McpServerListItem>();
  for (const server of servers) {
    const existing = mergedById.get(server.id);
    if (!existing) {
      mergedById.set(server.id, server);
      continue;
    }
    const mergedStatus =
      existing.status === MCP_SERVER_STATUS.UNKNOWN ? server.status : existing.status;
    const mergedEnabled = existing.enabled === null ? server.enabled : existing.enabled;
    mergedById.set(server.id, {
      id: server.id,
      status: mergedStatus,
      enabled: mergedEnabled,
    });
  }
  return [...mergedById.values()];
};

export const sortMcpServersForDisplay = (
  servers: readonly McpServerListItem[]
): McpServerListItem[] => {
  return [...servers].sort((first, second) => {
    const rankDiff = MCP_SERVER_STATUS_RANK[first.status] - MCP_SERVER_STATUS_RANK[second.status];
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return first.id.localeCompare(second.id);
  });
};

export const toMcpServersFromSession = (session?: Session): McpServerListItem[] => {
  if (!session?.metadata?.mcpServers) {
    return [];
  }
  return sortMcpServersForDisplay(
    toUniqueMcpServers(
      session.metadata.mcpServers.map((server) => {
        return {
          id: server.name,
          status: MCP_SERVER_STATUS.CONFIGURED,
          enabled: null,
        };
      })
    )
  );
};

export const parseMcpServerListOutput = (output: string): McpServerListItem[] => {
  const lines = output.split("\n");
  const parsedServers: McpServerListItem[] = [];
  for (const line of lines) {
    const parsed = toMcpServerFromLine(line);
    if (parsed) {
      parsedServers.push(parsed);
    }
  }
  return sortMcpServersForDisplay(toUniqueMcpServers(parsedServers));
};

export const parseMcpServerListCommandResult = (
  result: AgentManagementCommandResult
): McpServerListItem[] => {
  if (result.exitCode !== 0) {
    throw new Error(toCommandFailureMessage(result, MCP_SERVER_LIST_COMMAND_FAILED));
  }
  const parsed = parseStdoutWithCombinedFallback({
    result,
    parse: parseMcpServerListOutput,
    shouldAcceptParsed: (servers) => servers.length > 0,
    shouldFallbackWhenStdoutPresent: (stdout, serversFromStdout) => {
      if (MCP_SERVER_LIST.EXPLICIT_EMPTY_PATTERN.test(stdout)) {
        return false;
      }
      return serversFromStdout.length === 0;
    },
  });
  if (parsed.length > 0) {
    return parsed;
  }
  if (
    MCP_SERVER_LIST.EXPLICIT_EMPTY_PATTERN.test(result.stdout) ||
    MCP_SERVER_LIST.EXPLICIT_EMPTY_PATTERN.test(result.stderr)
  ) {
    return [];
  }
  return parsed;
};

const MCP_SERVER_TOOLS = {
  NOISE_PATTERN: MCP_SERVER_LIST.NOISE_PATTERN,
  HEADER_PATTERN: /^tools?\s*:?$/i,
  EXPLICIT_EMPTY_PATTERN: /\b(?:no\s+tools?|0\s+tools?)\b/i,
  LINE_PREFIX_PATTERN: /^(?:[-*•]\s*)?(?:\[\d+\]\s*)?/,
} as const;

const toMcpToolNameFromLine = (line: string): string | null => {
  const normalizedLine = line.trim().replace(MCP_SERVER_TOOLS.LINE_PREFIX_PATTERN, "");
  if (normalizedLine.length === 0) {
    return null;
  }
  if (MCP_SERVER_TOOLS.NOISE_PATTERN.test(normalizedLine)) {
    return null;
  }
  if (MCP_SERVER_TOOLS.EXPLICIT_EMPTY_PATTERN.test(normalizedLine)) {
    return null;
  }
  if (MCP_SERVER_TOOLS.HEADER_PATTERN.test(normalizedLine)) {
    return null;
  }
  if (normalizedLine.includes(":")) {
    const [firstToken] = normalizedLine.split(":", 1);
    const candidate = firstToken?.trim();
    if (!candidate || candidate.includes(" ")) {
      return null;
    }
    return candidate;
  }
  const [token] = normalizedLine.split(/\s+/, 1);
  if (!token) {
    return null;
  }
  if (token.includes("=")) {
    return null;
  }
  return token;
};

const toUniqueMcpTools = (tools: string[]): string[] => {
  const unique = new Set<string>();
  for (const tool of tools) {
    unique.add(tool);
  }
  return [...unique];
};

export const parseMcpServerToolsOutput = (output: string): string[] => {
  const tools = output
    .split("\n")
    .map((line) => toMcpToolNameFromLine(line))
    .filter((tool): tool is string => Boolean(tool));
  return toUniqueMcpTools(tools);
};

export const parseMcpServerToolsCommandResult = (
  result: AgentManagementCommandResult,
  serverId: string
): string[] => {
  if (result.exitCode !== 0) {
    throw new Error(
      toCommandFailureMessage(result, `${MCP_SERVER_TOOLS_COMMAND_FAILED_PREFIX} ${serverId}.`)
    );
  }
  const parsed = parseStdoutWithCombinedFallback({
    result,
    parse: parseMcpServerToolsOutput,
    shouldAcceptParsed: (tools) => tools.length > 0,
    shouldFallbackWhenStdoutPresent: (stdout, toolsFromStdout) => {
      if (MCP_SERVER_TOOLS.EXPLICIT_EMPTY_PATTERN.test(stdout)) {
        return false;
      }
      return toolsFromStdout.length === 0;
    },
  });
  if (parsed.length > 0) {
    return parsed;
  }
  if (
    MCP_SERVER_TOOLS.EXPLICIT_EMPTY_PATTERN.test(result.stdout) ||
    MCP_SERVER_TOOLS.EXPLICIT_EMPTY_PATTERN.test(result.stderr)
  ) {
    return [];
  }
  return parsed;
};

export const formatMcpToolPreview = (tools: string[]): string => {
  if (tools.length === 0) {
    return "No tools available.";
  }
  const preview = tools.slice(0, TOOL_PREVIEW_LIMIT);
  const suffix = tools.length > preview.length ? ` … +${tools.length - preview.length} more` : "";
  return `${preview.join(", ")}${suffix}`;
};

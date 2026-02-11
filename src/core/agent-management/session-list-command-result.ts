import { parseSessionSummariesOutput } from "@/core/agent-management/cli-output-parser";
import {
  assertCommandSucceeded,
  toCombinedCommandOutput,
} from "@/core/agent-management/command-result-utils";
import {
  toAgentManagementSessions,
  toNormalizedAgentManagementSessions,
} from "@/core/agent-management/session-summary-mapper";
import type {
  AgentManagementCommandResult,
  AgentManagementSession,
} from "@/types/agent-management.types";
import type { CliAgentSession } from "@/types/cli-agent.types";

const SESSION_LIST_COMMAND_FAILURE_MESSAGE = "CLI session listing command failed.";

export const parseSessionListCommandResult = (
  result: AgentManagementCommandResult
): CliAgentSession[] => {
  assertCommandSucceeded(result, SESSION_LIST_COMMAND_FAILURE_MESSAGE);
  const parsedFromStdout = parseSessionSummariesOutput(result.stdout);
  if (parsedFromStdout.length > 0 || result.stdout.trim().length > 0) {
    return parsedFromStdout;
  }
  return parseSessionSummariesOutput(toCombinedCommandOutput(result));
};

export const parseAgentManagementSessionsFromCommandResult = (
  result: AgentManagementCommandResult
): AgentManagementSession[] => {
  return toAgentManagementSessions(parseSessionListCommandResult(result));
};

export const parseNormalizedAgentManagementSessionsFromCommandResult = (
  result: AgentManagementCommandResult
): AgentManagementSession[] => {
  return toNormalizedAgentManagementSessions(parseAgentManagementSessionsFromCommandResult(result));
};

import { SESSION_LIST_COMMAND_FAILED } from "@/constants/agent-management-error-messages";
import { parseSessionSummariesOutput } from "@/core/agent-management/cli-output-parser";
import {
  assertCommandSucceeded,
  parseStdoutWithCombinedFallback,
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
const NO_SESSIONS_PATTERN = /\bno\s+sessions?\b/i;

export const parseSessionListCommandResult = (
  result: AgentManagementCommandResult
): CliAgentSession[] => {
  assertCommandSucceeded(result, SESSION_LIST_COMMAND_FAILED);
  return parseStdoutWithCombinedFallback({
    result,
    parse: parseSessionSummariesOutput,
    shouldAcceptParsed: (parsed) => parsed.length > 0,
    shouldFallbackWhenStdoutPresent: (stdout) => !NO_SESSIONS_PATTERN.test(stdout),
  });
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

import { parseAuthStatusOutput } from "@/core/agent-management/cli-output-parser";
import {
  assertCommandSucceeded,
  toCombinedCommandOutput,
} from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentAuthStatus } from "@/types/cli-agent.types";

const AUTH_STATUS_COMMAND_FAILURE_MESSAGE = "CLI auth status command failed.";

export const parseAuthStatusCommandResult = (
  result: AgentManagementCommandResult
): CliAgentAuthStatus => {
  assertCommandSucceeded(result, AUTH_STATUS_COMMAND_FAILURE_MESSAGE);
  const parsedFromStdout = parseAuthStatusOutput(result.stdout);
  if (parsedFromStdout.authenticated || result.stdout.trim().length > 0) {
    return parsedFromStdout;
  }
  return parseAuthStatusOutput(toCombinedCommandOutput(result));
};

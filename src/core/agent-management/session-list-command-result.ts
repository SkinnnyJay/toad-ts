import { parseSessionSummariesOutput } from "@/core/agent-management/cli-output-parser";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentSession } from "@/types/cli-agent.types";

const SESSION_LIST_COMMAND_FAILURE_MESSAGE = "CLI session listing command failed.";

export const parseSessionListCommandResult = (
  result: AgentManagementCommandResult
): CliAgentSession[] => {
  if (result.exitCode !== 0) {
    const output = `${result.stderr}\n${result.stdout}`.trim();
    throw new Error(output.length > 0 ? output : SESSION_LIST_COMMAND_FAILURE_MESSAGE);
  }
  return parseSessionSummariesOutput(`${result.stdout}\n${result.stderr}`);
};

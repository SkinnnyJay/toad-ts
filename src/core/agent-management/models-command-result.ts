import { parseModelsOutput } from "@/core/agent-management/cli-output-parser";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentModelsResponse } from "@/types/cli-agent.types";

const MODELS_COMMAND_FAILURE_MESSAGE = "CLI models command failed.";

export const parseModelsCommandResult = (
  result: AgentManagementCommandResult
): CliAgentModelsResponse => {
  if (result.exitCode !== 0) {
    const output = `${result.stderr}\n${result.stdout}`.trim();
    throw new Error(output.length > 0 ? output : MODELS_COMMAND_FAILURE_MESSAGE);
  }
  return parseModelsOutput(result.stdout);
};

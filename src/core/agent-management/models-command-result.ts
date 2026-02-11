import { parseModelsOutput } from "@/core/agent-management/cli-output-parser";
import { assertCommandSucceeded } from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentModelsResponse } from "@/types/cli-agent.types";

const MODELS_COMMAND_FAILURE_MESSAGE = "CLI models command failed.";

export const parseModelsCommandResult = (
  result: AgentManagementCommandResult
): CliAgentModelsResponse => {
  assertCommandSucceeded(result, MODELS_COMMAND_FAILURE_MESSAGE);
  return parseModelsOutput(result.stdout);
};

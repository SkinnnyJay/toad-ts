import { parseModelsOutput } from "@/core/agent-management/cli-output-parser";
import {
  assertCommandSucceeded,
  toCombinedCommandOutput,
} from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentModelsResponse } from "@/types/cli-agent.types";

const MODELS_COMMAND_FAILURE_MESSAGE = "CLI models command failed.";

export const parseModelsCommandResult = (
  result: AgentManagementCommandResult
): CliAgentModelsResponse => {
  assertCommandSucceeded(result, MODELS_COMMAND_FAILURE_MESSAGE);
  const parsedFromStdout = parseModelsOutput(result.stdout);
  if (parsedFromStdout.models.length > 0) {
    return parsedFromStdout;
  }
  if (result.stdout.trim().length === 0) {
    return parseModelsOutput(toCombinedCommandOutput(result));
  }

  const parsedFromCombinedOutput = parseModelsOutput(toCombinedCommandOutput(result));
  return parsedFromCombinedOutput.models.length > 0 ? parsedFromCombinedOutput : parsedFromStdout;
};

import { parseModelsOutput } from "@/core/agent-management/cli-output-parser";
import {
  assertCommandSucceeded,
  parseStdoutWithCombinedFallback,
} from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentModelsResponse } from "@/types/cli-agent.types";

const MODELS_COMMAND_FAILURE_MESSAGE = "CLI models command failed.";

export const parseModelsCommandResult = (
  result: AgentManagementCommandResult
): CliAgentModelsResponse => {
  assertCommandSucceeded(result, MODELS_COMMAND_FAILURE_MESSAGE);
  return parseStdoutWithCombinedFallback({
    result,
    parse: parseModelsOutput,
    shouldAcceptParsed: (parsed) => parsed.models.length > 0,
  });
};

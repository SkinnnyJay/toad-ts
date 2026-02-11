import { MODELS_COMMAND_FAILED } from "@/constants/agent-management-error-messages";
import { parseModelsOutput } from "@/core/agent-management/cli-output-parser";
import {
  assertCommandSucceeded,
  parseStdoutWithCombinedFallback,
} from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentModelsResponse } from "@/types/cli-agent.types";

export const parseModelsCommandResult = (
  result: AgentManagementCommandResult
): CliAgentModelsResponse => {
  assertCommandSucceeded(result, MODELS_COMMAND_FAILED);
  return parseStdoutWithCombinedFallback({
    result,
    parse: parseModelsOutput,
    shouldAcceptParsed: (parsed) => parsed.models.length > 0,
  });
};

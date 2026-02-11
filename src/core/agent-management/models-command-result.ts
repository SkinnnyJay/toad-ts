import { MODELS_COMMAND_FAILED } from "@/constants/agent-management-error-messages";
import { parseModelsOutput } from "@/core/agent-management/cli-output-parser";
import {
  assertCommandSucceeded,
  parseStdoutWithCombinedFallback,
} from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentModelsResponse } from "@/types/cli-agent.types";

const NO_MODELS_PATTERN = /\b(?:no\s+models?|0\s+models?)\b/i;

export const parseModelsCommandResult = (
  result: AgentManagementCommandResult
): CliAgentModelsResponse => {
  assertCommandSucceeded(result, MODELS_COMMAND_FAILED);
  return parseStdoutWithCombinedFallback({
    result,
    parse: parseModelsOutput,
    shouldAcceptParsed: (parsed) => parsed.models.length > 0,
    shouldFallbackWhenStdoutPresent: (stdout) => !NO_MODELS_PATTERN.test(stdout),
  });
};

import { AUTH_STATUS_COMMAND_FAILED } from "@/constants/agent-management-error-messages";
import { parseAuthStatusOutput } from "@/core/agent-management/cli-output-parser";
import {
  assertCommandSucceeded,
  parseStdoutWithCombinedFallback,
} from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentAuthStatus } from "@/types/cli-agent.types";

const EXPLICIT_AUTH_STATUS_PATTERN =
  /\b(?:logged\s+in\s+as|authenticated\s+as|authenticated\b\s*[:=]\s*(?:true|false|yes|no|1|0)|(?:auth(?:entication)?\s+)?status\b\s*[:=]\s*(?:authenticated|unauthenticated|logged[\s_-]?in|logged[\s_-]?out)|not\s+logged\s+in|logged\s+out)\b|^(?:authenticated|unauthenticated|logged[\s_-]?in|logged[\s_-]?out)$/im;

export const parseAuthStatusCommandResult = (
  result: AgentManagementCommandResult
): CliAgentAuthStatus => {
  assertCommandSucceeded(result, AUTH_STATUS_COMMAND_FAILED);
  return parseStdoutWithCombinedFallback({
    result,
    parse: parseAuthStatusOutput,
    shouldAcceptParsed: (parsed) => parsed.authenticated,
    shouldFallbackWhenStdoutPresent: (stdout) => !EXPLICIT_AUTH_STATUS_PATTERN.test(stdout),
  });
};

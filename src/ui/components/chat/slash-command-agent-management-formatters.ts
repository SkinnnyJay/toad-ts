import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { toCommandFailureMessage } from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import { toErrorMessage } from "@/ui/utils/auth-error-matcher";

const PREVIEW_LINE_LIMIT = 8;

const buildOutputPreview = (stdout: string, stderr: string): string => {
  const combined = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, PREVIEW_LINE_LIMIT);
  return combined.join("\n");
};

export const buildAgentManagementCommandResultMessage = (
  title: string,
  result: AgentManagementCommandResult
): string => {
  const preview = buildOutputPreview(result.stdout, result.stderr);
  if (preview.length === 0) {
    return `${title}\n(exit ${result.exitCode})`;
  }
  return `${title}\n${preview}`;
};

export const buildAgentManagementCommandFailureMessage = (
  result: AgentManagementCommandResult
): string => {
  const fallbackMessage = `exit ${result.exitCode}`;
  const failureMessage = toCommandFailureMessage(result, fallbackMessage);
  if (failureMessage === fallbackMessage) {
    return `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} (exit ${result.exitCode})`;
  }
  return `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${buildOutputPreview(failureMessage, "")}`;
};

export const appendAgentManagementCommandRuntimeError = (
  appendSystemMessage: (text: string) => void,
  error: unknown
): void => {
  const details = toErrorMessage(error) ?? String(error);
  appendSystemMessage(`${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${details}`);
};

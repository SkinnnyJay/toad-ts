import type { AgentManagementCommandResult } from "@/types/agent-management.types";

export const toCombinedCommandOutput = (result: AgentManagementCommandResult): string => {
  return `${result.stdout}\n${result.stderr}`;
};

export const toCommandFailureMessage = (
  result: AgentManagementCommandResult,
  fallbackMessage: string
): string => {
  const output = toCombinedCommandOutput(result).trim();
  return output.length > 0 ? output : fallbackMessage;
};

export const assertCommandSucceeded = (
  result: AgentManagementCommandResult,
  fallbackMessage: string
): void => {
  if (result.exitCode !== 0) {
    throw new Error(toCommandFailureMessage(result, fallbackMessage));
  }
};

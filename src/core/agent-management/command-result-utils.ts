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

export interface ParseStdoutWithCombinedFallbackOptions<TParsed> {
  result: AgentManagementCommandResult;
  parse: (output: string) => TParsed;
  shouldAcceptParsed: (parsed: TParsed) => boolean;
  shouldFallbackWhenStdoutPresent?: (stdout: string, parsedFromStdout: TParsed) => boolean;
}

export const parseStdoutWithCombinedFallback = <TParsed>(
  options: ParseStdoutWithCombinedFallbackOptions<TParsed>
): TParsed => {
  const parsedFromStdout = options.parse(options.result.stdout);
  if (options.shouldAcceptParsed(parsedFromStdout)) {
    return parsedFromStdout;
  }

  const stdout = options.result.stdout;
  if (stdout.trim().length === 0) {
    return options.parse(toCombinedCommandOutput(options.result));
  }

  if (options.shouldFallbackWhenStdoutPresent) {
    const shouldFallback = options.shouldFallbackWhenStdoutPresent(stdout, parsedFromStdout);
    if (!shouldFallback) {
      return parsedFromStdout;
    }
  }

  const parsedFromCombinedOutput = options.parse(toCombinedCommandOutput(options.result));
  return options.shouldAcceptParsed(parsedFromCombinedOutput)
    ? parsedFromCombinedOutput
    : parsedFromStdout;
};

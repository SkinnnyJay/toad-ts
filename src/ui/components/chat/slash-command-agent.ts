import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { toCommandFailureMessage } from "@/core/agent-management/command-result-utils";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { SlashCommandDeps } from "./slash-command-runner";
import { appendStatusAuthGuidance, isStatusAuthFailureResult } from "./slash-command-status-auth";

const buildAgentCommandFailureMessage = (result: AgentManagementCommandResult): string => {
  const fallbackMessage = `exit ${result.exitCode}`;
  const failureMessage = toCommandFailureMessage(result, fallbackMessage);
  if (failureMessage === fallbackMessage) {
    return `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} (exit ${result.exitCode})`;
  }
  return `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${failureMessage}`;
};

const appendAgentCommandRuntimeError = (deps: SlashCommandDeps, error: unknown): void =>
  deps.appendSystemMessage(
    `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${
      error instanceof Error ? error.message : String(error)
    }`
  );

export const handleAgentCommand = (parts: string[], deps: SlashCommandDeps): void => {
  if (!deps.runAgentCommand) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.AGENT_COMMAND_NOT_AVAILABLE);
    return;
  }
  const args = parts.slice(1);
  if (args.length === 0) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.AGENT_COMMAND_USAGE);
    return;
  }
  void deps
    .runAgentCommand(args)
    .then((result) => {
      if (result.exitCode !== 0) {
        if (isStatusAuthFailureResult(result)) {
          appendStatusAuthGuidance(deps);
          return;
        }
        deps.appendSystemMessage(buildAgentCommandFailureMessage(result));
        return;
      }
      deps.appendSystemMessage(
        `Agent command result:\n${result.stdout || result.stderr || "(exit 0)"}`
      );
    })
    .catch((error) => appendAgentCommandRuntimeError(deps, error));
};

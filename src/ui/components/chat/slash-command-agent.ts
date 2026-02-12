import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import {
  appendAgentManagementCommandRuntimeError,
  buildAgentManagementCommandFailureMessage,
  buildAgentManagementCommandResultMessage,
} from "./slash-command-agent-management-formatters";
import type { SlashCommandDeps } from "./slash-command-runner";
import { appendStatusAuthGuidance, isStatusAuthFailureResult } from "./slash-command-status-auth";

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
        deps.appendSystemMessage(buildAgentManagementCommandFailureMessage(result));
        return;
      }
      deps.appendSystemMessage(
        buildAgentManagementCommandResultMessage("Agent command result:", result)
      );
    })
    .catch((error) => appendAgentManagementCommandRuntimeError(deps.appendSystemMessage, error));
};

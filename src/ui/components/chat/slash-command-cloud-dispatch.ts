import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { resolveCloudCommandErrorMessage } from "./slash-command-cloud-utils";
import type { SlashCommandDeps } from "./slash-command-runner";

const toOptionalTrimmed = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

export const handleCloudDispatchSubcommand = (parts: string[], deps: SlashCommandDeps): void => {
  const prompt = parts.slice(2).join(" ").trim();
  if (!prompt) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.CLOUD_USAGE);
    return;
  }
  if (!deps.launchCloudAgentItem) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.CLOUD_DISPATCH_NOT_AVAILABLE);
    return;
  }

  const model = deps.sessionId
    ? toOptionalTrimmed(deps.getSession(deps.sessionId)?.metadata?.model)
    : undefined;
  const repository = toOptionalTrimmed(deps.cloudDispatchContext?.repository);
  const branch = toOptionalTrimmed(deps.cloudDispatchContext?.branch);
  const contextDetails = repository ? `${repository}${branch ? ` @ ${branch}` : ""}` : branch;

  deps.appendSystemMessage("Dispatching cloud prompt…");
  void deps
    .launchCloudAgentItem({
      prompt,
      ...(model ? { model } : {}),
      ...(repository ? { repository } : {}),
      ...(branch ? { branch } : {}),
    })
    .then((agent) => {
      deps.appendSystemMessage(
        `Cloud agent started: ${agent.id} (${agent.status}).${contextDetails ? ` [${contextDetails}]` : ""}`
      );
    })
    .catch((error) => {
      deps.appendSystemMessage(resolveCloudCommandErrorMessage(error, "Cloud dispatch failed"));
    });
};

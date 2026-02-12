import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { toErrorMessage } from "@/ui/utils/auth-error-matcher";
import { isCloudAuthError } from "@/ui/utils/cloud-auth-errors";

export const resolveCloudCommandErrorMessage = (error: unknown, fallbackPrefix: string): string => {
  if (isCloudAuthError(error)) {
    return SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED;
  }
  const details = toErrorMessage(error) ?? String(error);
  return `${fallbackPrefix}: ${details}`;
};

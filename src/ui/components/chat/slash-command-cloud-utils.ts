import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import { isCloudAuthError } from "@/ui/utils/cloud-auth-errors";

export const resolveCloudCommandErrorMessage = (error: unknown, fallbackPrefix: string): string => {
  if (isCloudAuthError(error)) {
    return SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED;
  }
  const details = error instanceof Error ? error.message : String(error);
  return `${fallbackPrefix}: ${details}`;
};

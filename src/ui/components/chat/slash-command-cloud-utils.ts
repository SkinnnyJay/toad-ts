import { ENV_KEY } from "@/constants/env-keys";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";

const CLOUD_AUTH_ERROR_PATTERN = /(unauthorized|forbidden|authentication|status 401|status 403)/i;

export const resolveCloudCommandErrorMessage = (error: unknown, fallbackPrefix: string): string => {
  if (error instanceof Error && error.message.includes(ENV_KEY.CURSOR_API_KEY)) {
    return SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED;
  }
  if (error instanceof Error && CLOUD_AUTH_ERROR_PATTERN.test(error.message)) {
    return SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED;
  }
  const details = error instanceof Error ? error.message : String(error);
  return `${fallbackPrefix}: ${details}`;
};

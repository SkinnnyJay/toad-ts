import { CURSOR_AUTH_GUIDANCE } from "@/constants/cursor-auth-guidance";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import type { SlashCommandDeps } from "./slash-command-runner";

const STATUS_AUTH_KEY = "authenticated";
const STATUS_AUTH_YES = "yes";
const STATUS_AUTH_NO = "no";

export const toStatusAuthState = (keyValues: Record<string, string>): boolean | undefined => {
  const statusValue = Object.entries(keyValues).find(
    ([key]) => key.trim().toLowerCase() === STATUS_AUTH_KEY
  )?.[1];
  if (!statusValue) {
    return undefined;
  }
  const normalized = statusValue.trim().toLowerCase();
  if (normalized === STATUS_AUTH_YES) {
    return true;
  }
  if (normalized === STATUS_AUTH_NO) {
    return false;
  }
  return undefined;
};

export const appendStatusAuthGuidance = (deps: SlashCommandDeps): void => {
  if (deps.activeHarnessId === HARNESS_DEFAULT.CURSOR_CLI_ID) {
    deps.appendSystemMessage(CURSOR_AUTH_GUIDANCE.LOGIN_REQUIRED);
    return;
  }
  if (deps.activeHarnessId === HARNESS_DEFAULT.GEMINI_CLI_ID) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.GEMINI_LOGIN_HINT);
    return;
  }
  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.AUTH_REQUIRED_LOGIN_HINT);
};

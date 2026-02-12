import { ENV_KEY } from "@/constants/env-keys";

const AUTH_FAILURE_PATTERN =
  /(not authenticated|unauthorized|forbidden|status 401|status 403|authentication required|login required|requires.+login)/i;
const AUTHENTICATION_TERM_PATTERN = /\bauthentication\b/i;

interface AuthFailureMatchOptions {
  includeGenericAuthenticationTerm?: boolean;
  includeCursorApiKeyHint?: boolean;
}

export const isAuthFailureMessage = (
  message: string,
  options: AuthFailureMatchOptions = {}
): boolean => {
  if (AUTH_FAILURE_PATTERN.test(message)) {
    return true;
  }
  if (options.includeGenericAuthenticationTerm && AUTHENTICATION_TERM_PATTERN.test(message)) {
    return true;
  }
  if (options.includeCursorApiKeyHint && message.includes(ENV_KEY.CURSOR_API_KEY)) {
    return true;
  }
  return false;
};

import { ENV_KEY } from "@/constants/env-keys";

const AUTH_FAILURE_PATTERN =
  /(not authenticated|unauthorized|forbidden|status 401|status 403|authentication required|login required|requires.+login)/i;
const AUTHENTICATION_TERM_PATTERN = /\bauthentication\b/i;

interface AuthFailureMatchOptions {
  includeGenericAuthenticationTerm?: boolean;
  includeCursorApiKeyHint?: boolean;
}

const hasMessageString = (value: unknown): value is { message: string } => {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  );
};

export const toErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (hasMessageString(error)) {
    return error.message;
  }
  return undefined;
};

export const hasCursorApiKeyHint = (message: string): boolean =>
  message.includes(ENV_KEY.CURSOR_API_KEY);

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
  if (options.includeCursorApiKeyHint && hasCursorApiKeyHint(message)) {
    return true;
  }
  return false;
};

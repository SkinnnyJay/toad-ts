import { isAuthFailureMessage, toErrorMessage } from "@/ui/utils/auth-error-matcher";

export const isCloudAuthError = (error: unknown): boolean => {
  const message = toErrorMessage(error);
  if (!message) {
    return false;
  }
  return isAuthFailureMessage(message, {
    includeGenericAuthenticationTerm: true,
    includeCursorApiKeyHint: true,
  });
};

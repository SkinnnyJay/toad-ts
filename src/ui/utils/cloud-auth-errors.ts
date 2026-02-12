import { isAuthFailureMessage } from "@/ui/utils/auth-error-matcher";

export const isCloudAuthError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return isAuthFailureMessage(error.message, {
    includeGenericAuthenticationTerm: true,
    includeCursorApiKeyHint: true,
  });
};

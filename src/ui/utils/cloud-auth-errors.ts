import { ENV_KEY } from "@/constants/env-keys";

const CLOUD_AUTH_ERROR_PATTERN = /(unauthorized|forbidden|authentication|status 401|status 403)/i;

export const isCloudAuthError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes(ENV_KEY.CURSOR_API_KEY) || CLOUD_AUTH_ERROR_PATTERN.test(error.message)
  );
};

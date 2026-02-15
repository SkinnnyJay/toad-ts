import { LIMIT } from "@/config/limits";

const PROVIDER_ERROR = {
  ELLIPSIS: "…",
  FALLBACK_PAYLOAD: "no error payload",
} as const;

export const truncateProviderFailurePayload = (payload: string): string => {
  const normalized = payload.trim();
  if (normalized.length === 0) {
    return PROVIDER_ERROR.FALLBACK_PAYLOAD;
  }
  if (normalized.length <= LIMIT.PROVIDER_FAILURE_PAYLOAD_MAX_CHARS) {
    return normalized;
  }
  const sliceLength = Math.max(0, LIMIT.PROVIDER_FAILURE_PAYLOAD_MAX_CHARS - 1);
  return `${normalized.slice(0, sliceLength)}${PROVIDER_ERROR.ELLIPSIS}`;
};

export const formatProviderHttpError = (
  providerName: string,
  status: number,
  payload: string
): string => `${providerName} API error ${status}: ${truncateProviderFailurePayload(payload)}`;

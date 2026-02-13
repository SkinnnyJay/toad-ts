import { LIMIT } from "@/config/limits";

export const UPDATE_CHECK = {
  REGISTRY_BASE_URL: "https://registry.npmjs.org",
  CHECK_INTERVAL_MS: LIMIT.UPDATE_CHECK_INTERVAL_MS,
  FETCH_TIMEOUT_MS: LIMIT.UPDATE_CHECK_FETCH_TIMEOUT_MS,
} as const;

export type UpdateCheck = typeof UPDATE_CHECK;

export const { REGISTRY_BASE_URL, CHECK_INTERVAL_MS, FETCH_TIMEOUT_MS } = UPDATE_CHECK;

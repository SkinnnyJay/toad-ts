export const UPDATE_CHECK = {
  REGISTRY_BASE_URL: "https://registry.npmjs.org",
  CHECK_INTERVAL_MS: 24 * 60 * 60 * 1000,
  FETCH_TIMEOUT_MS: 4000,
} as const;

export type UpdateCheck = typeof UPDATE_CHECK;

export const { REGISTRY_BASE_URL, CHECK_INTERVAL_MS, FETCH_TIMEOUT_MS } = UPDATE_CHECK;

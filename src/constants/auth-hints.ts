export const TOKEN_HINTS = ["token", "api", "key", "secret"] as const;

export type TokenHint = (typeof TOKEN_HINTS)[number];

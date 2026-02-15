export const NUTJS_CAPABILITY = {
  SUPPORTED: "supported",
  UNSUPPORTED_PLATFORM: "unsupported_platform",
  MISSING_RUNTIME: "missing_runtime",
} as const;

export type NutJsCapabilityStatus = (typeof NUTJS_CAPABILITY)[keyof typeof NUTJS_CAPABILITY];

export const { SUPPORTED, UNSUPPORTED_PLATFORM, MISSING_RUNTIME } = NUTJS_CAPABILITY;

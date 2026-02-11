/**
 * Node.js process.platform values. Use instead of raw strings for platform checks.
 */
export const PLATFORM = {
  DARWIN: "darwin",
  WIN32: "win32",
  LINUX: "linux",
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

export const { DARWIN, WIN32, LINUX } = PLATFORM;

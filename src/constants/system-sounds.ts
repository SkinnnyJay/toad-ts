/**
 * Paths to system-provided sounds. Used for completion/notification feedback.
 */
export const SYSTEM_SOUND = {
  /** macOS built-in Frog alert sound (afplay). */
  MACOS_FROG: "/System/Library/Sounds/Frog.aiff",
} as const;

export type SystemSound = (typeof SYSTEM_SOUND)[keyof typeof SYSTEM_SOUND];

export const { MACOS_FROG } = SYSTEM_SOUND;

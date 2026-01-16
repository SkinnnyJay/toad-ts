export const KEYBOARD_INPUT = {
  YES_LOWER: "y",
  YES_UPPER: "Y",
  NO_LOWER: "n",
  NO_UPPER: "N",
  APPROVE_LOWER: "a",
  APPROVE_UPPER: "A",
  DENY_LOWER: "d",
  DENY_UPPER: "D",
  SKIP_LOWER: "s",
  SKIP_UPPER: "S",
} as const;

export type KeyboardInput = (typeof KEYBOARD_INPUT)[keyof typeof KEYBOARD_INPUT];

// Re-export for convenience
export const {
  YES_LOWER,
  YES_UPPER,
  NO_LOWER,
  NO_UPPER,
  APPROVE_LOWER,
  APPROVE_UPPER,
  DENY_LOWER,
  DENY_UPPER,
  SKIP_LOWER,
  SKIP_UPPER,
} = KEYBOARD_INPUT;

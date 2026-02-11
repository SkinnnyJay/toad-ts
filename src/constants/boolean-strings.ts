/**
 * String values treated as truthy in environment variables (e.g. FORCE_TTY).
 */
export const BOOLEAN_STRINGS = {
  ONE: "1",
  TRUE: "true",
  YES: "yes",
  ON: "on",
} as const;

export type BooleanString = (typeof BOOLEAN_STRINGS)[keyof typeof BOOLEAN_STRINGS];

/** Set of truthy strings for fast lookup. */
export const TRUTHY_STRINGS = new Set<string>([
  BOOLEAN_STRINGS.ONE,
  BOOLEAN_STRINGS.TRUE,
  BOOLEAN_STRINGS.YES,
  BOOLEAN_STRINGS.ON,
]);

export const { ONE, TRUE, YES, ON } = BOOLEAN_STRINGS;

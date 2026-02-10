export const THEME = {
  DEFAULT: "default",
  MIDNIGHT: "midnight",
  SUNRISE: "sunrise",
  HIGH_CONTRAST: "high-contrast",
} as const;

export type ThemeName = (typeof THEME)[keyof typeof THEME];

export const { DEFAULT, MIDNIGHT, SUNRISE, HIGH_CONTRAST } = THEME;

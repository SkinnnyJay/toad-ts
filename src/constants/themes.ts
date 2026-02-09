export const THEME = {
  DEFAULT: "default",
  MIDNIGHT: "midnight",
  SUNRISE: "sunrise",
} as const;

export type ThemeName = (typeof THEME)[keyof typeof THEME];

export const { DEFAULT, MIDNIGHT, SUNRISE } = THEME;

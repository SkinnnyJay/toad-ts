import { COLOR } from "@/constants/colors";
import { THEME, type ThemeName } from "@/constants/themes";

export type ThemeColors = Record<keyof typeof COLOR, string>;

export interface ThemeDefinition {
  id: ThemeName;
  label: string;
  description: string;
  colors: ThemeColors;
}

const DEFAULT_COLORS: ThemeColors = { ...COLOR };

const MIDNIGHT_COLORS: ThemeColors = {
  ...DEFAULT_COLORS,
  BLUE: "#4EA3FF",
  CYAN: "#39D0E0",
  MAGENTA: "#C792EA",
  ASSISTANT: "#7FDBB6",
  CODE_BG: "#1E293B",
  DIM: "#64748B",
  BORDER: "#334155",
  DIFF_ADDED_BG: "#0F2E25",
  DIFF_REMOVED_BG: "#3A1E1E",
  DIFF_HUNK_BG: "#1C2C3E",
};

const SUNRISE_COLORS: ThemeColors = {
  ...DEFAULT_COLORS,
  GREEN: "#3BB273",
  RED: "#F97362",
  YELLOW: "#F6C453",
  BLUE: "#F59E0B",
  CYAN: "#F59E0B",
  MAGENTA: "#C084FC",
  ASSISTANT: "#FDBA74",
  CODE_BG: "#3B2F2A",
  WARNING: "#F59E0B",
  DIM: "#A16207",
  BORDER: "#854D0E",
  DIFF_ADDED_BG: "#1E3A2E",
  DIFF_REMOVED_BG: "#42241E",
  DIFF_HUNK_BG: "#3B2F2A",
};

export const THEME_DEFINITIONS: Record<ThemeName, ThemeDefinition> = {
  [THEME.DEFAULT]: {
    id: THEME.DEFAULT,
    label: "Default",
    description: "Balanced colors with subtle highlights.",
    colors: DEFAULT_COLORS,
  },
  [THEME.MIDNIGHT]: {
    id: THEME.MIDNIGHT,
    label: "Midnight",
    description: "Cool blues with darker panel surfaces.",
    colors: MIDNIGHT_COLORS,
  },
  [THEME.SUNRISE]: {
    id: THEME.SUNRISE,
    label: "Sunrise",
    description: "Warm accents with amber highlights.",
    colors: SUNRISE_COLORS,
  },
};

export const THEME_ORDER: ThemeName[] = [THEME.DEFAULT, THEME.MIDNIGHT, THEME.SUNRISE];

export const getThemeDefinition = (theme: ThemeName): ThemeDefinition => {
  return THEME_DEFINITIONS[theme];
};

export const applyThemeColors = (theme: ThemeName): ThemeDefinition => {
  const definition = getThemeDefinition(theme);
  Object.assign(COLOR, definition.colors);
  return definition;
};

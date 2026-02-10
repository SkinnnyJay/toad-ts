import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("ThemeLoader");

export interface ThemeColors {
  background: string;
  foreground: string;
  user: string;
  assistant: string;
  system: string;
  error: string;
  success: string;
  warning: string;
  border: string;
  dim: string;
}

export interface ThemeDefinition {
  name: string;
  colors: ThemeColors;
  diff?: {
    addedBg?: string;
    removedBg?: string;
    hunkBg?: string;
  };
}

export const BUILTIN_THEMES: Record<string, ThemeDefinition> = {
  dark: {
    name: "Dark (Default)",
    colors: {
      background: "#0D1117",
      foreground: "#E6EDF3",
      user: "#58A6FF",
      assistant: "#A78BFA",
      system: "#F59E0B",
      error: "#FF4444",
      success: "#50FA7B",
      warning: "#FFB86C",
      border: "#30363D",
      dim: "#8B949E",
    },
    diff: { addedBg: "#1a3d1a", removedBg: "#3d1a1a", hunkBg: "#1a2a3a" },
  },
  light: {
    name: "Light",
    colors: {
      background: "#FFFFFF",
      foreground: "#24292F",
      user: "#0969DA",
      assistant: "#8250DF",
      system: "#BF8700",
      error: "#CF222E",
      success: "#1A7F37",
      warning: "#9A6700",
      border: "#D0D7DE",
      dim: "#6E7781",
    },
    diff: { addedBg: "#DAFBE1", removedBg: "#FFEBE9", hunkBg: "#DDF4FF" },
  },
  dracula: {
    name: "Dracula",
    colors: {
      background: "#282A36",
      foreground: "#F8F8F2",
      user: "#8BE9FD",
      assistant: "#BD93F9",
      system: "#F1FA8C",
      error: "#FF5555",
      success: "#50FA7B",
      warning: "#FFB86C",
      border: "#6272A4",
      dim: "#6272A4",
    },
    diff: { addedBg: "#1a3d1a", removedBg: "#3d1a1a", hunkBg: "#1a2a3a" },
  },
  monokai: {
    name: "Monokai",
    colors: {
      background: "#272822",
      foreground: "#F8F8F2",
      user: "#66D9EF",
      assistant: "#AE81FF",
      system: "#E6DB74",
      error: "#F92672",
      success: "#A6E22E",
      warning: "#FD971F",
      border: "#49483E",
      dim: "#75715E",
    },
  },
  "solarized-dark": {
    name: "Solarized Dark",
    colors: {
      background: "#002B36",
      foreground: "#839496",
      user: "#268BD2",
      assistant: "#6C71C4",
      system: "#B58900",
      error: "#DC322F",
      success: "#859900",
      warning: "#CB4B16",
      border: "#073642",
      dim: "#586E75",
    },
  },
  nord: {
    name: "Nord",
    colors: {
      background: "#2E3440",
      foreground: "#D8DEE9",
      user: "#88C0D0",
      assistant: "#B48EAD",
      system: "#EBCB8B",
      error: "#BF616A",
      success: "#A3BE8C",
      warning: "#D08770",
      border: "#3B4252",
      dim: "#4C566A",
    },
  },
};

/**
 * Load custom themes from user's theme directories.
 * Scans ~/.config/toadstool/themes/ and .toadstool/themes/ for JSON theme files.
 */
export const loadCustomThemes = async (cwd: string): Promise<ThemeDefinition[]> => {
  const themeDirs = [
    join(cwd, ".toadstool", "themes"),
    join(homedir(), ".config", "toadstool", "themes"),
  ];

  const themes: ThemeDefinition[] = [];

  for (const dir of themeDirs) {
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        const ext = extname(entry);
        if (ext !== ".json") continue;
        const filePath = join(dir, entry);
        try {
          const content = await readFile(filePath, ENCODING.UTF8);
          const parsed = JSON.parse(content) as ThemeDefinition;
          if (parsed.name && parsed.colors) {
            themes.push(parsed);
          }
        } catch {
          // Skip invalid theme files
        }
      }
    } catch {
      // Skip non-existent directories
    }
  }

  logger.info("Loaded custom themes", { count: themes.length });
  return themes;
};

/**
 * Get all available themes (built-in + custom).
 */
export const getAllThemes = async (cwd: string): Promise<ThemeDefinition[]> => {
  const builtIn = Object.values(BUILTIN_THEMES);
  const custom = await loadCustomThemes(cwd);
  return [...builtIn, ...custom];
};

/**
 * Resolve a theme by name. Checks built-in themes first, then custom.
 */
export const resolveTheme = async (name: string, cwd: string): Promise<ThemeDefinition | null> => {
  const builtIn = BUILTIN_THEMES[name.toLowerCase()];
  if (builtIn) return builtIn;

  const custom = await loadCustomThemes(cwd);
  return custom.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? null;
};

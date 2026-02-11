import type { Color } from "@/constants/colors";
import { COLOR } from "@/constants/colors";

/**
 * Semantic colors for TUI elements so commands, skills, rules, and categories
 * are visually distinct and easy to scan.
 */
export const SEMANTIC_COLOR = {
  /** Slash command name (e.g. /help, /skills) */
  COMMAND: COLOR.CYAN,
  /** Discovered skill or command item name */
  SKILL_NAME: COLOR.GREEN,
  /** Rule label or type (e.g. always, auto_attached) */
  RULE: COLOR.MAGENTA,
  /** Category badge (e.g. session, discovery, settings) */
  CATEGORY: COLOR.MAGENTA,
  /** Optional arguments (e.g. <path>, <filename>) */
  ARGS: COLOR.YELLOW,
  /** Description or help text */
  DESCRIPTION: COLOR.DIM,
  /** Section header (e.g. "Commands:", "Files:") */
  SECTION_HEADER: COLOR.CYAN,
  /** Hint / keyboard shortcut text */
  HINT: COLOR.GRAY,
  /** Selected row highlight */
  SELECTED: COLOR.YELLOW,
  /** File / path in suggestions */
  FILE: COLOR.GREEN,
  /** Folder / directory in suggestions */
  FOLDER: COLOR.CYAN,
} as const;

export type SemanticColorKey = keyof typeof SEMANTIC_COLOR;

export const getCategoryColor = (category: string | undefined): Color => {
  if (!category) return COLOR.GRAY;
  const palette: Record<string, Color> = {
    session: COLOR.CYAN,
    discovery: COLOR.GREEN,
    agents: COLOR.MAGENTA,
    settings: COLOR.YELLOW,
    context: COLOR.BLUE,
    provider: COLOR.BLUE,
    diagnostics: COLOR.WARNING,
    display: COLOR.CYAN,
    input: COLOR.GREEN,
    help: COLOR.GREEN,
    tools: COLOR.MAGENTA,
  };
  return palette[category] ?? SEMANTIC_COLOR.CATEGORY;
};

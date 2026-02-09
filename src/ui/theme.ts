import { MESSAGE_ROLE } from "@/constants/message-roles";

import { COLOR } from "@/constants/colors";

export const palette = {
  background: COLOR.BLACK,
  text: COLOR.WHITE,
  dim: COLOR.DIM,
  user: COLOR.BLUE,
  assistant: COLOR.ASSISTANT,
  system: COLOR.YELLOW,
  codeBg: COLOR.CODE_BG,
  border: COLOR.BORDER,
  error: COLOR.RED,
  success: COLOR.GREEN,
  warning: COLOR.WARNING,
};

/**
 * Diff color scheme - configurable template variables for diff rendering.
 * All diff-related colors are centralized here for easy customization.
 */
export const diffColors = {
  // Line foreground colors
  /** Color for added lines (green) */
  added: COLOR.GREEN,
  /** Color for removed lines (red) */
  removed: COLOR.RED,
  /** Color for unchanged context lines (dim gray) */
  context: COLOR.DIM,

  // Line background colors (subtle tints for highlighting)
  /** Background tint for added lines (dark green) */
  addedBg: "#1a3d1a",
  /** Background tint for removed lines (dark red) */
  removedBg: "#3d1a1a",
  /** Background for unchanged lines (none) */
  contextBg: undefined as string | undefined,

  // UI element colors
  /** Color for line numbers */
  lineNumber: COLOR.DIM,
  /** Color for file header text */
  header: COLOR.CYAN,
  /** Background for file header */
  headerBg: COLOR.CODE_BG,
  /** Border color for diff box */
  border: COLOR.BORDER,

  // Hunk separator colors
  /** Color for hunk header text (@@ -1,3 +1,4 @@) */
  hunkHeader: COLOR.CYAN,
  /** Background for hunk header */
  hunkHeaderBg: "#1a2a3a",
};

export type DiffColors = typeof diffColors;

export const roleColor = (role: string): string => {
  switch (role) {
    case MESSAGE_ROLE.USER:
      return palette.user;
    case MESSAGE_ROLE.ASSISTANT:
      return palette.assistant;
    case MESSAGE_ROLE.SYSTEM:
      return palette.system;
    default:
      return palette.text;
  }
};

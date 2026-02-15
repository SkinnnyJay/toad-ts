export const COMMAND_PALETTE_ROW_TYPE = {
  SECTION_HEADER: "section-header",
  COMMAND: "command",
} as const;

export type CommandPaletteRowType =
  (typeof COMMAND_PALETTE_ROW_TYPE)[keyof typeof COMMAND_PALETTE_ROW_TYPE];

export const { SECTION_HEADER, COMMAND } = COMMAND_PALETTE_ROW_TYPE;

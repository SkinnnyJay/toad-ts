export const UI = {
  HORIZONTAL_RULE_SHORT: 40,
  HORIZONTAL_RULE_LONG: 50,
  TERMINAL_DEFAULT_ROWS: 24,
  TERMINAL_DEFAULT_COLUMNS: 80,
  VISIBLE_RESULT_LINES: 80,
  SIDEBAR_WIDTH_RATIO: 0.18,
  SIDEBAR_FILES_RATIO: 0.55,
  SIDEBAR_TASKS_RATIO: 0.25,
  SIDEBAR_PADDING: 2,
  SIDEBAR_TAB_COLUMN_WIDTH: 10,
  /** Preferred font size (px) for sidebar tab labels when runtime supports it; terminal uses host font. */
  SIDEBAR_TAB_FONT_SIZE_PX: 9,
  SCROLLBAR_WIDTH: 1,
  MODAL_HEIGHT: 20,
  MODAL_WIDTH: "80%",
  POPUP_HEIGHT: 20,
  POPUP_WIDTH: "80%",
  /** Preferred width for the floating command palette modal. */
  COMMAND_PALETTE_WIDTH: "80%",
  /** Max height (rows) of command palette modal (clamped to viewport). */
  COMMAND_PALETTE_MAX_HEIGHT: 12,
  /** Min rows to leave at top and bottom of terminal so modal never overflows. */
  COMMAND_PALETTE_VIEWPORT_MARGIN: 2,
  /** Fixed height above list (top+bottom border). */
  COMMAND_PALETTE_HEADER_ROWS: 2,
  /** Number of visible rows in the scroll viewport (rest scrolls). */
  COMMAND_PALETTE_LIST_ROWS: 10,
  /** Margin (rows) above and below command palette when centered. */
  COMMAND_PALETTE_MARGIN_ROWS: 1,
  /** Estimated fixed rows consumed by Chat chrome (header + footer + status + margins). */
  CHAT_CHROME_ROWS: 15,
  PROGRESS_BAR_WIDTH: 40,
  /** Logo ASCII art display scale (1 = full size). 0.75 = 25% smaller. */
  LOGO_DISPLAY_SCALE: 0.75,
  ICON_SIZE_SM: 16,
  ICON_SIZE_LG: 24,
  DIFF_COLUMN_WIDTH: "50%",
  FULL_WIDTH_STYLE: { width: "100%" } as const,
  PROGRESS: {
    INITIAL: 10,
    HARNESS_LOADING: 30,
    CONFIG_LOADING: 35,
    CONFIG_LOADED: 45,
    CONNECTION_START: 60,
    CONNECTION_ESTABLISHED: 75,
    SESSION_READY: 85,
    COMPLETE: 100,
  } as const,
} as const;

// Re-export for convenience
export const {
  HORIZONTAL_RULE_SHORT,
  HORIZONTAL_RULE_LONG,
  TERMINAL_DEFAULT_ROWS,
  TERMINAL_DEFAULT_COLUMNS,
  VISIBLE_RESULT_LINES,
  SIDEBAR_WIDTH_RATIO,
  SIDEBAR_FILES_RATIO,
  SIDEBAR_TASKS_RATIO,
  SIDEBAR_PADDING,
  SIDEBAR_TAB_COLUMN_WIDTH,
  SIDEBAR_TAB_FONT_SIZE_PX,
  SCROLLBAR_WIDTH,
  MODAL_HEIGHT,
  MODAL_WIDTH,
  POPUP_HEIGHT,
  POPUP_WIDTH,
  COMMAND_PALETTE_WIDTH,
  COMMAND_PALETTE_MAX_HEIGHT,
  COMMAND_PALETTE_VIEWPORT_MARGIN,
  COMMAND_PALETTE_HEADER_ROWS,
  COMMAND_PALETTE_LIST_ROWS,
  COMMAND_PALETTE_MARGIN_ROWS,
  CHAT_CHROME_ROWS,
  PROGRESS_BAR_WIDTH,
  LOGO_DISPLAY_SCALE,
  ICON_SIZE_SM,
  ICON_SIZE_LG,
  DIFF_COLUMN_WIDTH,
  FULL_WIDTH_STYLE,
  PROGRESS,
} = UI;

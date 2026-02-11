import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { useTerminalDimensions as useOpenTUITerminalDimensions } from "@opentui/react";
import { useMemo } from "react";

export interface TerminalDimensions {
  rows: number;
  columns: number;
}

/**
 * Hook to track terminal dimensions. Returns clamped dimensions that update
 * when the terminal resizes (SIGWINCH / stdout resize). Derived directly from
 * OpenTUI's dimensions so the UI resizes in sync with the renderer.
 */
export function useTerminalDimensions(): TerminalDimensions {
  const terminal = useOpenTUITerminalDimensions();
  return useMemo(() => {
    const rows = terminal.height ?? UI.TERMINAL_DEFAULT_ROWS;
    const columns = terminal.width ?? UI.TERMINAL_DEFAULT_COLUMNS;
    return {
      rows: Math.max(LIMIT.MIN_TERMINAL_ROWS, rows),
      columns: Math.max(LIMIT.MIN_TERMINAL_COLS, columns),
    };
  }, [terminal.height, terminal.width]);
}

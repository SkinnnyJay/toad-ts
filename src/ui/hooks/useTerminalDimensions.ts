import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { useTerminalDimensions as useOpenTUITerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";

export interface TerminalDimensions {
  rows: number;
  columns: number;
}

/**
 * Hook to track terminal dimensions with throttled resize handling.
 * Returns clamped dimensions that update on terminal resize events.
 */
export function useTerminalDimensions(): TerminalDimensions {
  const terminal = useOpenTUITerminalDimensions();
  const [dimensions, setDimensions] = useState<TerminalDimensions>({
    rows: terminal.height ?? UI.TERMINAL_DEFAULT_ROWS,
    columns: terminal.width ?? UI.TERMINAL_DEFAULT_COLUMNS,
  });

  useEffect(() => {
    let resizeTimer: NodeJS.Timeout | null = null;
    let lastRows = terminal.height ?? UI.TERMINAL_DEFAULT_ROWS;
    let lastCols = terminal.width ?? UI.TERMINAL_DEFAULT_COLUMNS;

    const handleResize = () => {
      if (resizeTimer) return;
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        const nextRows = terminal.height ?? UI.TERMINAL_DEFAULT_ROWS;
        const nextCols = terminal.width ?? UI.TERMINAL_DEFAULT_COLUMNS;
        const clampedRows = Math.max(LIMIT.MIN_TERMINAL_ROWS, nextRows);
        const clampedCols = Math.max(LIMIT.MIN_TERMINAL_COLS, nextCols);
        if (clampedRows === lastRows && clampedCols === lastCols) {
          return;
        }
        lastRows = clampedRows;
        lastCols = clampedCols;
        setDimensions({ rows: clampedRows, columns: clampedCols });
      }, TIMEOUT.THROTTLE_MS);
    };

    handleResize();
    return () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
    };
  }, [terminal.height, terminal.width]);

  return dimensions;
}

import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { useStdout } from "ink";
import { useEffect, useState } from "react";

export interface TerminalDimensions {
  rows: number;
  columns: number;
}

const MIN_ROWS = 10;
const MIN_COLUMNS = 50;

/**
 * Hook to track terminal dimensions with throttled resize handling.
 * Returns clamped dimensions that update on terminal resize events.
 */
export function useTerminalDimensions(): TerminalDimensions {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState<TerminalDimensions>({
    rows: stdout?.rows ?? UI.TERMINAL_DEFAULT_ROWS,
    columns: stdout?.columns ?? UI.TERMINAL_DEFAULT_COLUMNS,
  });

  useEffect(() => {
    let resizeTimer: NodeJS.Timeout | null = null;
    let lastRows = stdout?.rows ?? UI.TERMINAL_DEFAULT_ROWS;
    let lastCols = stdout?.columns ?? UI.TERMINAL_DEFAULT_COLUMNS;

    const handleResize = () => {
      if (resizeTimer) return;
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        const nextRows = stdout?.rows ?? UI.TERMINAL_DEFAULT_ROWS;
        const nextCols = stdout?.columns ?? UI.TERMINAL_DEFAULT_COLUMNS;
        const clampedRows = Math.max(MIN_ROWS, nextRows);
        const clampedCols = Math.max(MIN_COLUMNS, nextCols);
        if (clampedRows === lastRows && clampedCols === lastCols) {
          return;
        }
        lastRows = clampedRows;
        lastCols = clampedCols;
        setDimensions({ rows: clampedRows, columns: clampedCols });
      }, TIMEOUT.THROTTLE_MS);
    };

    stdout?.on("resize", handleResize);
    return () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      if (stdout?.off) {
        stdout.off("resize", handleResize);
      } else if (stdout?.removeListener) {
        stdout.removeListener("resize", handleResize);
      }
    };
  }, [stdout]);

  return dimensions;
}

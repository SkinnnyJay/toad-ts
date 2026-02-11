import { useCallback, useRef } from "react";

const MAX_KILL_RING_SIZE = 30;

/**
 * Kill ring implementation for Emacs-style text manipulation.
 * Ctrl+K/U to kill text, Ctrl+Y to yank (paste), Alt+Y to cycle.
 */
export const useKillRing = () => {
  const ring = useRef<string[]>([]);
  const yankIndex = useRef(-1);

  const kill = useCallback((text: string) => {
    if (!text) return;
    ring.current.push(text);
    if (ring.current.length > MAX_KILL_RING_SIZE) {
      ring.current.shift();
    }
    yankIndex.current = ring.current.length - 1;
  }, []);

  const yank = useCallback((): string | null => {
    if (ring.current.length === 0) return null;
    yankIndex.current = ring.current.length - 1;
    return ring.current[yankIndex.current] ?? null;
  }, []);

  const yankCycle = useCallback((): string | null => {
    if (ring.current.length === 0) return null;
    yankIndex.current = (yankIndex.current - 1 + ring.current.length) % ring.current.length;
    return ring.current[yankIndex.current] ?? null;
  }, []);

  const size = useCallback(() => ring.current.length, []);

  return { kill, yank, yankCycle, size };
};

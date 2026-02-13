import { BASE_SCALE, DURATION_MS, FADE_STEPS, SCALE_DELTA } from "@/constants/modal-animation";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ModalAnimationState {
  /** Whether the modal is currently visible (including during animation) */
  visible: boolean;
  /** Opacity from 0 to 1 for fade transitions */
  opacity: number;
  /** Scale from 0.95 to 1 for subtle zoom effect */
  scale: number;
  /** Start the open animation */
  open: () => void;
  /** Start the close animation, calls onClosed when done */
  close: (onClosed?: () => void) => void;
  /** Whether animation is currently running */
  animating: boolean;
}

/**
 * Hook for animating modal open/close transitions.
 * Uses OpenTUI's useTimeline pattern with step-based interpolation.
 * Provides opacity and scale values for smooth fade+zoom effect.
 */
export const useModalAnimation = (isOpen: boolean): ModalAnimationState => {
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState<number>(BASE_SCALE);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onClosedRef = useRef<(() => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const open = useCallback(() => {
    clearTimer();
    setVisible(true);
    setAnimating(true);
    let step = 0;
    const stepDuration = DURATION_MS / FADE_STEPS;
    timerRef.current = setInterval(() => {
      step++;
      const progress = Math.min(step / FADE_STEPS, 1);
      const eased = 1 - (1 - progress) * (1 - progress); // ease-out quad
      setOpacity(eased);
      setScale(BASE_SCALE + SCALE_DELTA * eased);
      if (step >= FADE_STEPS) {
        clearTimer();
        setAnimating(false);
      }
    }, stepDuration);
  }, [clearTimer]);

  const close = useCallback(
    (onClosed?: () => void) => {
      clearTimer();
      onClosedRef.current = onClosed ?? null;
      setAnimating(true);
      let step = FADE_STEPS;
      const stepDuration = DURATION_MS / FADE_STEPS;
      timerRef.current = setInterval(() => {
        step--;
        const progress = Math.max(step / FADE_STEPS, 0);
        const eased = progress * progress; // ease-in quad
        setOpacity(eased);
        setScale(BASE_SCALE + SCALE_DELTA * eased);
        if (step <= 0) {
          clearTimer();
          setVisible(false);
          setAnimating(false);
          onClosedRef.current?.();
          onClosedRef.current = null;
        }
      }, stepDuration);
    },
    [clearTimer]
  );

  // Auto-trigger based on isOpen prop
  useEffect(() => {
    if (isOpen && !visible) {
      open();
    } else if (!isOpen && visible && !animating) {
      close();
    }
  }, [isOpen, visible, animating, open, close]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  return { visible, opacity, scale, open, close, animating };
};

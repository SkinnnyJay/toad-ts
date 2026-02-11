import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { useCallback, useState } from "react";

/**
 * OpenTUI focus management hook following best practices:
 * - Single focused element at a time
 * - autoFocus on mount for primary input
 * - Focus trapping in modals
 * - Focus restoration after modal close
 */
export const useFocusManagement = () => {
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(FOCUS_TARGET.CHAT);
  const [previousFocus, setPreviousFocus] = useState<FocusTarget>(FOCUS_TARGET.CHAT);
  const [modalActive, setModalActive] = useState(false);

  const focus = useCallback(
    (target: FocusTarget) => {
      if (!modalActive) {
        setPreviousFocus(focusTarget);
      }
      setFocusTarget(target);
    },
    [focusTarget, modalActive]
  );

  const openModal = useCallback(
    (modalFocus: FocusTarget) => {
      setPreviousFocus(focusTarget);
      setFocusTarget(modalFocus);
      setModalActive(true);
    },
    [focusTarget]
  );

  const closeModal = useCallback(() => {
    setFocusTarget(previousFocus);
    setModalActive(false);
  }, [previousFocus]);

  const isFocused = useCallback((target: FocusTarget) => focusTarget === target, [focusTarget]);

  return {
    focusTarget,
    focus,
    openModal,
    closeModal,
    isFocused,
    modalActive,
  };
};

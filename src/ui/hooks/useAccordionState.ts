import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { useAppStore } from "@/store/app-store";
import type { AppState } from "@/types/domain";
import { useCallback } from "react";

type SidebarSection = Exclude<FocusTarget, typeof FOCUS_TARGET.CHAT>;

export interface UseAccordionStateResult {
  isCollapsed: (section: SidebarSection) => boolean;
  toggleSection: (section: SidebarSection) => void;
  setCollapsed: (section: SidebarSection, collapsed: boolean) => void;
}

/**
 * Hook to manage accordion collapse state for sidebar sections.
 * Persists state to the app store.
 */
export function useAccordionState(): UseAccordionStateResult {
  const accordionCollapsed = useAppStore((state) => state.uiState.accordionCollapsed ?? {});
  const setSidebarTab = useAppStore((state) => state.setSidebarTab);
  const setAccordionCollapsed = useAppStore((state) => state.setAccordionCollapsed);

  const isCollapsed = useCallback(
    (section: SidebarSection): boolean => accordionCollapsed?.[section] ?? false,
    [accordionCollapsed]
  );

  const setCollapsed = useCallback(
    (section: SidebarSection, collapsed: boolean) => {
      setSidebarTab(section as AppState["uiState"]["sidebarTab"]);
      setAccordionCollapsed(section as AppState["uiState"]["sidebarTab"], collapsed);
    },
    [setAccordionCollapsed, setSidebarTab]
  );

  const toggleSection = useCallback(
    (section: SidebarSection) => {
      setCollapsed(section, !isCollapsed(section));
    },
    [isCollapsed, setCollapsed]
  );

  return {
    isCollapsed,
    toggleSection,
    setCollapsed,
  };
}

/**
 * Type guard to check if a focus target is a sidebar section.
 */
export const isSidebarSection = (value: FocusTarget): value is SidebarSection =>
  value !== FOCUS_TARGET.CHAT;

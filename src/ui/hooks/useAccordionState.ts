import type { FocusTarget } from "@/constants/focus-target";
import { SIDEBAR_TAB_VALUES, type SidebarTab } from "@/constants/sidebar-tabs";
import { useAppStore } from "@/store/app-store";
import { useCallback } from "react";

type SidebarSection = SidebarTab;

const SIDEBAR_TAB_SET = new Set<string>(SIDEBAR_TAB_VALUES);

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
      setSidebarTab(section);
      setAccordionCollapsed(section, collapsed);
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
  SIDEBAR_TAB_SET.has(value);

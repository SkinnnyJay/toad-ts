import { COLOR } from "@/constants/colors";
import { SIDEBAR_TAB_LABEL, SIDEBAR_TAB_LETTER, type SidebarTab } from "@/constants/sidebar-tabs";
import { TextAttributes } from "@opentui/core";
import { memo } from "react";

const TAB_TEXT_ATTRIBUTES = TextAttributes.DIM;

export interface SidebarTabBarProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  tabRows: SidebarTab[][];
  activeTab: SidebarTab;
  focusTarget: SidebarTab | string;
  onSelectTab: (tab: SidebarTab) => void;
  onFocusTab?: (tab: SidebarTab) => void;
  tabBarHeight: number;
  tabGap: number;
  chevronBoxWidth: number;
  contentAreaWidth: number;
  tabWidth: number;
  activeTabLabel: string;
}

export const SidebarTabBar = memo(function SidebarTabBar({
  isCollapsed,
  onToggleCollapsed,
  tabRows,
  activeTab,
  focusTarget,
  onSelectTab,
  onFocusTab,
  tabBarHeight,
  tabGap,
  chevronBoxWidth,
  contentAreaWidth,
  tabWidth,
  activeTabLabel,
}: SidebarTabBarProps) {
  if (isCollapsed) {
    return (
      <box
        flexDirection="row"
        flexShrink={0}
        height={tabBarHeight}
        minHeight={tabBarHeight}
        alignItems="center"
        gap={tabGap}
        padding={0}
        width={contentAreaWidth}
        overflow="hidden"
        title={activeTabLabel}
        onMouseDown={onToggleCollapsed}
      >
        <box
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          width={chevronBoxWidth}
          height={tabBarHeight}
          padding={0}
        >
          <text attributes={TAB_TEXT_ATTRIBUTES}>▶</text>
        </box>
        <text
          fg={focusTarget === activeTab ? COLOR.CYAN : undefined}
          attributes={TAB_TEXT_ATTRIBUTES}
        >
          {SIDEBAR_TAB_LETTER[activeTab]}
        </text>
      </box>
    );
  }

  return (
    <box flexDirection="column" flexShrink={0} gap={0} padding={0} width={contentAreaWidth}>
      {tabRows.map((rowTabs: SidebarTab[], rowIndex: number) => (
        <box
          key={rowTabs.join(",")}
          flexDirection="row"
          height={tabBarHeight}
          minHeight={tabBarHeight}
          alignItems="center"
          gap={tabGap}
          padding={0}
          overflow="hidden"
        >
          {rowIndex === 0 ? (
            <box
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              width={chevronBoxWidth}
              height={tabBarHeight}
              padding={0}
              onMouseDown={onToggleCollapsed}
            >
              <text attributes={TAB_TEXT_ATTRIBUTES}>▼</text>
            </box>
          ) : (
            <box width={chevronBoxWidth} height={tabBarHeight} padding={0} />
          )}
          {rowTabs.map((tab) => {
            const isActive = tab === activeTab;
            const isFocused = focusTarget === tab;
            const tooltipLabel = SIDEBAR_TAB_LABEL[tab];
            const letter = SIDEBAR_TAB_LETTER[tab];
            return (
              <box
                key={tab}
                title={tooltipLabel}
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                width={tabWidth}
                height={tabBarHeight}
                minHeight={tabBarHeight}
                padding={0}
                border={true}
                borderStyle="single"
                borderColor={isActive || isFocused ? COLOR.CYAN : COLOR.GRAY}
                overflow="hidden"
                onMouseDown={() => {
                  onSelectTab(tab);
                  onFocusTab?.(tab);
                }}
              >
                <text
                  fg={isFocused ? COLOR.CYAN : isActive ? COLOR.GREEN : undefined}
                  attributes={TAB_TEXT_ATTRIBUTES}
                >
                  {letter}
                </text>
              </box>
            );
          })}
        </box>
      ))}
    </box>
  );
});

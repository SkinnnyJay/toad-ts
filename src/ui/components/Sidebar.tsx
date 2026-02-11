import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { formatFileRefForInput } from "@/constants/file-ref";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { KEY_NAME } from "@/constants/key-names";
import { PLAN_STATUS } from "@/constants/plan-status";
import { SIDEBAR_TAB_LABEL, SIDEBAR_TAB_VALUES, type SidebarTab } from "@/constants/sidebar-tabs";
import type { UiSymbols } from "@/constants/ui-symbols";
import { useAppStore } from "@/store/app-store";
import type { Plan, Session, SessionId } from "@/types/domain";
import { useTerminalDimensions } from "@/ui/hooks/useTerminalDimensions";
import { useUiSymbols } from "@/ui/hooks/useUiSymbols";
import { TextAttributes } from "@opentui/core";
import { type BoxProps, useKeyboard } from "@opentui/react";
import { type ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { FileTree } from "./FileTree";
import { ScrollArea } from "./ScrollArea";
import { SidebarTabBar } from "./SidebarTabBar";
import { TodoList } from "./TodoList";

// Helper function to truncate text with ellipsis
const truncateText = (text: string, maxLength: number, ellipsis: string): string => {
  if (maxLength <= 0) return ellipsis;
  if (text.length <= maxLength) return text;
  const truncateAt = Math.max(1, maxLength - 1);
  return `${text.slice(0, truncateAt)}${ellipsis}`;
};

interface SidebarProps {
  width?: BoxProps["width"];
  height?: number;
  currentAgentName?: string;
  currentSessionId?: SessionId;
  onSelectSession?: (sessionId: SessionId) => void;
  onFocusTab?: (tab: SidebarSection) => void;
  focusTarget?: FocusTarget;
}

const PlanSection = memo(({ plan, symbols }: { plan?: Plan; symbols: UiSymbols }) => {
  if (!plan) return <text attributes={TextAttributes.DIM}>No plan</text>;
  const statusIcon =
    plan.status === PLAN_STATUS.COMPLETED
      ? symbols.CHECK
      : plan.status === PLAN_STATUS.FAILED
        ? symbols.CROSS
        : symbols.SPINNER;

  return (
    <box flexDirection="column" gap={0} width="100%" overflow="hidden" minWidth={0}>
      <text wrapMode="word">
        {statusIcon} {plan.originalPrompt}
      </text>
      {plan.tasks.slice(0, LIMIT.SIDEBAR_TASKS_DISPLAY).map((task) => (
        <text key={task.id} attributes={TextAttributes.DIM} wrapMode="word">
          {task.status === PLAN_STATUS.COMPLETED
            ? symbols.CHECK
            : task.status === PLAN_STATUS.FAILED
              ? symbols.CROSS
              : symbols.SPINNER}{" "}
          {task.title}
        </text>
      ))}
      {plan.tasks.length > LIMIT.SIDEBAR_TASKS_DISPLAY ? (
        <text attributes={TextAttributes.DIM}>{symbols.ELLIPSIS}</text>
      ) : null}
    </box>
  );
});

const AgentsSection = memo(({ currentAgentName }: { currentAgentName?: string }) => {
  if (!currentAgentName) {
    return (
      <box width="100%" overflow="hidden" minWidth={0}>
        <text attributes={TextAttributes.DIM} wrapMode="word">
          No agent selected
        </text>
      </box>
    );
  }
  return (
    <box
      flexDirection="column"
      gap={0}
      width="100%"
      overflow="hidden"
      minWidth={0}
      minHeight={0}
      flexGrow={1}
    >
      <text wrapMode="word">{currentAgentName}</text>
    </box>
  );
});

const SessionsSection = memo(
  ({
    sessions,
    currentSessionId,
    selectedIndex,
    maxWidth,
    symbols,
    onSessionClick,
  }: {
    sessions: Session[];
    currentSessionId?: SessionId;
    selectedIndex: number;
    maxWidth: number;
    symbols: UiSymbols;
    onSessionClick?: (sessionId: SessionId) => void;
  }) => {
    if (sessions.length === 0) {
      return <text attributes={TextAttributes.DIM}>No sessions</text>;
    }

    const prefixLength = `${symbols.CHEVRON} ${symbols.DOT_FILLED} `.length;
    const safetyMargin = LIMIT.FILE_TREE_SAFETY_MARGIN;
    const maxSessionIdLength = Math.max(1, maxWidth - prefixLength - safetyMargin);

    return (
      <box flexDirection="column" gap={0} width="100%" overflow="hidden" minWidth={0}>
        {sessions.map((session, idx) => {
          const isCurrent = session.id === currentSessionId;
          const isSelected = idx === selectedIndex;
          const truncatedId = truncateText(session.id, maxSessionIdLength, symbols.ELLIPSIS);
          const row = (
            <text
              key={session.id}
              fg={isSelected ? COLOR.CYAN : isCurrent ? COLOR.GREEN : undefined}
              attributes={!isSelected && !isCurrent ? TextAttributes.DIM : 0}
            >
              {isSelected ? symbols.CHEVRON : " "}{" "}
              {isCurrent ? symbols.DOT_FILLED : symbols.DOT_EMPTY} {truncatedId}
            </text>
          );
          if (onSessionClick) {
            return (
              <box
                key={session.id}
                flexDirection="row"
                width="100%"
                onMouseDown={() => onSessionClick(session.id)}
              >
                {row}
              </box>
            );
          }
          return row;
        })}
      </box>
    );
  }
);

type SidebarSection = SidebarTab;

const SIDEBAR_TAB_SET = new Set<string>(SIDEBAR_TAB_VALUES);

const isSidebarSection = (value: FocusTarget): value is SidebarSection =>
  SIDEBAR_TAB_SET.has(value);

export function Sidebar({
  width = "15%",
  height,
  currentAgentName,
  currentSessionId,
  onSelectSession,
  onFocusTab,
  focusTarget = FOCUS_TARGET.CHAT,
}: SidebarProps): ReactNode {
  const symbols = useUiSymbols();
  const terminal = useTerminalDimensions();
  const terminalRows = terminal.rows ?? UI.TERMINAL_DEFAULT_ROWS;
  const terminalWidth = terminal.columns ?? UI.TERMINAL_DEFAULT_COLUMNS;

  const availableHeight = height ?? terminalRows - 5;
  const contentHeight = Math.max(8, availableHeight - 2);

  const storeCurrentSessionId = useAppStore((state) => state.currentSessionId);
  const activeSessionId = currentSessionId ?? storeCurrentSessionId;
  const plan = useMemo(
    () => (activeSessionId ? useAppStore.getState().getPlanBySession(activeSessionId) : undefined),
    [activeSessionId]
  );

  const sessionsById = useAppStore((state) => state.sessions);
  const contextAttachmentsBySession = useAppStore((state) => state.contextAttachments);
  const sidebarTab = useAppStore((state) => state.uiState.sidebarTab);
  const accordionCollapsed = useAppStore((state) => state.uiState.accordionCollapsed ?? {});
  const setSidebarTab = useAppStore((state) => state.setSidebarTab);
  const toggleAccordionSection = useAppStore((state) => state.toggleAccordionSection);
  const sessions = useMemo<Session[]>(() => {
    const values = Object.values(sessionsById).filter(
      (session): session is Session => session !== undefined
    );
    return values.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessionsById]);

  const [sessionIndex, setSessionIndex] = useState(0);
  const activeTab: SidebarSection = isSidebarSection(focusTarget) ? focusTarget : sidebarTab;
  const activeTabLabel = SIDEBAR_TAB_LABEL[activeTab];
  const isTabViewCollapsed = accordionCollapsed[activeTab] ?? false;

  const toggleTabViewCollapsed = useCallback(() => {
    toggleAccordionSection(activeTab);
  }, [activeTab, toggleAccordionSection]);

  useEffect(() => {
    if (isSidebarSection(focusTarget)) {
      setSidebarTab(focusTarget);
    }
  }, [focusTarget, setSidebarTab]);

  const selectTab = useCallback(
    (section: SidebarSection) => {
      setSidebarTab(section);
    },
    [setSidebarTab]
  );

  useEffect(() => {
    if (!activeSessionId) {
      setSessionIndex(0);
      return;
    }
    const foundIndex = sessions.findIndex((session) => session.id === activeSessionId);
    if (foundIndex >= 0) {
      setSessionIndex(foundIndex);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (sessions.length === 0) {
      if (sessionIndex !== 0) {
        setSessionIndex(0);
      }
      return;
    }
    if (sessionIndex >= sessions.length) {
      setSessionIndex(sessions.length - 1);
    }
  }, [sessionIndex, sessions.length]);

  useKeyboard((key) => {
    const active = focusTarget ?? FOCUS_TARGET.CHAT;

    if (key.name === "]" && isSidebarSection(active)) {
      key.preventDefault();
      key.stopPropagation();
      toggleTabViewCollapsed();
      return;
    }

    if (isSidebarSection(active)) {
      if (key.name === KEY_NAME.LEFT) {
        key.preventDefault();
        key.stopPropagation();
        const idx = SIDEBAR_TAB_VALUES.indexOf(active as SidebarTab);
        const prevIdx = idx <= 0 ? SIDEBAR_TAB_VALUES.length - 1 : idx - 1;
        const prevTab = SIDEBAR_TAB_VALUES[prevIdx];
        if (prevTab) {
          onFocusTab?.(prevTab);
          selectTab(prevTab);
        }
        return;
      }
      if (key.name === KEY_NAME.RIGHT) {
        key.preventDefault();
        key.stopPropagation();
        const idx = SIDEBAR_TAB_VALUES.indexOf(active as SidebarTab);
        const nextIdx = idx < 0 || idx >= SIDEBAR_TAB_VALUES.length - 1 ? 0 : idx + 1;
        const nextTab = SIDEBAR_TAB_VALUES[nextIdx];
        if (nextTab) {
          onFocusTab?.(nextTab);
          selectTab(nextTab);
        }
        return;
      }
    }

    if (key.name === KEY_NAME.SPACE && isSidebarSection(active)) {
      key.preventDefault();
      key.stopPropagation();
      toggleTabViewCollapsed();
      return;
    }

    if (
      (key.name === KEY_NAME.RETURN || key.name === KEY_NAME.LINEFEED) &&
      isSidebarSection(active)
    ) {
      key.preventDefault();
      key.stopPropagation();
      if (isTabViewCollapsed) {
        toggleTabViewCollapsed();
      } else {
        selectTab(active);
      }
      return;
    }

    if (
      active === FOCUS_TARGET.SESSIONS &&
      activeTab === FOCUS_TARGET.SESSIONS &&
      sessions.length > 0
    ) {
      if (key.name === KEY_NAME.UP) {
        key.preventDefault();
        key.stopPropagation();
        setSessionIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.name === KEY_NAME.DOWN) {
        key.preventDefault();
        key.stopPropagation();
        setSessionIndex((prev) => Math.min(sessions.length - 1, prev + 1));
        return;
      }
      if (key.name === KEY_NAME.RETURN || key.name === KEY_NAME.LINEFEED) {
        key.preventDefault();
        key.stopPropagation();
        const chosen = sessions[sessionIndex];
        if (chosen) {
          if (onSelectSession) {
            onSelectSession(chosen.id);
          } else {
            useAppStore.getState().setCurrentSession(chosen.id);
          }
        }
        return;
      }
    }
  });

  const sidebarWidthPercent = UI.SIDEBAR_WIDTH_RATIO;
  const sidebarWidth =
    typeof width === "number" ? width : Math.floor(terminalWidth * sidebarWidthPercent);
  const sidebarPadding = UI.SIDEBAR_PADDING;
  const scrollbarWidth = UI.SCROLLBAR_WIDTH;
  const tabBarHeight = 2;
  const tabContentPaddingTop = 1;
  const tabGap = 0;
  const chevronBoxWidth = 2;
  const contentHeightBelowTabs = Math.max(6, contentHeight - tabBarHeight - tabContentPaddingTop);
  const contentAreaWidth = Math.max(1, sidebarWidth - sidebarPadding * 2 - scrollbarWidth);
  const tabCount = SIDEBAR_TAB_VALUES.length;
  const minTabWidth = 3;
  const tabWidth = Math.max(
    minTabWidth,
    Math.floor((contentAreaWidth - chevronBoxWidth - tabCount * tabGap) / tabCount)
  );
  const tabRows: SidebarSection[][] = [[...SIDEBAR_TAB_VALUES]];
  const maxSessionIdWidth = Math.max(LIMIT.FILE_TREE_PADDING, contentAreaWidth - 2);

  const contextAttachments = activeSessionId
    ? (contextAttachmentsBySession[activeSessionId] ?? [])
    : [];
  const displayedContext = contextAttachments.slice(0, LIMIT.SIDEBAR_TASKS_DISPLAY);
  const hiddenContextCount = Math.max(0, contextAttachments.length - displayedContext.length);

  const tabContent = (
    <>
      {activeTab === FOCUS_TARGET.FILES ? (
        <FileTree
          isFocused={focusTarget === FOCUS_TARGET.FILES}
          height={contentHeightBelowTabs}
          textSize="small"
          onRequestFocus={() => onFocusTab?.(FOCUS_TARGET.FILES)}
          onSelectFile={(_path, name) => {
            useAppStore.getState().setPendingFileRefForInput(formatFileRefForInput(name));
          }}
        />
      ) : null}
      {activeTab === FOCUS_TARGET.PLAN ? (
        <box padding={1} paddingTop={0} gap={1} flexDirection="column">
          <PlanSection plan={plan} symbols={symbols} />
        </box>
      ) : null}
      {activeTab === FOCUS_TARGET.CONTEXT ? (
        <box padding={1} paddingTop={0} gap={1} flexDirection="column" minHeight={0}>
          {displayedContext.length === 0 ? (
            <text attributes={TextAttributes.DIM}>No context files attached</text>
          ) : (
            <box flexDirection="column" gap={0} minWidth={0} width="100%">
              {displayedContext.map((file) => (
                <text key={file} truncate={true}>
                  {symbols.BULLET}{" "}
                  {truncateText(file, LIMIT.SIDEBAR_TRUNCATE_LENGTH, symbols.ELLIPSIS)}
                </text>
              ))}
              {hiddenContextCount > 0 ? (
                <text attributes={TextAttributes.DIM}>
                  {`${symbols.ELLIPSIS} ${hiddenContextCount} more`}
                </text>
              ) : null}
            </box>
          )}
        </box>
      ) : null}
      {activeTab === FOCUS_TARGET.SESSIONS ? (
        <box padding={1} paddingTop={0} gap={1} flexDirection="column">
          <SessionsSection
            sessions={sessions}
            currentSessionId={activeSessionId}
            selectedIndex={sessionIndex}
            maxWidth={maxSessionIdWidth}
            symbols={symbols}
            onSessionClick={
              onSelectSession ??
              ((sessionId) => useAppStore.getState().setCurrentSession(sessionId))
            }
          />
        </box>
      ) : null}
      {activeTab === FOCUS_TARGET.AGENT ? (
        <box padding={1} paddingTop={0} gap={1} flexDirection="column">
          <AgentsSection currentAgentName={currentAgentName} />
        </box>
      ) : null}
      {activeTab === FOCUS_TARGET.TODOS ? (
        <box padding={1} paddingTop={0} gap={1} flexDirection="column">
          <TodoList sessionId={activeSessionId} />
        </box>
      ) : null}
    </>
  );

  const isSidebarFocused = isSidebarSection(focusTarget);

  return (
    <box
      width={width}
      height={height}
      flexDirection="column"
      flexGrow={height === undefined ? 1 : undefined}
      minHeight={0}
      border={true}
      borderStyle={isSidebarFocused ? "double" : "single"}
      borderColor={isSidebarFocused ? COLOR.CYAN : COLOR.GRAY}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={1}
      gap={0}
    >
      <SidebarTabBar
        isCollapsed={isTabViewCollapsed}
        onToggleCollapsed={toggleTabViewCollapsed}
        tabRows={tabRows}
        activeTab={activeTab}
        focusTarget={focusTarget}
        onSelectTab={selectTab}
        onFocusTab={onFocusTab}
        tabBarHeight={tabBarHeight}
        tabGap={tabGap}
        chevronBoxWidth={chevronBoxWidth}
        contentAreaWidth={contentAreaWidth}
        tabWidth={tabWidth}
        activeTabLabel={activeTabLabel}
      />
      <box
        flexDirection="column"
        flexGrow={1}
        flexShrink={1}
        minWidth={0}
        minHeight={0}
        width={contentAreaWidth}
        maxHeight={contentHeightBelowTabs}
        paddingTop={tabContentPaddingTop}
        overflow="hidden"
      >
        <text attributes={TextAttributes.DIM}>{activeTabLabel}</text>
        {activeTab === FOCUS_TARGET.FILES ? (
          <box
            flexDirection="column"
            width="100%"
            minWidth={0}
            minHeight={0}
            height={contentHeightBelowTabs - tabContentPaddingTop}
            maxHeight={contentHeightBelowTabs - tabContentPaddingTop}
            overflow="hidden"
            flexShrink={1}
          >
            <FileTree
              isFocused={focusTarget === FOCUS_TARGET.FILES}
              height={contentHeightBelowTabs - tabContentPaddingTop}
              textSize="small"
              onRequestFocus={() => onFocusTab?.(FOCUS_TARGET.FILES)}
              onSelectFile={(_path, name) => {
                useAppStore.getState().setPendingFileRefForInput(formatFileRefForInput(name));
              }}
            />
          </box>
        ) : (
          <ScrollArea
            height={contentHeightBelowTabs}
            viewportCulling={true}
            focused={focusTarget !== FOCUS_TARGET.CHAT}
          >
            <box flexDirection="column" gap={1} minHeight={0} paddingLeft={0}>
              {tabContent}
            </box>
          </ScrollArea>
        )}
      </box>
    </box>
  );
}

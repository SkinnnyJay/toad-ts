import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { PLAN_STATUS } from "@/constants/plan-status";
import { useAppStore } from "@/store/app-store";
import type { AppState, Plan, Session, SessionId } from "@/types/domain";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AccordionSection } from "./AccordionSection";
import { FileTree } from "./FileTree";
import { ScrollArea } from "./ScrollArea";
import { useTerminalDimensions } from "@/ui/hooks/useTerminalDimensions";

// Helper function to truncate text with ellipsis
const truncateText = (text: string, maxLength: number): string => {
  if (maxLength <= 0) return "…";
  if (text.length <= maxLength) return text;
  const truncateAt = Math.max(1, maxLength - 1);
  return `${text.slice(0, truncateAt)}…`;
};

interface SidebarProps {
  width?: string | number;
  height?: number;
  currentAgentName?: string;
  currentSessionId?: SessionId;
  onSelectSession?: (sessionId: SessionId) => void;
  focusTarget?: FocusTarget;
}

const PlanSection = memo(({ plan }: { plan?: Plan }) => {
  if (!plan) return <text attributes={TextAttributes.DIM}>No plan</text>;
  const statusIcon =
    plan.status === PLAN_STATUS.COMPLETED ? "✓" : plan.status === PLAN_STATUS.FAILED ? "✗" : "⟳";

  return (
    <box flexDirection="column" gap={0} width="100%" overflow="hidden" minWidth={0}>
      <text wrapMode="word">
        {statusIcon} {plan.originalPrompt}
      </text>
      {plan.tasks.slice(0, LIMIT.SIDEBAR_TASKS_DISPLAY).map((task) => (
        <text key={task.id} attributes={TextAttributes.DIM} wrapMode="word">
          {task.status === PLAN_STATUS.COMPLETED
            ? "✓"
            : task.status === PLAN_STATUS.FAILED
              ? "✗"
              : "⟳"}{" "}
          {task.title}
        </text>
      ))}
      {plan.tasks.length > LIMIT.SIDEBAR_TASKS_DISPLAY ? (
        <text attributes={TextAttributes.DIM}>…</text>
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
  }: {
    sessions: Session[];
    currentSessionId?: SessionId;
    selectedIndex: number;
    maxWidth: number;
  }) => {
    if (sessions.length === 0) {
      return <text attributes={TextAttributes.DIM}>No sessions</text>;
    }

    const prefixLength = 2 + 2 + 2; // "› " + "● " or "○ " + spacing
    const safetyMargin = 2;
    const maxSessionIdLength = Math.max(1, maxWidth - prefixLength - safetyMargin);

    return (
      <box flexDirection="column" gap={0} width="100%" overflow="hidden" minWidth={0}>
        {sessions.map((session, idx) => {
          const isCurrent = session.id === currentSessionId;
          const isSelected = idx === selectedIndex;
          const truncatedId = truncateText(session.id, maxSessionIdLength);
          return (
            <text
              key={session.id}
              fg={isSelected ? COLOR.CYAN : isCurrent ? COLOR.GREEN : undefined}
              attributes={!isSelected && !isCurrent ? TextAttributes.DIM : 0}
            >
              {isSelected ? "›" : " "} {isCurrent ? "●" : "○"} {truncatedId}
            </text>
          );
        })}
      </box>
    );
  }
);

type SidebarSection = Exclude<FocusTarget, typeof FOCUS_TARGET.CHAT>;

const sectionShortcuts: Record<SidebarSection, string> = {
  [FOCUS_TARGET.FILES]: "Cmd/Ctrl+F or Cmd/Ctrl+1",
  [FOCUS_TARGET.PLAN]: "Cmd/Ctrl+2",
  [FOCUS_TARGET.CONTEXT]: "Cmd/Ctrl+3",
  [FOCUS_TARGET.SESSIONS]: "Cmd/Ctrl+4",
  [FOCUS_TARGET.AGENT]: "Cmd/Ctrl+5",
};

const isSidebarSection = (value: FocusTarget): value is SidebarSection =>
  value !== FOCUS_TARGET.CHAT;

export function Sidebar({
  width = "15%",
  height,
  currentAgentName,
  currentSessionId,
  onSelectSession,
  focusTarget = FOCUS_TARGET.CHAT,
}: SidebarProps): JSX.Element {
  const terminal = useTerminalDimensions();
  const terminalRows = terminal.rows ?? UI.TERMINAL_DEFAULT_ROWS;
  const terminalWidth = terminal.columns ?? 80;

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
  const setSidebarTab = useAppStore((state) => state.setSidebarTab);
  const accordionCollapsed = useAppStore((state) => state.uiState.accordionCollapsed ?? {});
  const setAccordionCollapsed = useAppStore((state) => state.setAccordionCollapsed);
  const sessions = useMemo<Session[]>(() => {
    const values = Object.values(sessionsById) as Session[];
    return values.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessionsById]);

  const [sessionIndex, setSessionIndex] = useState(0);

  const isCollapsed = useCallback(
    (section: SidebarSection): boolean => accordionCollapsed?.[section] ?? false,
    [accordionCollapsed]
  );

  const toggleSection = useCallback(
    (section: SidebarSection) => {
      setSidebarTab(section as AppState["uiState"]["sidebarTab"]);
      setAccordionCollapsed(section as AppState["uiState"]["sidebarTab"], !isCollapsed(section));
    },
    [isCollapsed, setAccordionCollapsed, setSidebarTab]
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

  useKeyboard((key) => {
    const active = focusTarget ?? FOCUS_TARGET.CHAT;

    if (
      (key.name === "return" || key.name === "linefeed" || key.name === "space") &&
      isSidebarSection(active)
    ) {
      key.preventDefault();
      key.stopPropagation();
      toggleSection(active);
      return;
    }

    if (
      active === FOCUS_TARGET.SESSIONS &&
      !isCollapsed(FOCUS_TARGET.SESSIONS) &&
      sessions.length > 0
    ) {
      if (key.name === "up") {
        key.preventDefault();
        key.stopPropagation();
        setSessionIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.name === "down") {
        key.preventDefault();
        key.stopPropagation();
        setSessionIndex((prev) => Math.min(sessions.length - 1, prev + 1));
        return;
      }
      if (key.name === "return" || key.name === "linefeed") {
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

  const sidebarWidthPercent = 0.15;
  const sidebarWidth =
    typeof width === "number" ? width : Math.floor(terminalWidth * sidebarWidthPercent);
  const sidebarPadding = 2;
  const containerPadding = 2;
  const scrollbarWidth = 1;
  const maxSessionIdWidth = Math.max(
    10,
    sidebarWidth - sidebarPadding - containerPadding - scrollbarWidth
  );

  const filesHeight = Math.max(6, Math.floor(contentHeight * 0.55));
  const sessionsHeight = Math.max(4, Math.floor(contentHeight * 0.25));

  const contextAttachments = activeSessionId
    ? (contextAttachmentsBySession[activeSessionId] ?? [])
    : [];
  const displayedContext = contextAttachments.slice(0, LIMIT.SIDEBAR_TASKS_DISPLAY);
  const hiddenContextCount = Math.max(0, contextAttachments.length - displayedContext.length);

  return (
    <box
      width={width}
      height={height}
      flexDirection="column"
      flexGrow={height === undefined ? 1 : undefined}
      minHeight={0}
      border={true}
      borderStyle="single"
      borderColor={COLOR.GRAY}
      paddingX={1}
      paddingY={1}
      gap={1}
    >
      <ScrollArea
        height={contentHeight}
        viewportCulling={true}
        focused={focusTarget !== FOCUS_TARGET.CHAT}
      >
        <box flexDirection="column" gap={1} minHeight={0}>
          <AccordionSection
            title="Files"
            isCollapsed={isCollapsed(FOCUS_TARGET.FILES)}
            shortcutHint={sectionShortcuts[FOCUS_TARGET.FILES]}
            height={filesHeight + 2}
          >
            {!isCollapsed(FOCUS_TARGET.FILES) ? (
              <FileTree
                isFocused={focusTarget === FOCUS_TARGET.FILES}
                height={filesHeight}
                textSize="small"
              />
            ) : null}
          </AccordionSection>

          <AccordionSection
            title="Plan"
            isCollapsed={isCollapsed(FOCUS_TARGET.PLAN)}
            shortcutHint={sectionShortcuts[FOCUS_TARGET.PLAN]}
          >
            {!isCollapsed(FOCUS_TARGET.PLAN) ? (
              <box padding={1} paddingTop={0} gap={1} flexDirection="column">
                <PlanSection plan={plan} />
              </box>
            ) : null}
          </AccordionSection>

          <AccordionSection
            title="Context"
            isCollapsed={isCollapsed(FOCUS_TARGET.CONTEXT)}
            shortcutHint={sectionShortcuts[FOCUS_TARGET.CONTEXT]}
          >
            {!isCollapsed(FOCUS_TARGET.CONTEXT) ? (
              <box padding={1} paddingTop={0} gap={1} flexDirection="column" minHeight={0}>
                {displayedContext.length === 0 ? (
                  <text attributes={TextAttributes.DIM}>No context files attached</text>
                ) : (
                  <box flexDirection="column" gap={0} minWidth={0} width="100%">
                    {displayedContext.map((file) => (
                      <text key={file} truncate={true}>
                        • {truncateText(file, 60)}
                      </text>
                    ))}
                    {hiddenContextCount > 0 ? (
                      <text attributes={TextAttributes.DIM}>{`… ${hiddenContextCount} more`}</text>
                    ) : null}
                  </box>
                )}
              </box>
            ) : null}
          </AccordionSection>

          <AccordionSection
            title="Sessions"
            isCollapsed={isCollapsed(FOCUS_TARGET.SESSIONS)}
            shortcutHint={sectionShortcuts[FOCUS_TARGET.SESSIONS]}
            height={sessionsHeight + 2}
          >
            {!isCollapsed(FOCUS_TARGET.SESSIONS) ? (
              <box padding={1} paddingTop={0} gap={1} flexDirection="column">
                <SessionsSection
                  sessions={sessions}
                  currentSessionId={activeSessionId}
                  selectedIndex={sessionIndex}
                  maxWidth={maxSessionIdWidth}
                />
              </box>
            ) : null}
          </AccordionSection>

          <AccordionSection
            title="Sub-agents"
            isCollapsed={isCollapsed(FOCUS_TARGET.AGENT)}
            shortcutHint={sectionShortcuts[FOCUS_TARGET.AGENT]}
          >
            {!isCollapsed(FOCUS_TARGET.AGENT) ? (
              <box padding={1} paddingTop={0} gap={1} flexDirection="column">
                <AgentsSection currentAgentName={currentAgentName} />
              </box>
            ) : null}
          </AccordionSection>
        </box>
      </ScrollArea>
    </box>
  );
}

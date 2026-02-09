import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { PLAN_STATUS } from "@/constants/plan-status";
import { useAppStore } from "@/store/app-store";
import type { AppState, Plan, Session, SessionId } from "@/types/domain";
import { Box, Text, useInput, useStdout } from "ink";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AccordionSection } from "./AccordionSection";
import { FileTree } from "./FileTree";
import { ScrollArea } from "./ScrollArea";

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
  if (!plan) return <Text dimColor>No plan</Text>;
  const statusIcon =
    plan.status === PLAN_STATUS.COMPLETED ? "✓" : plan.status === PLAN_STATUS.FAILED ? "✗" : "⟳";

  return (
    <Box flexDirection="column" gap={0} width="100%" overflow="hidden" minWidth={0}>
      <Text wrap="wrap">
        {statusIcon} {plan.originalPrompt}
      </Text>
      {plan.tasks.slice(0, LIMIT.SIDEBAR_TASKS_DISPLAY).map((task) => (
        <Text key={task.id} dimColor wrap="wrap">
          {task.status === PLAN_STATUS.COMPLETED
            ? "✓"
            : task.status === PLAN_STATUS.FAILED
              ? "✗"
              : "⟳"}{" "}
          {task.title}
        </Text>
      ))}
      {plan.tasks.length > LIMIT.SIDEBAR_TASKS_DISPLAY ? <Text dimColor>…</Text> : null}
    </Box>
  );
});

const AgentsSection = memo(({ currentAgentName }: { currentAgentName?: string }) => {
  if (!currentAgentName) {
    return (
      <Box width="100%" overflow="hidden" minWidth={0}>
        <Text dimColor wrap="wrap">
          No agent selected
        </Text>
      </Box>
    );
  }
  return (
    <Box
      flexDirection="column"
      gap={0}
      width="100%"
      overflow="hidden"
      minWidth={0}
      minHeight={0}
      flexGrow={1}
    >
      <Text wrap="wrap">{currentAgentName}</Text>
    </Box>
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
      return <Text dimColor>No sessions</Text>;
    }

    const prefixLength = 2 + 2 + 2; // "› " + "● " or "○ " + spacing
    const safetyMargin = 2;
    const maxSessionIdLength = Math.max(1, maxWidth - prefixLength - safetyMargin);

    return (
      <Box flexDirection="column" gap={0} width="100%" overflow="hidden" minWidth={0}>
        {sessions.map((session, idx) => {
          const isCurrent = session.id === currentSessionId;
          const isSelected = idx === selectedIndex;
          const truncatedId = truncateText(session.id, maxSessionIdLength);
          return (
            <Text
              key={session.id}
              color={isSelected ? COLOR.CYAN : isCurrent ? COLOR.GREEN : undefined}
              dimColor={!isSelected && !isCurrent}
            >
              {isSelected ? "›" : " "} {isCurrent ? "●" : "○"} {truncatedId}
            </Text>
          );
        })}
      </Box>
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
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? UI.TERMINAL_DEFAULT_ROWS;
  const terminalWidth = stdout?.columns ?? 80;

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

  useInput((input, key) => {
    const active = focusTarget ?? FOCUS_TARGET.CHAT;

    if ((key.return || input === " ") && isSidebarSection(active)) {
      toggleSection(active);
      return;
    }

    if (
      active === FOCUS_TARGET.SESSIONS &&
      !isCollapsed(FOCUS_TARGET.SESSIONS) &&
      sessions.length > 0
    ) {
      if (key.upArrow) {
        setSessionIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSessionIndex((prev) => Math.min(sessions.length - 1, prev + 1));
        return;
      }
      if (key.return) {
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
    <Box
      width={width}
      height={height}
      flexDirection="column"
      flexGrow={height === undefined ? 1 : undefined}
      minHeight={0}
      borderStyle="single"
      borderColor={COLOR.GRAY}
      paddingX={1}
      paddingY={1}
      gap={1}
    >
      <ScrollArea
        height={contentHeight}
        showScrollbar={true}
        estimatedLinesPerItem={2}
        isFocused={focusTarget !== FOCUS_TARGET.CHAT}
      >
        <Box flexDirection="column" gap={1} minHeight={0}>
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
              <Box padding={1} paddingTop={0} gap={1} flexDirection="column">
                <PlanSection plan={plan} />
              </Box>
            ) : null}
          </AccordionSection>

          <AccordionSection
            title="Context"
            isCollapsed={isCollapsed(FOCUS_TARGET.CONTEXT)}
            shortcutHint={sectionShortcuts[FOCUS_TARGET.CONTEXT]}
          >
            {!isCollapsed(FOCUS_TARGET.CONTEXT) ? (
              <Box padding={1} paddingTop={0} gap={1} flexDirection="column" minHeight={0}>
                {displayedContext.length === 0 ? (
                  <Text dimColor>No context files attached</Text>
                ) : (
                  <Box flexDirection="column" gap={0} minWidth={0} width="100%">
                    {displayedContext.map((file) => (
                      <Text key={file} wrap="truncate-end">
                        • {truncateText(file, 60)}
                      </Text>
                    ))}
                    {hiddenContextCount > 0 ? (
                      <Text dimColor>{`… ${hiddenContextCount} more`}</Text>
                    ) : null}
                  </Box>
                )}
              </Box>
            ) : null}
          </AccordionSection>

          <AccordionSection
            title="Sessions"
            isCollapsed={isCollapsed(FOCUS_TARGET.SESSIONS)}
            shortcutHint={sectionShortcuts[FOCUS_TARGET.SESSIONS]}
            height={sessionsHeight + 2}
          >
            {!isCollapsed(FOCUS_TARGET.SESSIONS) ? (
              <Box padding={1} paddingTop={0} gap={1} flexDirection="column">
                <SessionsSection
                  sessions={sessions}
                  currentSessionId={activeSessionId}
                  selectedIndex={sessionIndex}
                  maxWidth={maxSessionIdWidth}
                />
              </Box>
            ) : null}
          </AccordionSection>

          <AccordionSection
            title="Sub-agents"
            isCollapsed={isCollapsed(FOCUS_TARGET.AGENT)}
            shortcutHint={sectionShortcuts[FOCUS_TARGET.AGENT]}
          >
            {!isCollapsed(FOCUS_TARGET.AGENT) ? (
              <Box padding={1} paddingTop={0} gap={1} flexDirection="column">
                <AgentsSection currentAgentName={currentAgentName} />
              </Box>
            ) : null}
          </AccordionSection>
        </Box>
      </ScrollArea>
    </Box>
  );
}

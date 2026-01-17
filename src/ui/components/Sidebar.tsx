import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { PLAN_STATUS } from "@/constants/plan-status";
import { useAppStore } from "@/store/app-store";
import type { Plan, Session, SessionId } from "@/types/domain";
import { Box, Text, useInput, useStdout } from "ink";
import { memo, useEffect, useMemo, useState } from "react";
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
  focusTarget?: "files" | "plan" | "context" | "sessions" | "agent" | "chat";
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

    // Calculate available width for session IDs
    // Account for: pointer (2 chars), status icon (2 chars), spacing (2 chars), safety margin (2 chars)
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

const tabs = [
  { id: "files", icon: "F" },
  { id: "plan", icon: "P" },
  { id: "context", icon: "C" },
  { id: "sessions", icon: "S" },
  { id: "agent", icon: "A" },
] as const;

export function Sidebar({
  width = "15%",
  height,
  currentAgentName,
  currentSessionId,
  onSelectSession,
  focusTarget = "chat",
}: SidebarProps): JSX.Element {
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? UI.TERMINAL_DEFAULT_ROWS;
  const terminalWidth = stdout?.columns ?? 80;

  const availableHeight = height ?? terminalRows - 5;
  const tabBarHeight = 2;
  const contentHeight = Math.max(8, availableHeight - tabBarHeight);

  const storeCurrentSessionId = useAppStore((state) => state.currentSessionId);
  const activeSessionId = currentSessionId ?? storeCurrentSessionId;
  const plan = useMemo(
    () => (activeSessionId ? useAppStore.getState().getPlanBySession(activeSessionId) : undefined),
    [activeSessionId]
  );

  const sessionsById = useAppStore((state) => state.sessions);
  const sessions = useMemo<Session[]>(() => {
    const values = Object.values(sessionsById) as Session[];
    return values.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessionsById]);

  const [sessionIndex, setSessionIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState<SidebarProps["focusTarget"]>("files");

  useEffect(() => {
    if (focusTarget && tabs.some((tab) => tab.id === focusTarget)) {
      setSelectedTab(focusTarget);
    }
  }, [focusTarget]);

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
    // Tab navigation within sidebar when focused on sidebar targets
    if (focusTarget !== "chat") {
      if (key.leftArrow || input === "h") {
        setSelectedTab((prev) => {
          const currentIdx = tabs.findIndex((tab) => tab.id === prev);
          const safeIdx = currentIdx >= 0 ? currentIdx : 0;
          const nextIdx = (safeIdx - 1 + tabs.length) % tabs.length;
          return tabs[nextIdx]?.id ?? prev;
        });
      }
      if (key.rightArrow || input === "l") {
        setSelectedTab((prev) => {
          const currentIdx = tabs.findIndex((tab) => tab.id === prev);
          const safeIdx = currentIdx >= 0 ? currentIdx : 0;
          const nextIdx = (safeIdx + 1) % tabs.length;
          return tabs[nextIdx]?.id ?? prev;
        });
      }
    }

    // Sessions navigation when on Sessions tab
    if (selectedTab === "sessions" && focusTarget === "sessions" && sessions.length > 0) {
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

  const tabContent = useMemo(() => {
    switch (selectedTab) {
      case "files": {
        // Account for header text (1 line), padding, gap, and safety margin
        const headerHeight = 1;
        const containerPadding = 2; // padding={1} top and bottom
        const gapSpacing = 1; // gap={1} between header and FileTree
        const safetyMargin = 2; // Extra margin to prevent overflow
        const fileTreeHeight = Math.max(
          1,
          contentHeight - headerHeight - containerPadding - gapSpacing - safetyMargin
        );
        return (
          <ScrollArea
            height={contentHeight}
            showScrollbar={true}
            isFocused={focusTarget === "files"}
          >
            <Box
              padding={1}
              paddingTop={0}
              paddingBottom={1}
              gap={1}
              flexDirection="column"
              flexGrow={1}
              minHeight={0}
            >
              <Text color={COLOR.GRAY} bold>
                Files
              </Text>
              <FileTree
                isFocused={focusTarget === "files"}
                height={fileTreeHeight}
                textSize="small"
              />
            </Box>
          </ScrollArea>
        );
      }
      case "plan":
        return (
          <ScrollArea height={contentHeight} showScrollbar={true}>
            <Box padding={1} paddingTop={0} gap={1} flexDirection="column">
              <Text color={COLOR.GRAY} bold>
                Plan
              </Text>
              <PlanSection plan={plan} />
            </Box>
          </ScrollArea>
        );
      case "context":
        return (
          <ScrollArea height={contentHeight} showScrollbar={true}>
            <Box padding={1} paddingTop={0} gap={1} flexDirection="column">
              <Text color={COLOR.GRAY} bold>
                Context
              </Text>
              <Text dimColor>No context files attached</Text>
            </Box>
          </ScrollArea>
        );
      case "sessions": {
        // Calculate available width for session IDs
        const sidebarWidthPercent = 0.15; // 15% default
        const sidebarWidth = Math.floor(terminalWidth * sidebarWidthPercent);
        const sidebarPadding = 2; // paddingX={1} on both sides
        const containerPadding = 2; // padding={1} on left side
        const scrollbarWidth = 1; // Reserve space for scrollbar
        const maxSessionIdWidth = Math.max(
          10,
          sidebarWidth - sidebarPadding - containerPadding - scrollbarWidth
        );
        return (
          <ScrollArea
            height={contentHeight}
            showScrollbar={true}
            isFocused={focusTarget === "sessions"}
          >
            <Box padding={1} paddingTop={0} gap={1} flexDirection="column">
              <Text color={COLOR.GRAY} bold>
                Sessions
              </Text>
              <SessionsSection
                sessions={sessions}
                currentSessionId={activeSessionId}
                selectedIndex={sessionIndex}
                maxWidth={maxSessionIdWidth}
              />
            </Box>
          </ScrollArea>
        );
      }
      case "agent":
        return (
          <ScrollArea height={contentHeight} showScrollbar={true}>
            <Box padding={1} paddingTop={0} gap={1} flexDirection="column">
              <Text color={COLOR.GRAY} bold>
                Sub-agents
              </Text>
              <AgentsSection currentAgentName={currentAgentName} />
            </Box>
          </ScrollArea>
        );

      default:
        return null;
    }
  }, [
    selectedTab,
    focusTarget,
    contentHeight,
    plan,
    sessions,
    activeSessionId,
    sessionIndex,
    currentAgentName,
    terminalWidth,
  ]);

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
      <Box flexDirection="row" gap={2}>
        {tabs.map((tab) => {
          const isActive = tab.id === selectedTab;
          return (
            <Text key={tab.id} color={isActive ? COLOR.CYAN : COLOR.GRAY} bold={isActive}>
              {isActive ? "▸ " : "  "} {tab.icon}{" "}
            </Text>
          );
        })}
      </Box>
      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {tabContent}
      </Box>
    </Box>
  );
}

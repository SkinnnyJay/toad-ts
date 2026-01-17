import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { PLAN_STATUS } from "@/constants/plan-status";
import { useAppStore } from "@/store/app-store";
import type { Plan, Session, SessionId } from "@/types/domain";
import { Box, Text, useInput, useStdout } from "ink";
import { Tab, Tabs } from "ink-tab";
import { memo, useEffect, useMemo, useState } from "react";
import { FileTree } from "./FileTree";
import { ScrollArea } from "./ScrollArea";

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
  }: {
    sessions: Session[];
    currentSessionId?: SessionId;
    selectedIndex: number;
  }) => {
    if (sessions.length === 0) {
      return <Text dimColor>No sessions</Text>;
    }

    return (
      <Box flexDirection="column" gap={0} width="100%" overflow="hidden" minWidth={0}>
        {sessions.map((session, idx) => {
          const isCurrent = session.id === currentSessionId;
          const isSelected = idx === selectedIndex;
          const label = session.title || session.id;
          return (
            <Text
              key={session.id}
              color={isSelected ? COLOR.CYAN : isCurrent ? COLOR.GREEN : undefined}
              wrap="wrap"
            >
              {isSelected ? "›" : " "} {isCurrent ? "●" : "○"} {label}
            </Text>
          );
        })}
      </Box>
    );
  }
);

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

  // Calculate available height for tab content
  // Account for Sidebar padding (2 lines), tab bar (2 lines), shortcut hint (1 line)
  const availableHeight = height ?? terminalRows - 5;
  const contentHeight = Math.max(10, availableHeight - 3); // Leave space for tab bar

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

  const [activeTab, setActiveTab] = useState("files");
  const [sessionIndex, setSessionIndex] = useState(0);

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

  // Callback for tab change
  const handleTabChange = (name: string) => {
    setActiveTab(name);
  };

  // Handle keyboard input for tab navigation
  useInput((input, key) => {
    const tabs = ["files", "plan", "context", "sessions", "agents"];
    const currentIndex = tabs.indexOf(activeTab);

    // Command + arrow keys for tab navigation
    if (key.meta || key.ctrl) {
      if (key.leftArrow && currentIndex > 0) {
        const prevTab = tabs[currentIndex - 1];
        if (prevTab) setActiveTab(prevTab);
        return;
      }
      if (key.rightArrow && currentIndex < tabs.length - 1) {
        const nextTab = tabs[currentIndex + 1];
        if (nextTab) setActiveTab(nextTab);
        return;
      }

      // Command + 1-5 for direct tab selection
      if (/^[1-5]$/.test(input)) {
        const tabMap: Record<string, string> = {
          "1": "files",
          "2": "plan",
          "3": "context",
          "4": "sessions",
          "5": "agents",
        };
        const tabName = tabMap[input];
        if (tabName) {
          setActiveTab(tabName);
        }
        return;
      }
    }

    // Handle sessions navigation when in sessions tab
    if (activeTab === "sessions" && focusTarget === "sessions" && sessions.length > 0) {
      if (key.upArrow) {
        setSessionIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSessionIndex((prev) => Math.min(sessions.length - 1, prev + 1));
      } else if (key.return) {
        const chosen = sessions[sessionIndex];
        if (chosen) {
          if (onSelectSession) {
            onSelectSession(chosen.id);
          } else {
            useAppStore.getState().setCurrentSession(chosen.id);
          }
        }
      }
    }
  });

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
    >
      <Tabs
        onChange={handleTabChange}
        defaultValue="files"
        showIndex={false}
        keyMap={{ useNumbers: false, useTab: false }}
        isFocused={false}
      >
        <Tab name="files">▤</Tab>
        <Tab name="plan">☰</Tab>
        <Tab name="context">◈</Tab>
        <Tab name="sessions">◉</Tab>
        <Tab name="agents">◆</Tab>
      </Tabs>

      <Box flexDirection="column" height={contentHeight} marginTop={1}>
        {activeTab === "files" && (
          <ScrollArea
            height={contentHeight}
            showScrollbar={true}
            isFocused={focusTarget === "files"}
          >
            <FileTree isFocused={focusTarget === "files"} height={contentHeight} />
          </ScrollArea>
        )}

        {activeTab === "plan" && (
          <ScrollArea height={contentHeight} showScrollbar={true}>
            <PlanSection plan={plan} />
          </ScrollArea>
        )}

        {activeTab === "context" && (
          <Box padding={1}>
            <Text dimColor>No context files attached</Text>
          </Box>
        )}

        {activeTab === "sessions" && (
          <ScrollArea
            height={contentHeight}
            showScrollbar={true}
            isFocused={focusTarget === "sessions"}
          >
            <SessionsSection
              sessions={sessions}
              currentSessionId={activeSessionId}
              selectedIndex={sessionIndex}
            />
          </ScrollArea>
        )}

        {activeTab === "agents" && (
          <Box padding={1}>
            <AgentsSection currentAgentName={currentAgentName} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

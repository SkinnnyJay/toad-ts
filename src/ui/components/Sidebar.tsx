import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { PLAN_STATUS } from "@/constants/plan-status";
import { useAppStore } from "@/store/app-store";
import type { Plan, Session, SessionId } from "@/types/domain";
import { Box, Text, useInput, useStdout } from "ink";
import { useEffect, useMemo, useState } from "react";
import { AccordionSection } from "./AccordionSection";
import { FileTree } from "./FileTree";

interface SidebarProps {
  width?: string | number;
  height?: number;
  currentAgentName?: string;
  currentSessionId?: SessionId;
  onSelectSession?: (sessionId: SessionId) => void;
  focusTarget?: "files" | "plan" | "context" | "sessions" | "agent" | "chat";
}

const PlanSection = ({ plan }: { plan?: Plan }) => {
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
};

const AgentsSection = ({ currentAgentName }: { currentAgentName?: string }) => {
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
};

const SessionsSection = ({
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
};

export function Sidebar({
  width = "25%",
  height,
  currentAgentName,
  currentSessionId,
  onSelectSession,
  focusTarget = "chat",
}: SidebarProps): JSX.Element {
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? 24;

  // Calculate heights: Files 50%, others 12% each
  // Account for Sidebar padding (2 lines), gaps between sections (4 gaps = 4 lines), shortcut hints (5 lines)
  const availableHeight = terminalRows - 2 - 4 - 5; // Subtract padding, gaps, and shortcut hints
  const filesHeight = Math.floor(availableHeight * 0.5);
  const otherSectionHeight = Math.floor(availableHeight * 0.12);
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

  const [planCollapsed, setPlanCollapsed] = useState(false);
  const [agentsCollapsed, setAgentsCollapsed] = useState(false);
  const [filesCollapsed, setFilesCollapsed] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(true);
  const [sessionsCollapsed, setSessionsCollapsed] = useState(true);
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

  // Handle keyboard input: Option+1,2,3,4,5 for collapsing sections
  // Note: Ink doesn't support Option/Alt key directly, so we detect it via escape sequences
  // On macOS terminals, Option+number sends escape sequence like '\x1b1' or '\u001b1'
  useInput((input, key) => {
    // Try to detect Option+number via escape sequences (macOS terminals)
    // Option+1 typically sends '\x1b1' or similar escape sequence
    let optionNumber: string | null = null;
    if (input.length >= 2 && input.charCodeAt(0) === 0x1b) {
      // Escape sequence detected, check if followed by 1-5
      const number = input.slice(1);
      if (/^[1-5]$/.test(number)) {
        optionNumber = number;
      }
    }

    // Also support Shift+number as fallback (more reliable across terminals)
    const shiftNumber = key.shift && /^[1-5]$/.test(input) ? input : null;
    const collapseNumber = optionNumber ?? shiftNumber;

    if (collapseNumber) {
      const collapseMap: Record<string, () => void> = {
        "1": () => setFilesCollapsed((prev) => !prev),
        "2": () => setPlanCollapsed((prev) => !prev),
        "3": () => setContextCollapsed((prev) => !prev),
        "4": () => setSessionsCollapsed((prev) => !prev),
        "5": () => setAgentsCollapsed((prev) => !prev),
      };
      const handler = collapseMap[collapseNumber];
      if (handler) {
        handler();
      }
      return;
    }

    if (focusTarget !== "files" && focusTarget !== "sessions") {
      return;
    }

    if (focusTarget === "sessions" && !sessionsCollapsed && sessions.length > 0) {
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
      gap={2}
    >
      <AccordionSection
        title="Files"
        isCollapsed={filesCollapsed}
        shortcutHint="[⌘1 focus, ⌥1 toggle]"
        height={filesHeight}
      >
        {!filesCollapsed ? (
          <FileTree isFocused={focusTarget === "files"} height={filesHeight - 1} />
        ) : null}
      </AccordionSection>

      <AccordionSection
        title="Plan"
        isCollapsed={planCollapsed}
        shortcutHint="[⌘2 focus, ⌥2 toggle]"
        height={otherSectionHeight}
      >
        {!planCollapsed ? <PlanSection plan={plan} /> : null}
      </AccordionSection>

      <AccordionSection
        title="Context"
        isCollapsed={contextCollapsed}
        shortcutHint="[⌘3 focus, ⌥3 toggle]"
        height={otherSectionHeight}
      >
        {!contextCollapsed ? <Text dimColor>No context files attached</Text> : null}
      </AccordionSection>

      <AccordionSection
        title="Sessions"
        isCollapsed={sessionsCollapsed}
        shortcutHint="[⌘4 focus, ⌥4 toggle]"
        height={otherSectionHeight}
      >
        {!sessionsCollapsed ? (
          <SessionsSection
            sessions={sessions}
            currentSessionId={activeSessionId}
            selectedIndex={sessionIndex}
          />
        ) : null}
      </AccordionSection>

      <AccordionSection
        title="Sub-agents"
        isCollapsed={agentsCollapsed}
        shortcutHint="[⌘5 focus, ⌥5 toggle]"
        height={otherSectionHeight}
      >
        {!agentsCollapsed ? <AgentsSection currentAgentName={currentAgentName} /> : null}
      </AccordionSection>
    </Box>
  );
}

import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { PLAN_STATUS } from "@/constants/plan-status";
import { useAppStore } from "@/store/app-store";
import type { Plan } from "@/types/domain";
import { Box, Text, useInput } from "ink";
import { useMemo, useState } from "react";
import { AccordionSection } from "./AccordionSection";
import { FileTree } from "./FileTree";

interface SidebarProps {
  width?: string;
  currentAgentName?: string;
}

const PlanSection = ({ plan }: { plan?: Plan }) => {
  if (!plan) return <Text dimColor>No plan</Text>;
  const statusIcon =
    plan.status === PLAN_STATUS.COMPLETED ? "✓" : plan.status === PLAN_STATUS.FAILED ? "✗" : "⟳";

  return (
    <Box flexDirection="column" gap={0}>
      <Text>
        {statusIcon} {plan.originalPrompt}
      </Text>
      {plan.tasks.slice(0, LIMIT.SIDEBAR_TASKS_DISPLAY).map((task) => (
        <Text key={task.id} dimColor>
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
  if (!currentAgentName) return <Text dimColor>No agent selected</Text>;
  return (
    <Box flexDirection="column" gap={0}>
      <Text>{currentAgentName}</Text>
    </Box>
  );
};

export function Sidebar({ width = "25%", currentAgentName }: SidebarProps): JSX.Element {
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const plan = useMemo(
    () =>
      currentSessionId ? useAppStore.getState().getPlanBySession(currentSessionId) : undefined,
    [currentSessionId]
  );

  const [planCollapsed, setPlanCollapsed] = useState(false);
  const [agentsCollapsed, setAgentsCollapsed] = useState(false);
  const [filesCollapsed, setFilesCollapsed] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(true);
  const [sessionsCollapsed, setSessionsCollapsed] = useState(true);

  // Handle keyboard input for toggling sections: 1=Files, 2=Plan, 3=Context, 4=Sessions
  useInput((input) => {
    if (input === "1") {
      setFilesCollapsed((prev) => !prev);
    } else if (input === "2") {
      setPlanCollapsed((prev) => !prev);
    } else if (input === "3") {
      setContextCollapsed((prev) => !prev);
    } else if (input === "4") {
      setSessionsCollapsed((prev) => !prev);
    } else if (input === "a" || input === "A") {
      setAgentsCollapsed((prev) => !prev);
    }
  });

  return (
    <Box
      width={width}
      flexDirection="column"
      borderStyle="single"
      borderColor={COLOR.GRAY}
      paddingX={1}
      paddingY={1}
      gap={1}
      height="100%"
    >
      <AccordionSection title="Files" isCollapsed={filesCollapsed} shortcutHint="[1]">
        {!filesCollapsed ? <FileTree isFocused={!filesCollapsed} /> : null}
      </AccordionSection>

      <AccordionSection title="Plan" isCollapsed={planCollapsed} shortcutHint="[2]">
        {!planCollapsed ? <PlanSection plan={plan} /> : null}
      </AccordionSection>

      <AccordionSection title="Context" isCollapsed={contextCollapsed} shortcutHint="[3]">
        {!contextCollapsed ? <Text dimColor>No context files attached</Text> : null}
      </AccordionSection>

      <AccordionSection title="Sessions" isCollapsed={sessionsCollapsed} shortcutHint="[4]">
        {!sessionsCollapsed ? <Text dimColor>Press Ctrl+S to switch sessions</Text> : null}
      </AccordionSection>

      <AccordionSection title="Agent" isCollapsed={agentsCollapsed} shortcutHint="[A]">
        {!agentsCollapsed ? <AgentsSection currentAgentName={currentAgentName} /> : null}
      </AccordionSection>
    </Box>
  );
}

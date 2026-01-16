import { COLOR } from "@/constants/colors";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { PLAN_STATUS } from "@/constants/plan-status";
import { TASK_STATUS } from "@/constants/task-status";
import type { Plan, PlanId, Task } from "@/types/domain";
import { statusColor } from "@/ui/status-colors";
import { Box, Text, useInput } from "ink";
import { useCallback, useState } from "react";

export interface PlanApprovalPanelProps {
  plan: Plan;
  onApprove: (planId: PlanId) => void;
  onDeny: (planId: PlanId) => void;
  onModifyTask?: (taskId: string, action: "approve" | "deny" | "skip") => void;
  autoApprove?: boolean;
  showTaskDetails?: boolean;
}

const taskStatusIcon = (status: Task["status"]): string => {
  switch (status) {
    case TASK_STATUS.PENDING:
      return "○";
    case TASK_STATUS.ASSIGNED:
      return "◑";
    case TASK_STATUS.RUNNING:
      return "⟳";
    case TASK_STATUS.COMPLETED:
      return "✓";
    case TASK_STATUS.FAILED:
      return "✗";
    case TASK_STATUS.BLOCKED:
      return "⊘";
    default:
      return "?";
  }
};

export function PlanApprovalPanel({
  plan,
  onApprove,
  onDeny,
  onModifyTask,
  autoApprove = false,
  showTaskDetails = true,
}: PlanApprovalPanelProps): JSX.Element {
  const [decision, setDecision] = useState<"approved" | "denied" | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [taskDecisions, setTaskDecisions] = useState<Map<string, "approve" | "deny" | "skip">>(
    new Map()
  );

  const handleApprove = useCallback(() => {
    if (decision) return;
    setDecision("approved");
    onApprove(plan.id);
  }, [decision, plan.id, onApprove]);

  const handleDeny = useCallback(() => {
    if (decision) return;
    setDecision("denied");
    onDeny(plan.id);
  }, [decision, plan.id, onDeny]);

  const handleTaskAction = useCallback(
    (taskId: string, action: "approve" | "deny" | "skip") => {
      setTaskDecisions((prev) => new Map(prev).set(taskId, action));
      onModifyTask?.(taskId, action);
    },
    [onModifyTask]
  );

  // Handle keyboard input
  useInput((input, key) => {
    // Only handle input if plan is in planning state and not yet decided
    if (plan.status !== PLAN_STATUS.PLANNING || decision) return;

    // Navigate through tasks
    if (showTaskDetails && plan.tasks.length > 0) {
      if (key.upArrow) {
        setSelectedTaskIndex((prev) => (prev > 0 ? prev - 1 : plan.tasks.length - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedTaskIndex((prev) => (prev < plan.tasks.length - 1 ? prev + 1 : 0));
        return;
      }

      // Task-specific actions
      const currentTask = plan.tasks[selectedTaskIndex];
      if (currentTask) {
        if (input === KEYBOARD_INPUT.APPROVE_LOWER || input === KEYBOARD_INPUT.APPROVE_UPPER) {
          handleTaskAction(currentTask.id, "approve");
          return;
        }
        if (input === KEYBOARD_INPUT.DENY_LOWER || input === KEYBOARD_INPUT.DENY_UPPER) {
          handleTaskAction(currentTask.id, "deny");
          return;
        }
        if (input === KEYBOARD_INPUT.SKIP_LOWER || input === KEYBOARD_INPUT.SKIP_UPPER) {
          handleTaskAction(currentTask.id, "skip");
          return;
        }
      }
    }

    // Plan-level actions
    if (input === KEYBOARD_INPUT.YES_LOWER || input === KEYBOARD_INPUT.YES_UPPER || key.return) {
      handleApprove();
    } else if (
      input === KEYBOARD_INPUT.NO_LOWER ||
      input === KEYBOARD_INPUT.NO_UPPER ||
      key.escape
    ) {
      handleDeny();
    }
  });

  // Auto-approve if enabled
  if (autoApprove && plan.status === PLAN_STATUS.PLANNING && !decision) {
    handleApprove();
  }

  const isAwaitingApproval = plan.status === PLAN_STATUS.PLANNING && !decision;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isAwaitingApproval ? COLOR.YELLOW : COLOR.CYAN}
      padding={1}
    >
      {/* Plan header */}
      <Box flexDirection="row" gap={1}>
        {isAwaitingApproval && <Text color={COLOR.YELLOW}>⚠</Text>}
        <Text bold color={statusColor(plan.status)}>
          Plan: {plan.originalPrompt}
        </Text>
        {decision && (
          <Text color={decision === "approved" ? COLOR.GREEN : COLOR.RED}>({decision})</Text>
        )}
      </Box>

      {/* Status */}
      <Text color={statusColor(plan.status)}>Status: {plan.status}</Text>

      {/* Tasks */}
      {showTaskDetails && plan.tasks.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan">Tasks:</Text>
          {plan.tasks.map((task, index) => {
            const taskDecision = taskDecisions.get(task.id);
            const isSelected = index === selectedTaskIndex && isAwaitingApproval;

            return (
              <Box key={task.id} paddingLeft={1}>
                <Text color={isSelected ? "yellow" : statusColor(task.status)}>
                  {isSelected ? "▶ " : "  "}
                  {taskStatusIcon(task.status)} {task.title}
                  {taskDecision && (
                    <Text
                      color={
                        taskDecision === "approve"
                          ? "green"
                          : taskDecision === "deny"
                            ? "red"
                            : "gray"
                      }
                    >
                      {" "}
                      [{taskDecision}]
                    </Text>
                  )}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Dependencies visualization */}
      {showTaskDetails && plan.tasks.some((t) => t.dependencies.length > 0) && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor color={COLOR.GRAY}>
            Dependencies:
          </Text>
          {plan.tasks
            .filter((t) => t.dependencies.length > 0)
            .map((task) => (
              <Box key={task.id} paddingLeft={1}>
                <Text color={COLOR.GRAY} dimColor>
                  {task.title} → {task.dependencies.join(", ")}
                </Text>
              </Box>
            ))}
        </Box>
      )}

      {/* Approval prompt */}
      {isAwaitingApproval && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow" bold>
            Review and approve this plan?
          </Text>
          <Box flexDirection="row" gap={2}>
            <Text color="green">[Y]es/Enter - Approve plan</Text>
            <Text color="red">[N]o/Esc - Deny plan</Text>
          </Box>
          {showTaskDetails && plan.tasks.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="cyan">Task controls:</Text>
              <Box paddingLeft={1} flexDirection="row" gap={2}>
                <Text color="gray">↑↓ Navigate</Text>
                <Text color="green">[A]pprove</Text>
                <Text color="red">[D]eny</Text>
                <Text color="gray">[S]kip</Text>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Execution progress */}
      {plan.status === PLAN_STATUS.EXECUTING && (
        <Box marginTop={1}>
          <Text color={COLOR.BLUE}>
            ⟳ Executing... {plan.tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length}/
            {plan.tasks.length} tasks completed
          </Text>
        </Box>
      )}

      {/* Completion summary */}
      {(plan.status === PLAN_STATUS.COMPLETED || plan.status === PLAN_STATUS.FAILED) && (
        <Box marginTop={1} flexDirection="column">
          <Text color={plan.status === PLAN_STATUS.COMPLETED ? COLOR.GREEN : COLOR.RED} bold>
            {plan.status === PLAN_STATUS.COMPLETED ? "✓ Plan completed" : "✗ Plan failed"}
          </Text>
          {plan.tasks.length > 0 && (
            <Text color={COLOR.GRAY}>
              Completed: {plan.tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length} |
              Failed: {plan.tasks.filter((t) => t.status === TASK_STATUS.FAILED).length} | Blocked:{" "}
              {plan.tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

import { COLOR } from "@/constants/colors";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { PLAN_STATUS } from "@/constants/plan-status";
import { TASK_STATUS } from "@/constants/task-status";
import type { Plan, PlanId, Task } from "@/types/domain";
import { statusColor } from "@/ui/status-colors";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
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
  useKeyboard((key) => {
    // Only handle input if plan is in planning state and not yet decided
    if (plan.status !== PLAN_STATUS.PLANNING || decision) return;

    // Navigate through tasks
    if (showTaskDetails && plan.tasks.length > 0) {
      if (key.name === "up") {
        key.preventDefault();
        key.stopPropagation();
        setSelectedTaskIndex((prev) => (prev > 0 ? prev - 1 : plan.tasks.length - 1));
        return;
      }
      if (key.name === "down") {
        key.preventDefault();
        key.stopPropagation();
        setSelectedTaskIndex((prev) => (prev < plan.tasks.length - 1 ? prev + 1 : 0));
        return;
      }

      // Task-specific actions
      const currentTask = plan.tasks[selectedTaskIndex];
      if (currentTask) {
        if (key.name === KEYBOARD_INPUT.APPROVE_LOWER) {
          key.preventDefault();
          key.stopPropagation();
          handleTaskAction(currentTask.id, "approve");
          return;
        }
        if (key.name === KEYBOARD_INPUT.DENY_LOWER) {
          key.preventDefault();
          key.stopPropagation();
          handleTaskAction(currentTask.id, "deny");
          return;
        }
        if (key.name === KEYBOARD_INPUT.SKIP_LOWER) {
          key.preventDefault();
          key.stopPropagation();
          handleTaskAction(currentTask.id, "skip");
          return;
        }
      }
    }

    // Plan-level actions
    if (
      key.name === KEYBOARD_INPUT.YES_LOWER ||
      key.name === "return" ||
      key.name === "linefeed"
    ) {
      key.preventDefault();
      key.stopPropagation();
      handleApprove();
    } else if (key.name === KEYBOARD_INPUT.NO_LOWER || key.name === "escape") {
      key.preventDefault();
      key.stopPropagation();
      handleDeny();
    }
  });

  // Auto-approve if enabled
  if (autoApprove && plan.status === PLAN_STATUS.PLANNING && !decision) {
    handleApprove();
  }

  const isAwaitingApproval = plan.status === PLAN_STATUS.PLANNING && !decision;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="rounded"
      borderColor={isAwaitingApproval ? COLOR.YELLOW : COLOR.CYAN}
      padding={1}
    >
      <box flexDirection="row" gap={1}>
        {isAwaitingApproval && <text fg={COLOR.YELLOW}>⚠</text>}
        <text fg={statusColor(plan.status)} attributes={TextAttributes.BOLD}>
          Plan: {plan.originalPrompt}
        </text>
        {decision && (
          <text fg={decision === "approved" ? COLOR.GREEN : COLOR.RED}>({decision})</text>
        )}
      </box>

      <text fg={statusColor(plan.status)}>Status: {plan.status}</text>

      {showTaskDetails && plan.tasks.length > 0 && (
        <box flexDirection="column" marginTop={1}>
          <text fg={COLOR.CYAN}>Tasks:</text>
          {plan.tasks.map((task, index) => {
            const taskDecision = taskDecisions.get(task.id);
            const isSelected = index === selectedTaskIndex && isAwaitingApproval;

            return (
              <box key={task.id} paddingLeft={1}>
                <text fg={isSelected ? COLOR.YELLOW : statusColor(task.status)}>
                  {isSelected ? "▶ " : "  "}
                  {taskStatusIcon(task.status)} {task.title}
                  {taskDecision && (
                    <span
                      fg={
                        taskDecision === "approve"
                          ? COLOR.GREEN
                          : taskDecision === "deny"
                            ? COLOR.RED
                            : COLOR.GRAY
                      }
                    >
                      {" "}
                      [{taskDecision}]
                    </span>
                  )}
                </text>
              </box>
            );
          })}
        </box>
      )}

      {showTaskDetails && plan.tasks.some((t) => t.dependencies.length > 0) && (
        <box flexDirection="column" marginTop={1}>
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            Dependencies:
          </text>
          {plan.tasks
            .filter((t) => t.dependencies.length > 0)
            .map((task) => (
              <box key={task.id} paddingLeft={1}>
                <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
                  {task.title} → {task.dependencies.join(", ")}
                </text>
              </box>
            ))}
        </box>
      )}

      {isAwaitingApproval && (
        <box marginTop={1} flexDirection="column">
          <text fg={COLOR.YELLOW} attributes={TextAttributes.BOLD}>
            Review and approve this plan?
          </text>
          <box flexDirection="row" gap={2}>
            <text fg={COLOR.GREEN}>[Y]es/Enter - Approve plan</text>
            <text fg={COLOR.RED}>[N]o/Esc - Deny plan</text>
          </box>
          {showTaskDetails && plan.tasks.length > 0 && (
            <box flexDirection="column" marginTop={1}>
              <text fg={COLOR.CYAN}>Task controls:</text>
              <box paddingLeft={1} flexDirection="row" gap={2}>
                <text fg={COLOR.GRAY}>↑↓ Navigate</text>
                <text fg={COLOR.GREEN}>[A]pprove</text>
                <text fg={COLOR.RED}>[D]eny</text>
                <text fg={COLOR.GRAY}>[S]kip</text>
              </box>
            </box>
          )}
        </box>
      )}

      {plan.status === PLAN_STATUS.EXECUTING && (
        <box marginTop={1}>
          <text fg={COLOR.BLUE}>
            ⟳ Executing… {plan.tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length}/
            {plan.tasks.length} tasks completed
          </text>
        </box>
      )}

      {(plan.status === PLAN_STATUS.COMPLETED || plan.status === PLAN_STATUS.FAILED) && (
        <box marginTop={1} flexDirection="column">
          <text
            fg={plan.status === PLAN_STATUS.COMPLETED ? COLOR.GREEN : COLOR.RED}
            attributes={TextAttributes.BOLD}
          >
            {plan.status === PLAN_STATUS.COMPLETED ? "✓ Plan completed" : "✗ Plan failed"}
          </text>
          {plan.tasks.length > 0 && (
            <text fg={COLOR.GRAY}>
              Completed: {plan.tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length} |
              Failed: {plan.tasks.filter((t) => t.status === TASK_STATUS.FAILED).length} | Blocked:{" "}
              {plan.tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length}
            </text>
          )}
        </box>
      )}
    </box>
  );
}

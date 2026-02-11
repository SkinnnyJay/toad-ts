import { APPROVAL_DECISION, type ApprovalDecision } from "@/constants/approval-decisions";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { PLAN_STATUS } from "@/constants/plan-status";
import { TASK_DECISION, type TaskDecision } from "@/constants/task-decisions";
import { TASK_STATUS } from "@/constants/task-status";
import type { UiSymbols } from "@/constants/ui-symbols";
import type { Plan, PlanId, Task } from "@/types/domain";
import { useUiSymbols } from "@/ui/hooks/useUiSymbols";
import { statusColor } from "@/ui/status-colors";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useCallback, useState } from "react";

export interface PlanApprovalPanelProps {
  plan: Plan;
  onApprove: (planId: PlanId) => void;
  onDeny: (planId: PlanId) => void;
  onModifyTask?: (taskId: string, action: TaskDecision) => void;
  autoApprove?: boolean;
  showTaskDetails?: boolean;
}

const taskStatusIcon = (status: Task["status"], symbols: UiSymbols): string => {
  switch (status) {
    case TASK_STATUS.PENDING:
      return symbols.DOT_EMPTY;
    case TASK_STATUS.ASSIGNED:
      return symbols.HALF;
    case TASK_STATUS.RUNNING:
      return symbols.SPINNER;
    case TASK_STATUS.COMPLETED:
      return symbols.CHECK;
    case TASK_STATUS.FAILED:
      return symbols.CROSS;
    case TASK_STATUS.BLOCKED:
      return symbols.BLOCKED;
    default:
      return symbols.UNKNOWN;
  }
};

export function PlanApprovalPanel({
  plan,
  onApprove,
  onDeny,
  onModifyTask,
  autoApprove = false,
  showTaskDetails = true,
}: PlanApprovalPanelProps): ReactNode {
  const symbols = useUiSymbols();
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [taskDecisions, setTaskDecisions] = useState<Map<string, TaskDecision>>(new Map());

  const handleApprove = useCallback(() => {
    if (decision) return;
    setDecision(APPROVAL_DECISION.APPROVED);
    onApprove(plan.id);
  }, [decision, plan.id, onApprove]);

  const handleDeny = useCallback(() => {
    if (decision) return;
    setDecision(APPROVAL_DECISION.DENIED);
    onDeny(plan.id);
  }, [decision, plan.id, onDeny]);

  const handleTaskAction = useCallback(
    (taskId: string, action: TaskDecision) => {
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
      if (key.name === KEY_NAME.UP) {
        key.preventDefault();
        key.stopPropagation();
        setSelectedTaskIndex((prev) => (prev > 0 ? prev - 1 : plan.tasks.length - 1));
        return;
      }
      if (key.name === KEY_NAME.DOWN) {
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
          handleTaskAction(currentTask.id, TASK_DECISION.APPROVE);
          return;
        }
        if (key.name === KEYBOARD_INPUT.DENY_LOWER) {
          key.preventDefault();
          key.stopPropagation();
          handleTaskAction(currentTask.id, TASK_DECISION.DENY);
          return;
        }
        if (key.name === KEYBOARD_INPUT.SKIP_LOWER) {
          key.preventDefault();
          key.stopPropagation();
          handleTaskAction(currentTask.id, TASK_DECISION.SKIP);
          return;
        }
      }
    }

    // Plan-level actions
    if (
      key.name === KEYBOARD_INPUT.YES_LOWER ||
      key.name === KEY_NAME.RETURN ||
      key.name === KEY_NAME.LINEFEED
    ) {
      key.preventDefault();
      key.stopPropagation();
      handleApprove();
    } else if (key.name === KEYBOARD_INPUT.NO_LOWER || key.name === KEY_NAME.ESCAPE) {
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
          <text
            fg={decision === APPROVAL_DECISION.APPROVED ? COLOR.GREEN : COLOR.RED}
          >{`(${decision})`}</text>
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
                  {taskStatusIcon(task.status, symbols)} {task.title}
                  {taskDecision && (
                    <span
                      fg={
                        taskDecision === TASK_DECISION.APPROVE
                          ? COLOR.GREEN
                          : taskDecision === TASK_DECISION.DENY
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
            {symbols.SPINNER} Executing{symbols.ELLIPSIS}{" "}
            {plan.tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length}/
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
            {plan.status === PLAN_STATUS.COMPLETED
              ? `${symbols.CHECK} Plan completed`
              : `${symbols.CROSS} Plan failed`}
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

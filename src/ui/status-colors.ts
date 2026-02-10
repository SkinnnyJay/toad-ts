import { COLOR, type Color } from "@/constants/colors";
import { PLAN_STATUS } from "@/constants/plan-status";
import { TASK_STATUS } from "@/constants/task-status";
import type { Plan, Task } from "@/types/domain";

/**
 * Maps plan status to color for UI display
 */
export const planStatusColor = (status: Plan["status"]): Color => {
  switch (status) {
    case PLAN_STATUS.PLANNING:
      return COLOR.YELLOW;
    case PLAN_STATUS.EXECUTING:
      return COLOR.BLUE;
    case PLAN_STATUS.COMPLETED:
      return COLOR.GREEN;
    case PLAN_STATUS.FAILED:
      return COLOR.RED;
    default:
      return COLOR.GRAY;
  }
};

/**
 * Maps task status to color for UI display
 */
export const taskStatusColor = (status: Task["status"]): Color => {
  switch (status) {
    case TASK_STATUS.PENDING:
    case TASK_STATUS.ASSIGNED:
    case TASK_STATUS.BLOCKED:
      return COLOR.GRAY;
    case TASK_STATUS.RUNNING:
      return COLOR.BLUE;
    case TASK_STATUS.COMPLETED:
      return COLOR.GREEN;
    case TASK_STATUS.FAILED:
      return COLOR.RED;
    default:
      return COLOR.WHITE;
  }
};

const isPlanStatus = (status: Plan["status"] | Task["status"]): status is Plan["status"] =>
  status === PLAN_STATUS.PLANNING ||
  status === PLAN_STATUS.EXECUTING ||
  status === PLAN_STATUS.COMPLETED ||
  status === PLAN_STATUS.FAILED;

/**
 * Maps plan or task status to color for UI display
 * Handles both plan and task statuses
 */
export const statusColor = (status: Plan["status"] | Task["status"]): Color => {
  return isPlanStatus(status) ? planStatusColor(status) : taskStatusColor(status);
};

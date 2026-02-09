import { COLOR } from "@/constants/colors";
import type { Plan } from "@/types/domain";
import { planStatusColor } from "@/ui/status-colors";
import { TextAttributes } from "@opentui/core";

export interface PlanPanelProps {
  plan: Plan;
}

export function PlanPanel({ plan }: PlanPanelProps): JSX.Element {
  return (
    <box flexDirection="column" border={true} borderStyle="rounded" borderColor={COLOR.CYAN} padding={1}>
      <text fg={planStatusColor(plan.status)}>
        Plan: {plan.originalPrompt} · Status: {plan.status}
      </text>
      {plan.tasks.length === 0 ? (
        <text attributes={TextAttributes.DIM}>No tasks</text>
      ) : (
        plan.tasks.map((task) => (
          <text key={task.id}>
            [{task.status}] {task.title}
          </text>
        ))
      )}
    </box>
  );
}

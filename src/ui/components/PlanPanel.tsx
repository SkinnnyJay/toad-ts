import { COLOR } from "@/constants/colors";
import type { Plan } from "@/types/domain";
import { planStatusColor } from "@/ui/status-colors";
import { Box, Text } from "ink";

export interface PlanPanelProps {
  plan: Plan;
}

export function PlanPanel({ plan }: PlanPanelProps): JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={COLOR.CYAN} padding={1}>
      <Text color={planStatusColor(plan.status)}>
        Plan: {plan.originalPrompt} · Status: {plan.status}
      </Text>
      {plan.tasks.length === 0 ? (
        <Text dimColor>No tasks</Text>
      ) : (
        plan.tasks.map((task) => (
          <Text key={task.id}>
            [{task.status}] {task.title}
          </Text>
        ))
      )}
    </Box>
  );
}

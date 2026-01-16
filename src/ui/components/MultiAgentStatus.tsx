import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { TASK_STATUS } from "@/constants/task-status";
import type { Plan, SubAgent } from "@/types/domain";
import { Box, Text } from "ink";

interface MultiAgentStatusProps {
  plan: Plan;
  agents: SubAgent[];
}

export function MultiAgentStatus({ plan, agents }: MultiAgentStatusProps): JSX.Element {
  const completedTasks = plan.tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
  const totalTasks = plan.tasks.length;
  const activeAgents = agents.filter((a) => a.status === "working").length;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLOR.CYAN}
      padding={1}
      marginY={1}
    >
      <Text bold color={COLOR.CYAN}>
        Multi-Agent Plan: {plan.originalPrompt.slice(0, LIMIT.STRING_TRUNCATE_MEDIUM)}
        {plan.originalPrompt.length > LIMIT.STRING_TRUNCATE_MEDIUM ? "..." : ""}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>
          Status: <Text color={COLOR.YELLOW}>{plan.status}</Text> | Tasks:{" "}
          <Text color={COLOR.GREEN}>
            {completedTasks}/{totalTasks}
          </Text>{" "}
          | Active Agents: <Text color={COLOR.BLUE}>{activeAgents}</Text>
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {plan.tasks.map((task) => {
            const assignedAgent = agents.find((a) => a.currentTaskId === task.id);
            const statusColor =
              task.status === TASK_STATUS.COMPLETED
                ? COLOR.GREEN
                : task.status === TASK_STATUS.FAILED
                  ? COLOR.RED
                  : task.status === TASK_STATUS.RUNNING
                    ? COLOR.YELLOW
                    : COLOR.GRAY;

            return (
              <Box key={task.id} flexDirection="row" marginY={0}>
                <Text color={statusColor}>
                  {task.status === TASK_STATUS.COMPLETED
                    ? "✓"
                    : task.status === TASK_STATUS.FAILED
                      ? "✗"
                      : "○"}{" "}
                </Text>
                <Text>
                  {task.title}
                  {assignedAgent && (
                    <Text color={COLOR.GRAY}>
                      {" "}
                      (Agent: {assignedAgent.id.slice(0, LIMIT.ID_TRUNCATE_LENGTH)})
                    </Text>
                  )}
                </Text>
              </Box>
            );
          })}
        </Box>
        {agents.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Agents:</Text>
            {agents.map((agent) => {
              const statusColor =
                agent.status === "working"
                  ? COLOR.GREEN
                  : agent.status === "error"
                    ? COLOR.RED
                    : agent.status === "waiting"
                      ? COLOR.YELLOW
                      : COLOR.GRAY;

              return (
                <Text key={agent.id} color={statusColor}>
                  • Agent {agent.id.slice(0, LIMIT.ID_TRUNCATE_LENGTH)}: {agent.status} (
                  {agent.connectionStatus})
                  {agent.currentTaskId && (
                    <Text color={COLOR.GRAY}>
                      {" "}
                      - Task: {agent.currentTaskId.slice(0, LIMIT.ID_TRUNCATE_LENGTH)}
                    </Text>
                  )}
                </Text>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

import type { Plan, SubAgent } from "@/types/domain";
import { Box, Text } from "ink";

interface MultiAgentStatusProps {
  plan: Plan;
  agents: SubAgent[];
}

export function MultiAgentStatus({ plan, agents }: MultiAgentStatusProps): JSX.Element {
  const completedTasks = plan.tasks.filter((t) => t.status === "completed").length;
  const totalTasks = plan.tasks.length;
  const activeAgents = agents.filter((a) => a.status === "working").length;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1} marginY={1}>
      <Text bold color="cyan">
        Multi-Agent Plan: {plan.originalPrompt.slice(0, 50)}
        {plan.originalPrompt.length > 50 ? "..." : ""}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>
          Status: <Text color="yellow">{plan.status}</Text> | Tasks:{" "}
          <Text color="green">
            {completedTasks}/{totalTasks}
          </Text>{" "}
          | Active Agents: <Text color="blue">{activeAgents}</Text>
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {plan.tasks.map((task) => {
            const assignedAgent = agents.find((a) => a.currentTaskId === task.id);
            const statusColor =
              task.status === "completed"
                ? "green"
                : task.status === "failed"
                  ? "red"
                  : task.status === "running"
                    ? "yellow"
                    : "gray";

            return (
              <Box key={task.id} flexDirection="row" marginY={0}>
                <Text color={statusColor}>
                  {task.status === "completed" ? "✓" : task.status === "failed" ? "✗" : "○"}{" "}
                </Text>
                <Text>
                  {task.title}
                  {assignedAgent && (
                    <Text color="gray"> (Agent: {assignedAgent.id.slice(0, 8)})</Text>
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
                  ? "green"
                  : agent.status === "error"
                    ? "red"
                    : agent.status === "waiting"
                      ? "yellow"
                      : "gray";

              return (
                <Text key={agent.id} color={statusColor}>
                  • Agent {agent.id.slice(0, 8)}: {agent.status} ({agent.connectionStatus})
                  {agent.currentTaskId && (
                    <Text color="gray"> - Task: {agent.currentTaskId.slice(0, 8)}</Text>
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

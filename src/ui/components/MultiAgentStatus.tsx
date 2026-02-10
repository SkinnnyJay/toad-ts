import { LIMIT } from "@/config/limits";
import { AGENT_STATUS } from "@/constants/agent-status";
import { COLOR } from "@/constants/colors";
import { TASK_STATUS } from "@/constants/task-status";
import type { Plan, SubAgent } from "@/types/domain";
import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";

interface MultiAgentStatusProps {
  plan: Plan;
  agents: SubAgent[];
}

export function MultiAgentStatus({ plan, agents }: MultiAgentStatusProps): ReactNode {
  const completedTasks = plan.tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
  const totalTasks = plan.tasks.length;
  const activeAgents = agents.filter((a) => a.status === AGENT_STATUS.WORKING).length;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="single"
      borderColor={COLOR.CYAN}
      padding={1}
      marginTop={1}
      marginBottom={1}
    >
      <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
        Multi-Agent Plan: {plan.originalPrompt.slice(0, LIMIT.STRING_TRUNCATE_MEDIUM)}
        {plan.originalPrompt.length > LIMIT.STRING_TRUNCATE_MEDIUM ? "…" : ""}
      </text>
      <box flexDirection="column" marginTop={1}>
        <text>
          Status: <span fg={COLOR.YELLOW}>{plan.status}</span> | Tasks:{" "}
          <span fg={COLOR.GREEN}>
            {completedTasks}/{totalTasks}
          </span>{" "}
          | Active Agents: <span fg={COLOR.BLUE}>{activeAgents}</span>
        </text>
        <box flexDirection="column" marginTop={1}>
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
              <box key={task.id} flexDirection="row" marginTop={0} marginBottom={0}>
                <text fg={statusColor}>
                  {task.status === TASK_STATUS.COMPLETED
                    ? "✓"
                    : task.status === TASK_STATUS.FAILED
                      ? "✗"
                      : "○"}{" "}
                </text>
                <text>
                  {task.title}
                  {assignedAgent && (
                    <span fg={COLOR.GRAY}>
                      {" "}
                      (Agent: {assignedAgent.id.slice(0, LIMIT.ID_TRUNCATE_LENGTH)})
                    </span>
                  )}
                </text>
              </box>
            );
          })}
        </box>
        {agents.length > 0 && (
          <box flexDirection="column" marginTop={1}>
            <text attributes={TextAttributes.BOLD}>Agents:</text>
            {agents.map((agent) => {
              const statusColor =
                agent.status === AGENT_STATUS.WORKING
                  ? COLOR.GREEN
                  : agent.status === AGENT_STATUS.ERROR
                    ? COLOR.RED
                    : agent.status === AGENT_STATUS.WAITING
                      ? COLOR.YELLOW
                      : COLOR.GRAY;

              return (
                <text key={agent.id} fg={statusColor}>
                  • Agent {agent.id.slice(0, LIMIT.ID_TRUNCATE_LENGTH)}: {agent.status} (
                  {agent.connectionStatus})
                  {agent.currentTaskId && (
                    <span fg={COLOR.GRAY}>
                      {" "}
                      - Task: {agent.currentTaskId.slice(0, LIMIT.ID_TRUNCATE_LENGTH)}
                    </span>
                  )}
                </text>
              );
            })}
          </box>
        )}
      </box>
    </box>
  );
}

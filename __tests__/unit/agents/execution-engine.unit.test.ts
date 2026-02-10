import type { AgentInfo } from "@/agents/agent-manager";
import { ExecutionEngine } from "@/agents/execution-engine";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { AGENT_STATUS } from "@/constants/agent-status";
import { PLAN_STATUS } from "@/constants/plan-status";
import { TASK_STATUS } from "@/constants/task-status";
import { useAppStore } from "@/store/app-store";
import { AgentIdSchema, PlanIdSchema, SessionIdSchema, TaskIdSchema } from "@/types/domain";
import { describe, expect, it, vi } from "vitest";

describe("ExecutionEngine", () => {
  it("executes pending tasks with subagents", async () => {
    const store = useAppStore.getState();
    store.reset();

    const sessionId = SessionIdSchema.parse("s-exec");
    store.upsertSession({
      session: {
        id: sessionId,
        agentId: AgentIdSchema.parse("mock"),
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });

    const planId = PlanIdSchema.parse("plan-exec");
    const taskId = TaskIdSchema.parse("task-exec");
    store.upsertPlan({
      id: planId,
      sessionId,
      originalPrompt: "Execute plan",
      tasks: [
        {
          id: taskId,
          planId,
          title: "Task 1",
          description: "Do work",
          status: TASK_STATUS.PENDING,
          dependencies: [],
          createdAt: 0,
        },
      ],
      status: PLAN_STATUS.EXECUTING,
      createdAt: 0,
      updatedAt: 0,
    });

    const agentInfo: AgentInfo = {
      id: AgentIdSchema.parse("mock:build"),
      harnessId: "mock",
      name: "Mock Build",
    };
    const agentInfoMap = new Map([[agentInfo.id, agentInfo]]);

    const subAgentRunner: SubAgentRunner = {
      run: vi.fn(async () => SessionIdSchema.parse("child-session")),
    } as SubAgentRunner;

    const engine = new ExecutionEngine({
      store: useAppStore,
      subAgentRunner,
      agentInfoMap,
      now: () => 1000,
    });

    await engine.runPlan(planId);

    const plan = store.getPlanBySession(sessionId);
    expect(plan?.status).toBe(PLAN_STATUS.COMPLETED);
    expect(plan?.tasks[0]?.status).toBe(TASK_STATUS.COMPLETED);

    const subAgents = store.getSubAgentsByPlan(planId);
    expect(subAgents).toHaveLength(1);
    expect(subAgents[0]?.status).toBe(AGENT_STATUS.COMPLETED);
  });
});

import { describe, expect, it } from "vitest";

import { createRoutingPolicy } from "@/agents/agent-routing";
import { SESSION_MODE } from "@/constants/session-modes";
import { TASK_STATUS } from "@/constants/task-status";
import {
  AgentIdSchema,
  PlanIdSchema,
  SessionIdSchema,
  SessionSchema,
  TaskIdSchema,
  TaskSchema,
} from "@/types/domain";

describe("createRoutingPolicy", () => {
  it("routes tasks to matching agents", () => {
    const defaultAgent = {
      id: AgentIdSchema.parse("mock"),
      harnessId: "mock",
      name: "Mock Agent",
    };
    const buildAgent = {
      id: AgentIdSchema.parse("mock:build"),
      harnessId: "mock",
      name: "Build Agent",
    };
    const agentInfoMap = new Map([
      [defaultAgent.id, defaultAgent],
      [buildAgent.id, buildAgent],
    ]);
    const session = SessionSchema.parse({
      id: SessionIdSchema.parse("session-1"),
      title: "Session",
      agentId: defaultAgent.id,
      messageIds: [],
      createdAt: 0,
      updatedAt: 0,
      metadata: { mcpServers: [] },
      mode: SESSION_MODE.AUTO,
    });
    const task = TaskSchema.parse({
      id: TaskIdSchema.parse("task-1"),
      planId: PlanIdSchema.parse("plan-1"),
      title: "Run build",
      description: "build assets",
      status: TASK_STATUS.PENDING,
      dependencies: [],
      createdAt: 0,
    });

    const policy = createRoutingPolicy([{ matcher: "build", agentId: "mock:build" }], agentInfoMap);
    const selected = policy.selectAgent({ session, task, agents: [defaultAgent, buildAgent] });

    expect(selected?.id).toBe(buildAgent.id);
  });

  it("falls back to default routing when rule is invalid", () => {
    const defaultAgent = {
      id: AgentIdSchema.parse("mock"),
      harnessId: "mock",
      name: "Mock Agent",
    };
    const agentInfoMap = new Map([[defaultAgent.id, defaultAgent]]);
    const session = SessionSchema.parse({
      id: SessionIdSchema.parse("session-2"),
      title: "Session",
      agentId: defaultAgent.id,
      messageIds: [],
      createdAt: 0,
      updatedAt: 0,
      metadata: { mcpServers: [] },
      mode: SESSION_MODE.AUTO,
    });
    const task = TaskSchema.parse({
      id: TaskIdSchema.parse("task-2"),
      planId: PlanIdSchema.parse("plan-2"),
      title: "Lint",
      description: "lint code",
      status: TASK_STATUS.PENDING,
      dependencies: [],
      createdAt: 0,
    });

    const policy = createRoutingPolicy([{ matcher: "lint", agentId: "unknown" }], agentInfoMap);
    const selected = policy.selectAgent({ session, task, agents: [defaultAgent] });

    expect(selected?.id).toBe(defaultAgent.id);
  });
});

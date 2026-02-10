import type { AgentInfo } from "@/agents/agent-manager";
import { type AgentRoutingPolicy, createRoutingPolicy } from "@/agents/agent-routing";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { LIMIT } from "@/config/limits";
import { AGENT_STATUS } from "@/constants/agent-status";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { PLAN_STATUS } from "@/constants/plan-status";
import { TASK_STATUS } from "@/constants/task-status";
import type { AppStore } from "@/store/app-store";
import type { AgentId } from "@/types/domain";
import { type Plan, type Session, SubAgentIdSchema, type Task } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { nanoid } from "nanoid";
import type { StoreApi } from "zustand";

export interface ExecutionEngineOptions {
  store: StoreApi<AppStore>;
  subAgentRunner: SubAgentRunner;
  agentInfoMap: Map<AgentId, AgentInfo>;
  routingPolicy?: AgentRoutingPolicy;
  now?: () => number;
}

export class ExecutionEngine {
  private readonly runningTasks = new Set<string>();
  private readonly logger = createClassLogger("ExecutionEngine");
  private unsubscribe?: () => void;
  private readonly now: () => number;
  private readonly routingPolicy: AgentRoutingPolicy;

  constructor(private readonly options: ExecutionEngineOptions) {
    this.now = options.now ?? (() => Date.now());
    this.routingPolicy =
      options.routingPolicy ?? createRoutingPolicy([], this.options.agentInfoMap);
  }

  start(): void {
    if (this.unsubscribe) {
      return;
    }
    this.unsubscribe = this.options.store.subscribe((state) => {
      void this.tick(state);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  async runPlan(planId: Plan["id"]): Promise<void> {
    const state = this.options.store.getState();
    const plan = state.plans[planId];
    if (!plan || plan.status !== PLAN_STATUS.EXECUTING) {
      return;
    }
    await this.executePlan(plan, state);
  }

  private async tick(state: AppStore): Promise<void> {
    const plans = Object.values(state.plans).filter((plan): plan is Plan => Boolean(plan));
    for (const plan of plans) {
      if (plan.status === PLAN_STATUS.EXECUTING) {
        await this.executePlan(plan, state);
      }
    }
  }

  private async executePlan(plan: Plan, state: AppStore): Promise<void> {
    const session = state.sessions[plan.sessionId];
    if (!session) {
      return;
    }
    const tasks = plan.tasks;
    const runnable = tasks.filter(
      (task) =>
        (task.status === TASK_STATUS.PENDING || task.status === TASK_STATUS.BLOCKED) &&
        task.dependencies.every((depId) => {
          const dependency = tasks.find((candidate) => candidate.id === depId);
          return dependency?.status === TASK_STATUS.COMPLETED;
        })
    );
    for (const task of runnable) {
      await this.runTask(plan, task, session);
    }
    const updatedPlan = this.options.store.getState().plans[plan.id];
    if (updatedPlan) {
      this.updatePlanStatus(updatedPlan);
    }
  }

  private updatePlanStatus(plan: Plan): void {
    const tasks = plan.tasks;
    if (tasks.length === 0) {
      return;
    }
    const hasFailed = tasks.some((task) => task.status === TASK_STATUS.FAILED);
    const allComplete = tasks.every((task) => task.status === TASK_STATUS.COMPLETED);
    const nextStatus = allComplete
      ? PLAN_STATUS.COMPLETED
      : hasFailed
        ? PLAN_STATUS.FAILED
        : PLAN_STATUS.EXECUTING;
    if (plan.status !== nextStatus) {
      this.options.store.getState().upsertPlan({
        ...plan,
        status: nextStatus,
        updatedAt: this.now(),
      });
    }
  }

  private async runTask(plan: Plan, task: Task, session: Session): Promise<void> {
    if (this.runningTasks.has(task.id)) {
      return;
    }
    this.runningTasks.add(task.id);
    const agent = this.resolveAgent(session, task);
    if (!agent) {
      this.failTask(plan, task, "No available agent for task.");
      this.runningTasks.delete(task.id);
      return;
    }

    const now = this.now();
    const subAgentId = SubAgentIdSchema.parse(`subagent-${nanoid(LIMIT.NANOID_LENGTH)}`);
    const updatedPlan = this.updateTask(plan, task.id, {
      status: TASK_STATUS.RUNNING,
      assignedAgentId: subAgentId,
      startedAt: now,
    });
    this.options.store.getState().upsertPlan(updatedPlan);

    this.options.store.getState().upsertSubAgent({
      id: subAgentId,
      planId: plan.id,
      agentId: agent.id,
      sessionId: session.id,
      currentTaskId: task.id,
      status: AGENT_STATUS.WORKING,
      connectionStatus: CONNECTION_STATUS.CONNECTING,
      createdAt: now,
      lastActivityAt: now,
    });

    try {
      const childSessionId = await this.options.subAgentRunner.run({
        agent,
        prompt: this.buildTaskPrompt(task),
        parentSessionId: plan.sessionId,
      });
      this.options.store.getState().updateSubAgent({
        agentId: subAgentId,
        patch: {
          sessionId: childSessionId,
          status: AGENT_STATUS.COMPLETED,
          connectionStatus: CONNECTION_STATUS.CONNECTED,
          lastActivityAt: this.now(),
        },
      });
      const completedPlan = this.updateTask(updatedPlan, task.id, {
        status: TASK_STATUS.COMPLETED,
        completedAt: this.now(),
        result: { sessionId: childSessionId },
      });
      this.options.store.getState().upsertPlan(completedPlan);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.store.getState().updateSubAgent({
        agentId: subAgentId,
        patch: {
          status: AGENT_STATUS.ERROR,
          connectionStatus: CONNECTION_STATUS.ERROR,
          lastActivityAt: this.now(),
        },
      });
      this.failTask(updatedPlan, task, message);
      this.logger.error("Task execution failed", { error: message });
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  private resolveAgent(session: Session, task: Task): AgentInfo | null {
    const agents = Array.from(this.options.agentInfoMap.values());
    return this.routingPolicy.selectAgent({ session, task, agents });
  }

  private updateTask(plan: Plan, taskId: Task["id"], patch: Partial<Task>): Plan {
    const tasks = plan.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task));
    return {
      ...plan,
      tasks,
      updatedAt: this.now(),
    };
  }

  private failTask(plan: Plan, task: Task, message: string): void {
    const updated = this.updateTask(plan, task.id, {
      status: TASK_STATUS.FAILED,
      completedAt: this.now(),
      error: message,
    });
    this.options.store.getState().upsertPlan(updated);
  }

  private buildTaskPrompt(task: Task): string {
    return `Task: ${task.title}\n\n${task.description}`;
  }
}

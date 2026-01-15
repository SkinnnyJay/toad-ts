import type {
  AgentId,
  AgentMessage,
  Plan,
  PlanId,
  SessionId,
  SubAgent,
  SubAgentId,
  Task,
  TaskId,
} from "@/types/domain";
import { PlanIdSchema, TaskStatusSchema } from "@/types/domain";
import { EventEmitter } from "eventemitter3";
import type { PlanGenerator } from "./plan-generator";
import type { SubAgentManager } from "./sub-agent-manager";

export interface OrchestratorOptions {
  planGenerator: PlanGenerator;
  subAgentManager: SubAgentManager;
  agentId: AgentId;
  sessionId: SessionId;
  maxConcurrentTasks?: number;
}

export interface OrchestratorEvents {
  plan_created: (plan: Plan) => void;
  task_assigned: (taskId: TaskId, agentId: SubAgentId) => void;
  task_completed: (taskId: TaskId, result: unknown) => void;
  task_failed: (taskId: TaskId, error: string) => void;
  agent_message: (message: AgentMessage) => void;
  plan_completed: (planId: PlanId) => void;
  plan_failed: (planId: PlanId, error: string) => void;
  error: (error: Error) => void;
}

/**
 * Orchestrates multi-agent collaboration by:
 * 1. Generating plans from prompts
 * 2. Spawning sub-agents
 * 3. Assigning tasks to agents
 * 4. Managing dependencies and coordination
 * 5. Handling inter-agent communication
 */
export class Orchestrator extends EventEmitter<OrchestratorEvents> {
  private activePlans = new Map<PlanId, Plan>();
  private taskAssignments = new Map<TaskId, SubAgentId>();
  private readonly planGenerator: PlanGenerator;
  private readonly subAgentManager: SubAgentManager;
  private readonly agentId: AgentId;
  private readonly sessionId: SessionId;
  private readonly maxConcurrentTasks: number;

  constructor(options: OrchestratorOptions) {
    super();
    this.planGenerator = options.planGenerator;
    this.subAgentManager = options.subAgentManager;
    this.agentId = options.agentId;
    this.sessionId = options.sessionId;
    this.maxConcurrentTasks = options.maxConcurrentTasks ?? 3;

    // Forward events from dependencies
    this.planGenerator.on("plan_created", (plan) => {
      this.activePlans.set(plan.id, plan);
      this.emit("plan_created", plan);
    });

    this.planGenerator.on("plan_updated", (plan) => {
      this.activePlans.set(plan.id, plan);
      this.checkPlanCompletion(plan);
    });

    this.subAgentManager.on("agent_message", (message) => {
      this.handleAgentMessage(message);
      this.emit("agent_message", message);
    });

    this.subAgentManager.on("agent_status_changed", (agentId, status) => {
      if (status === "idle" || status === "waiting") {
        this.tryAssignNextTask(agentId);
      }
    });
  }

  /**
   * Main entry point: takes a prompt, generates a plan, and starts execution
   */
  async execute(prompt: string): Promise<Plan> {
    // Generate plan
    const plan = await this.planGenerator.generatePlan(prompt);
    this.activePlans.set(plan.id, plan);

    // Start execution
    await this.startExecution(plan);

    return plan;
  }

  /**
   * Starts executing a plan by creating agents and assigning initial tasks
   */
  private async startExecution(plan: Plan): Promise<void> {
    plan.status = "executing";

    // Create initial agents (up to maxConcurrentTasks)
    const agentsToCreate = Math.min(
      this.maxConcurrentTasks,
      plan.tasks.length,
      this.subAgentManager.getAllAgents(plan.id).length === 0 ? this.maxConcurrentTasks : 0
    );

    const agentPromises: Promise<SubAgent>[] = [];
    for (let i = 0; i < agentsToCreate; i++) {
      agentPromises.push(
        this.subAgentManager.createAgent(plan.id, this.sessionId, this.agentId)
      );
    }

    const agents = await Promise.all(agentPromises);

    // Assign initial tasks (those with no dependencies)
    const readyTasks = plan.tasks.filter(
      (task) =>
        task.status === "pending" &&
        task.dependencies.length === 0 &&
        !this.taskAssignments.has(task.id)
    );

    for (let i = 0; i < Math.min(readyTasks.length, agents.length); i++) {
      const task = readyTasks[i];
      const agent = agents[i];
      if (task && agent) {
        await this.assignTaskToAgent(task.id, agent.id);
      }
    }

    // Try to assign remaining tasks to idle agents
    for (const agent of agents) {
      if (agent.status === "idle") {
        this.tryAssignNextTask(agent.id);
      }
    }
  }

  /**
   * Assigns a task to an agent
   */
  private async assignTaskToAgent(taskId: TaskId, agentId: SubAgentId): Promise<void> {
    const plan = this.findPlanForTask(taskId);
    if (!plan) {
      throw new Error(`No plan found for task ${taskId}`);
    }

    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update task status
    this.planGenerator.updateTaskStatus(taskId, "assigned");
    this.planGenerator.updateTaskStatus(taskId, "running");

    // Assign to agent
    await this.subAgentManager.assignTask(agentId, taskId);
    this.taskAssignments.set(taskId, agentId);

    this.emit("task_assigned", taskId, agentId);
  }

  /**
   * Tries to assign the next available task to an idle agent
   */
  private async tryAssignNextTask(agentId: SubAgentId): Promise<void> {
    const agent = this.subAgentManager.getAgent(agentId);
    if (!agent || (agent.status !== "idle" && agent.status !== "waiting")) {
      return;
    }

    const plan = this.activePlans.get(agent.planId);
    if (!plan) {
      return;
    }

    // Find tasks that are ready (dependencies completed)
    const readyTasks = plan.tasks.filter((task) => {
      if (task.status !== "pending") return false;
      if (this.taskAssignments.has(task.id)) return false;

      // Check if all dependencies are completed
      const allDepsCompleted = task.dependencies.every((depId) => {
        const depTask = plan.tasks.find((t) => t.id === depId);
        return depTask?.status === "completed";
      });

      return allDepsCompleted;
    });

    if (readyTasks.length > 0) {
      const task = readyTasks[0];
      if (task) {
        await this.assignTaskToAgent(task.id, agentId);
      }
    }
  }

  /**
   * Handles messages between agents for coordination
   */
  private handleAgentMessage(message: AgentMessage): void {
    switch (message.type) {
      case "task_complete": {
        const taskId = message.payload.taskId as TaskId;
        const result = message.payload.result;
        this.completeTask(taskId, result);
        break;
      }
      case "task_failed": {
        const taskId = message.payload.taskId as TaskId;
        const error = message.payload.error as string;
        this.failTask(taskId, error);
        break;
      }
      case "need_help": {
        // Agent is requesting help - could trigger coordination
        // For now, just log/emit
        break;
      }
      case "share_result": {
        // Agent is sharing a result with others
        // Could trigger dependent tasks to start
        break;
      }
      case "coordinate": {
        // General coordination message
        break;
      }
    }
  }

  /**
   * Marks a task as completed and triggers dependent tasks
   */
  private completeTask(taskId: TaskId, result?: unknown): void {
    this.planGenerator.updateTaskStatus(taskId, "completed", result);

    const agentId = this.taskAssignments.get(taskId);
    if (agentId) {
      const agent = this.subAgentManager.getAgent(agentId);
      if (agent) {
        // Mark agent as idle and try to assign next task
        this.tryAssignNextTask(agentId);
      }
      this.taskAssignments.delete(taskId);
    }

    this.emit("task_completed", taskId, result);

    // Trigger dependent tasks
    const plan = this.findPlanForTask(taskId);
    if (plan) {
      for (const agent of this.subAgentManager.getAllAgents(plan.id)) {
        if (agent.status === "idle" || agent.status === "waiting") {
          this.tryAssignNextTask(agent.id);
        }
      }
    }
  }

  /**
   * Marks a task as failed
   */
  private failTask(taskId: TaskId, error: string): void {
    this.planGenerator.updateTaskStatus(taskId, "failed", undefined, error);

    const agentId = this.taskAssignments.get(taskId);
    if (agentId) {
      this.taskAssignments.delete(taskId);
      // Agent can be reused for other tasks
      this.tryAssignNextTask(agentId);
    }

    this.emit("task_failed", taskId, error);
  }

  /**
   * Checks if a plan is complete and emits events
   */
  private checkPlanCompletion(plan: Plan): void {
    if (plan.status === "completed" || plan.status === "failed") {
      if (plan.status === "completed") {
        this.emit("plan_completed", plan.id);
      } else {
        this.emit("plan_failed", plan.id, "Plan execution failed");
      }
    }
  }

  /**
   * Finds the plan that contains a given task
   */
  private findPlanForTask(taskId: TaskId): Plan | undefined {
    for (const plan of this.activePlans.values()) {
      if (plan.tasks.some((t) => t.id === taskId)) {
        return plan;
      }
    }
    return undefined;
  }

  /**
   * Gets the current state of a plan
   */
  getPlan(planId: PlanId): Plan | undefined {
    return this.activePlans.get(planId) ?? this.planGenerator.getPlan(planId);
  }

  /**
   * Shuts down all agents for a plan
   */
  async shutdown(planId: PlanId): Promise<void> {
    await this.subAgentManager.shutdownAll(planId);
    this.activePlans.delete(planId);
  }
}

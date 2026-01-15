import type { AgentId, PlanId, SessionId, Task, TaskId } from "@/types/domain";
import { PlanIdSchema, PlanSchema, TaskIdSchema, TaskSchema } from "@/types/domain";
import { EventEmitter } from "eventemitter3";
import { nanoid } from "nanoid";

export interface PlanGeneratorOptions {
  agentId: AgentId;
  sessionId: SessionId;
  maxConcurrentAgents?: number;
  useLLMForPlanning?: boolean;
}

export interface PlanGeneratorEvents {
  plan_created: (plan: Plan) => void;
  plan_updated: (plan: Plan) => void;
  error: (error: Error) => void;
}

export interface PlanGenerator {
  generatePlan(prompt: string): Promise<Plan>;
  updateTaskStatus(taskId: TaskId, status: Task["status"], result?: unknown, error?: string): void;
  getPlan(planId: PlanId): Plan | undefined;
}

/**
 * Generates a plan from a user prompt by breaking it down into sub-tasks.
 * Can use LLM for complex planning or simple heuristics for straightforward tasks.
 */
export class SimplePlanGenerator
  extends EventEmitter<PlanGeneratorEvents>
  implements PlanGenerator
{
  private plans = new Map<PlanId, Plan>();
  private readonly agentId: AgentId;
  private readonly sessionId: SessionId;
  private readonly maxConcurrentAgents: number;

  constructor(options: PlanGeneratorOptions) {
    super();
    this.agentId = options.agentId;
    this.sessionId = options.sessionId;
    this.maxConcurrentAgents = options.maxConcurrentAgents ?? 3;
  }

  async generatePlan(prompt: string): Promise<Plan> {
    try {
      const planId = PlanIdSchema.parse(nanoid());
      const tasks = this.breakDownPrompt(prompt, planId);

      const plan = PlanSchema.parse({
        id: planId,
        sessionId: this.sessionId,
        originalPrompt: prompt,
        tasks,
        status: "planning",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      this.plans.set(planId, plan);
      this.emit("plan_created", plan);
      return plan;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit("error", err);
      throw err;
    }
  }

  updateTaskStatus(
    taskId: TaskId,
    status: Task["status"],
    result?: unknown,
    error?: string
  ): void {
    for (const plan of this.plans.values()) {
      const taskIndex = plan.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex >= 0) {
        const task = plan.tasks[taskIndex];
        const updatedTask = TaskSchema.parse({
          ...task,
          status,
          result,
          error,
          startedAt: status === "running" && !task.startedAt ? Date.now() : task.startedAt,
          completedAt: status === "completed" || status === "failed" ? Date.now() : task.completedAt,
        });

        plan.tasks[taskIndex] = updatedTask;
        plan.updatedAt = Date.now();

        // Update plan status based on task states
        const allCompleted = plan.tasks.every((t) => t.status === "completed");
        const anyFailed = plan.tasks.some((t) => t.status === "failed");
        if (allCompleted) {
          plan.status = "completed";
        } else if (anyFailed && plan.tasks.every((t) => t.status === "completed" || t.status === "failed")) {
          plan.status = "failed";
        } else if (plan.tasks.some((t) => t.status === "running" || t.status === "assigned")) {
          plan.status = "executing";
        }

        this.plans.set(plan.id, plan);
        this.emit("plan_updated", plan);
        return;
      }
    }
  }

  getPlan(planId: PlanId): Plan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Simple heuristic-based task breakdown.
   * In the future, this could use an LLM to generate more sophisticated plans.
   */
  private breakDownPrompt(prompt: string, planId: PlanId): Task[] {
    const tasks: Task[] = [];
    const lines = prompt
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Look for numbered lists or bullet points
    const numberedPattern = /^(\d+)[.)]\s*(.+)$/;
    const bulletPattern = /^[-*•]\s*(.+)$/;

    for (const line of lines) {
      let title = line;
      let description = "";

      const numberedMatch = line.match(numberedPattern);
      const bulletMatch = line.match(bulletPattern);

      if (numberedMatch) {
        title = numberedMatch[2] ?? line;
      } else if (bulletMatch) {
        title = bulletMatch[1] ?? line;
      }

      // If the line contains ":", split into title and description
      if (title.includes(":")) {
        const parts = title.split(":", 2);
        title = parts[0]?.trim() ?? title;
        description = parts[1]?.trim() ?? "";
      }

      if (title.length > 0) {
        const taskId = TaskIdSchema.parse(nanoid());
        tasks.push(
          TaskSchema.parse({
            id: taskId,
            planId,
            title,
            description: description || title,
            status: "pending",
            dependencies: [],
            createdAt: Date.now(),
          })
        );
      }
    }

    // If no structured breakdown found, create a single task
    if (tasks.length === 0) {
      const taskId = TaskIdSchema.parse(nanoid());
      tasks.push(
        TaskSchema.parse({
          id: taskId,
          planId,
          title: "Complete task",
          description: prompt,
          status: "pending",
          dependencies: [],
          createdAt: Date.now(),
        })
      );
    }

    return tasks;
  }
}

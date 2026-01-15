import type {
  AgentId,
  AgentMessage,
  PlanId,
  SessionId,
  SubAgent,
  SubAgentId,
  Task,
  TaskId,
} from "@/types/domain";
import {
  AgentIdSchema,
  PlanIdSchema,
  SessionIdSchema,
  SubAgentIdSchema,
  SubAgentSchema,
} from "@/types/domain";
import { ACPConnection, type ACPConnectionOptions } from "./acp-connection";
import { EventEmitter } from "eventemitter3";
import { nanoid } from "nanoid";

export interface SubAgentManagerOptions {
  agentConfig: ACPConnectionOptions;
  maxConcurrentAgents?: number;
}

export interface SubAgentManagerEvents {
  agent_created: (agent: SubAgent) => void;
  agent_status_changed: (agentId: SubAgentId, status: SubAgent["status"]) => void;
  agent_message: (message: AgentMessage) => void;
  error: (error: Error) => void;
}

export interface SubAgentManager {
  createAgent(planId: PlanId, sessionId: SessionId, agentId: AgentId): Promise<SubAgent>;
  assignTask(agentId: SubAgentId, taskId: TaskId): Promise<void>;
  sendMessage(message: AgentMessage): void;
  getAgent(agentId: SubAgentId): SubAgent | undefined;
  getAllAgents(planId?: PlanId): SubAgent[];
  shutdownAgent(agentId: SubAgentId): Promise<void>;
  shutdownAll(planId?: PlanId): Promise<void>;
}

/**
 * Manages multiple background sub-agents that work on different tasks.
 * Each agent has its own ACP connection and can communicate with others.
 */
export class SubAgentManager
  extends EventEmitter<SubAgentManagerEvents>
  implements SubAgentManager
{
  private agents = new Map<SubAgentId, SubAgent>();
  private connections = new Map<SubAgentId, ACPConnection>();
  private readonly agentConfig: ACPConnectionOptions;
  private readonly maxConcurrentAgents: number;
  private messageQueue: AgentMessage[] = [];

  constructor(options: SubAgentManagerOptions) {
    super();
    this.agentConfig = options.agentConfig;
    this.maxConcurrentAgents = options.maxConcurrentAgents ?? 3;
  }

  async createAgent(
    planId: PlanId,
    sessionId: SessionId,
    agentId: AgentId
  ): Promise<SubAgent> {
    if (this.agents.size >= this.maxConcurrentAgents) {
      throw new Error(
        `Maximum concurrent agents (${this.maxConcurrentAgents}) reached`
      );
    }

    const subAgentId = SubAgentIdSchema.parse(nanoid());
    const connection = new ACPConnection(this.agentConfig);

    // Set up connection event handlers
    connection.on("state", (status) => {
      const agent = this.agents.get(subAgentId);
      if (agent) {
        const updated = SubAgentSchema.parse({
          ...agent,
          connectionStatus: status,
          status: status === "connected" ? "idle" : agent.status,
          lastActivityAt: Date.now(),
        });
        this.agents.set(subAgentId, updated);
        this.emit("agent_status_changed", subAgentId, updated.status);
      }
    });

    connection.on("data", (chunk) => {
      // Process ACP protocol messages and emit agent messages
      // This is a simplified version - full ACP parsing would go here
      const agent = this.agents.get(subAgentId);
      if (agent) {
        const updated = SubAgentSchema.parse({
          ...agent,
          lastActivityAt: Date.now(),
        });
        this.agents.set(subAgentId, updated);
      }
    });

    connection.on("error", (error) => {
      const agent = this.agents.get(subAgentId);
      if (agent) {
        const updated = SubAgentSchema.parse({
          ...agent,
          status: "error",
          connectionStatus: "error",
          lastActivityAt: Date.now(),
        });
        this.agents.set(subAgentId, updated);
        this.emit("agent_status_changed", subAgentId, "error");
      }
      this.emit("error", error);
    });

    const agent = SubAgentSchema.parse({
      id: subAgentId,
      planId,
      agentId,
      sessionId,
      status: "idle",
      connectionStatus: "disconnected",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    this.agents.set(subAgentId, agent);
    this.connections.set(subAgentId, connection);

    // Connect the agent
    await connection.connect();

    this.emit("agent_created", agent);
    return agent;
  }

  async assignTask(agentId: SubAgentId, taskId: TaskId): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== "idle" && agent.status !== "waiting") {
      throw new Error(`Agent ${agentId} is not available (status: ${agent.status})`);
    }

    const connection = this.connections.get(agentId);
    if (!connection || connection.connectionStatus !== "connected") {
      throw new Error(`Agent ${agentId} is not connected`);
    }

    const updated = SubAgentSchema.parse({
      ...agent,
      currentTaskId: taskId,
      status: "working",
      lastActivityAt: Date.now(),
    });

    this.agents.set(agentId, updated);
    this.emit("agent_status_changed", agentId, "working");

    // In a full implementation, we would send the task to the agent via ACP
    // For now, this is a placeholder
  }

  sendMessage(message: AgentMessage): void {
    this.messageQueue.push(message);

    // Broadcast to all agents in the same plan
    const targetAgents = message.to
      ? [this.agents.get(message.to)].filter(Boolean) as SubAgent[]
      : Array.from(this.agents.values()).filter(
          (a) => a.planId === message.from || a.planId === this.agents.get(message.from)?.planId
        );

    for (const agent of targetAgents) {
      const connection = this.connections.get(agent.id);
      if (connection && connection.connectionStatus === "connected") {
        // In a full implementation, we would serialize and send via ACP
        // For now, emit an event
        this.emit("agent_message", message);
      }
    }
  }

  getAgent(agentId: SubAgentId): SubAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(planId?: PlanId): SubAgent[] {
    const allAgents = Array.from(this.agents.values());
    return planId ? allAgents.filter((a) => a.planId === planId) : allAgents;
  }

  async shutdownAgent(agentId: SubAgentId): Promise<void> {
    const connection = this.connections.get(agentId);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(agentId);
    }
    this.agents.delete(agentId);
  }

  async shutdownAll(planId?: PlanId): Promise<void> {
    const agentsToShutdown = planId
      ? Array.from(this.agents.values()).filter((a) => a.planId === planId)
      : Array.from(this.agents.values());

    await Promise.all(
      agentsToShutdown.map((agent) => this.shutdownAgent(agent.id))
    );
  }
}

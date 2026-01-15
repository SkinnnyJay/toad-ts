import type { AgentId, SessionId } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";
import type { ACPConnectionOptions } from "./acp-connection";
import { Orchestrator } from "./orchestrator";
import { SimplePlanGenerator } from "./plan-generator";
import { SubAgentManager } from "./sub-agent-manager";

export interface CreateOrchestratorOptions {
  agentId: AgentId;
  sessionId: SessionId;
  agentConfig: ACPConnectionOptions;
  maxConcurrentAgents?: number;
  maxConcurrentTasks?: number;
}

/**
 * Factory function to create a fully configured orchestrator
 */
export function createOrchestrator(
  options: CreateOrchestratorOptions
): Orchestrator {
  const planGenerator = new SimplePlanGenerator({
    agentId: options.agentId,
    sessionId: options.sessionId,
    maxConcurrentAgents: options.maxConcurrentAgents,
  });

  const subAgentManager = new SubAgentManager({
    agentConfig: options.agentConfig,
    maxConcurrentAgents: options.maxConcurrentAgents ?? 3,
  });

  return new Orchestrator({
    planGenerator,
    subAgentManager,
    agentId: options.agentId,
    sessionId: options.sessionId,
    maxConcurrentTasks: options.maxConcurrentTasks ?? 3,
  });
}

/**
 * Creates an orchestrator configured for Claude CLI
 */
export function createClaudeOrchestrator(
  sessionId: SessionId,
  options?: {
    maxConcurrentAgents?: number;
    maxConcurrentTasks?: number;
  }
): Orchestrator {
  return createOrchestrator({
    agentId: AgentIdSchema.parse("claude-cli"),
    sessionId,
    agentConfig: {
      command: "claude",
      args: ["--experimental-acp"],
    },
    maxConcurrentAgents: options?.maxConcurrentAgents,
    maxConcurrentTasks: options?.maxConcurrentTasks,
  });
}

import type { AgentConfig } from "@/agents/agent-config";
import { createBuildAgent } from "@/agents/builtin/build";
import { createPlanAgent } from "@/agents/builtin/plan";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { ToolPermissionOverrides } from "@/tools/permissions";
import type { AgentId, SessionMode } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";
import type { AgentOption } from "@/ui/components/AgentSelect";

export interface AgentInfo {
  id: AgentId;
  harnessId: string;
  name: string;
  description?: string;
  model?: string;
  temperature?: number;
  permissions?: ToolPermissionOverrides;
  sessionMode?: SessionMode;
  prompt?: string;
}

export interface AgentManagerOptions {
  harnesses: Record<string, HarnessConfig>;
  customAgents?: AgentConfig[];
}

export class AgentManager {
  private readonly agents = new Map<AgentId, AgentInfo>();

  constructor(options: AgentManagerOptions) {
    for (const harness of Object.values(options.harnesses)) {
      this.registerAgent(this.buildHarnessAgent(harness));
      this.registerAgent(createBuildAgent(harness));
      this.registerAgent(createPlanAgent(harness));
    }

    for (const agent of options.customAgents ?? []) {
      if (!options.harnesses[agent.harnessId]) {
        continue;
      }
      this.registerAgent(agent);
    }
  }

  listAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: AgentId): AgentInfo | undefined {
    return this.agents.get(id);
  }

  buildAgentOptions(): { options: AgentOption[]; infoMap: Map<AgentId, AgentInfo> } {
    const options: AgentOption[] = [];
    const infoMap = new Map<AgentId, AgentInfo>();

    for (const agent of this.listAgents()) {
      options.push({ id: agent.id, name: agent.name, description: agent.description });
      infoMap.set(agent.id, agent);
    }

    return { options, infoMap };
  }

  private buildHarnessAgent(harness: HarnessConfig): AgentInfo {
    return {
      id: AgentIdSchema.parse(harness.id),
      harnessId: harness.id,
      name: harness.name,
      description: harness.description,
      permissions: harness.permissions,
    };
  }

  private registerAgent(agent: AgentConfig): void {
    const id = AgentIdSchema.parse(agent.id);
    if (this.agents.has(id)) {
      return;
    }
    this.agents.set(id, {
      id,
      harnessId: agent.harnessId,
      name: agent.name,
      description: agent.description,
      model: agent.model,
      temperature: agent.temperature,
      sessionMode: agent.sessionMode,
      permissions: agent.permissions,
      prompt: agent.prompt,
    });
  }
}

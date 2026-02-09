import { describe, expect, it } from "vitest";

import type { AgentConfig } from "@/agents/agent-config";
import { AgentManager } from "@/agents/agent-manager";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import { AgentIdSchema } from "@/types/domain";

describe("AgentManager", () => {
  it("registers default, build, and plan agents", () => {
    const { harnesses } = createDefaultHarnessConfig();
    const manager = new AgentManager({ harnesses, customAgents: [] });
    const agents = manager.listAgents();

    const baseId = AgentIdSchema.parse("mock");
    const buildId = AgentIdSchema.parse("mock:build");
    const planId = AgentIdSchema.parse("mock:plan");

    expect(agents.some((agent) => agent.id === baseId)).toBe(true);
    expect(agents.some((agent) => agent.id === buildId)).toBe(true);
    expect(agents.some((agent) => agent.id === planId)).toBe(true);
  });

  it("includes custom agents when harness exists", () => {
    const { harnesses } = createDefaultHarnessConfig();
    const customAgent: AgentConfig = {
      id: AgentIdSchema.parse("custom"),
      name: "Custom Agent",
      harnessId: "mock",
      description: "Custom prompt",
      prompt: "Do the thing.",
    };

    const manager = new AgentManager({ harnesses, customAgents: [customAgent] });
    expect(manager.getAgent(customAgent.id)?.name).toBe("Custom Agent");
  });
});

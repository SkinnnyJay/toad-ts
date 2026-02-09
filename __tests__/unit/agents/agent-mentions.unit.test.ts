import { describe, expect, it } from "vitest";

import type { AgentInfo } from "@/agents/agent-manager";
import { parseAgentMention } from "@/agents/agent-mentions";
import { AgentIdSchema } from "@/types/domain";

const agents: AgentInfo[] = [
  {
    id: AgentIdSchema.parse("mock"),
    harnessId: "mock",
    name: "Mock Agent",
  },
  {
    id: AgentIdSchema.parse("mock:build"),
    harnessId: "mock",
    name: "Mock Build",
  },
  {
    id: AgentIdSchema.parse("mock:hidden"),
    harnessId: "mock",
    name: "Hidden Agent",
    hidden: true,
  },
];

describe("parseAgentMention", () => {
  it("matches agent id mention", () => {
    const result = parseAgentMention("@mock build this", agents);
    expect(result?.agent.id).toBe("mock");
    expect(result?.prompt).toBe("build this");
  });

  it("matches agent name mention", () => {
    const result = parseAgentMention("@mock-agent do work", agents);
    expect(result?.agent.id).toBe("mock");
  });

  it("matches build shorthand using current agent", () => {
    const result = parseAgentMention("@build run tests", agents, agents[0]);
    expect(result?.agent.id).toBe("mock:build");
  });

  it("ignores hidden agents", () => {
    const result = parseAgentMention("@mock:hidden do", agents);
    expect(result).toBeNull();
  });

  it("returns null when no prompt provided", () => {
    const result = parseAgentMention("@mock", agents);
    expect(result).toBeNull();
  });
});

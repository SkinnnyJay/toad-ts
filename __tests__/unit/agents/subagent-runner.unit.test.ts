import { describe, expect, it, vi } from "vitest";

import type { AgentInfo } from "@/agents/agent-manager";
import { SubAgentRunner } from "@/agents/subagent-runner";
import { mockHarnessAdapter } from "@/core/mock-harness";
import { SessionStream } from "@/core/session-stream";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import { HarnessRegistry } from "@/harness/harnessRegistry";
import { AgentIdSchema, SessionIdSchema } from "@/types/domain";

describe("SubAgentRunner", () => {
  it("creates child sessions with parent metadata", async () => {
    const { harnesses } = createDefaultHarnessConfig();
    const harnessRegistry = new HarnessRegistry([mockHarnessAdapter]);

    const store = {
      appendMessage: vi.fn(),
      updateMessage: vi.fn(),
      upsertSession: vi.fn(),
      getSession: vi.fn(),
      getMessage: vi.fn(),
    };
    const sessionStream = new SessionStream(store);

    const runner = new SubAgentRunner({
      harnessRegistry,
      harnessConfigs: harnesses,
      sessionStream,
      store,
    });

    const agent: AgentInfo = {
      id: AgentIdSchema.parse("mock"),
      harnessId: "mock",
      name: "Mock Agent",
    };
    const parentSessionId = SessionIdSchema.parse("parent-session");

    const sessionId = await runner.run({
      parentSessionId,
      agent,
      prompt: "Do a quick check.",
      mcpConfig: { mcpServers: {} },
    });

    expect(sessionId).toBeDefined();
    const callArgs = (store.upsertSession as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(callArgs?.session?.metadata?.parentSessionId).toBe(parentSessionId);
  });
});

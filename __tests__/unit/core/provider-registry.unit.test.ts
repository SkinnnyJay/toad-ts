import { ProviderRegistry } from "@/core/providers/provider-registry";
import type {
  ProviderAdapter,
  ProviderModelInfo,
  ProviderStreamChunk,
} from "@/core/providers/provider-types";
import { describe, expect, it } from "vitest";

const createMockProvider = (id: string, models: ProviderModelInfo[]): ProviderAdapter => ({
  id,
  name: `Mock ${id}`,
  listModels: async () => models,
  streamChat: async function* () {
    yield { type: "text" as const, text: "hello" };
    yield { type: "done" as const };
  },
  healthCheck: async () => ({ ok: true }),
});

describe("ProviderRegistry", () => {
  it("should register and list providers", () => {
    const registry = new ProviderRegistry();
    const provider = createMockProvider("test", []);
    registry.register(provider);
    expect(registry.list()).toHaveLength(1);
    expect(registry.get("test")).toBe(provider);
  });

  it("should refresh models from providers", async () => {
    const registry = new ProviderRegistry();
    const models: ProviderModelInfo[] = [
      { id: "model-1", name: "Model 1", contextWindow: 128000 },
      { id: "model-2", name: "Model 2", contextWindow: 64000 },
    ];
    registry.register(createMockProvider("test", models));
    await registry.refreshModels();
    expect(registry.getAllModels()).toHaveLength(2);
  });

  it("should find provider for a model", async () => {
    const registry = new ProviderRegistry();
    const models: ProviderModelInfo[] = [
      { id: "claude-sonnet", name: "Sonnet", contextWindow: 200000 },
    ];
    registry.register(createMockProvider("anthropic", models));
    await registry.refreshModels();
    const provider = registry.findModelProvider("claude-sonnet");
    expect(provider?.id).toBe("anthropic");
  });

  it("should run health checks", async () => {
    const registry = new ProviderRegistry();
    registry.register(createMockProvider("test", []));
    const results = await registry.healthCheckAll();
    expect(results.get("test")?.ok).toBe(true);
  });
});

import { ENV_KEY } from "@/constants/env-keys";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { AnthropicProvider } from "./anthropic-provider";
import { OllamaProvider } from "./ollama-provider";
import { OpenAIProvider } from "./openai-provider";
import type { ProviderAdapter, ProviderModelInfo, ProviderOptions } from "./provider-types";

const logger = createClassLogger("ProviderRegistry");

export interface RegisteredProvider {
  adapter: ProviderAdapter;
  models: ProviderModelInfo[];
  healthy: boolean;
}

export class ProviderRegistry {
  private readonly providers = new Map<string, RegisteredProvider>();

  register(adapter: ProviderAdapter): void {
    this.providers.set(adapter.id, { adapter, models: [], healthy: false });
    logger.info("Registered provider", { id: adapter.id, name: adapter.name });
  }

  get(id: string): ProviderAdapter | undefined {
    return this.providers.get(id)?.adapter;
  }

  list(): RegisteredProvider[] {
    return Array.from(this.providers.values());
  }

  async refreshModels(): Promise<void> {
    for (const [id, entry] of this.providers) {
      try {
        const models = await entry.adapter.listModels();
        entry.models = models;
        logger.info("Refreshed models", { provider: id, count: models.length });
      } catch (error) {
        logger.warn("Failed to refresh models", {
          provider: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  async healthCheckAll(): Promise<Map<string, { ok: boolean; error?: string }>> {
    const results = new Map<string, { ok: boolean; error?: string }>();
    for (const [id, entry] of this.providers) {
      const result = await entry.adapter.healthCheck();
      entry.healthy = result.ok;
      results.set(id, result);
    }
    return results;
  }

  getAllModels(): ProviderModelInfo[] {
    const models: ProviderModelInfo[] = [];
    for (const entry of this.providers.values()) {
      models.push(...entry.models);
    }
    return models;
  }

  findModelProvider(modelId: string): ProviderAdapter | undefined {
    for (const entry of this.providers.values()) {
      if (entry.models.some((model) => model.id === modelId)) {
        return entry.adapter;
      }
    }
    return undefined;
  }
}

/**
 * Create a provider registry pre-populated with providers based on available API keys.
 */
export const createDefaultProviderRegistry = (options?: {
  anthropicOptions?: ProviderOptions;
  openaiOptions?: ProviderOptions;
  ollamaOptions?: ProviderOptions;
}): ProviderRegistry => {
  const registry = new ProviderRegistry();
  const env = EnvManager.getInstance().getSnapshot();

  const anthropicKey = env[ENV_KEY.ANTHROPIC_API_KEY];
  if (anthropicKey) {
    registry.register(new AnthropicProvider(anthropicKey, options?.anthropicOptions));
  }

  const openaiKey = env[ENV_KEY.OPENAI_API_KEY];
  if (openaiKey) {
    registry.register(new OpenAIProvider(openaiKey, options?.openaiOptions));
  }

  // Ollama doesn't need an API key — always register
  registry.register(new OllamaProvider("", options?.ollamaOptions));

  return registry;
};

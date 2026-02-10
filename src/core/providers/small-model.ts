import type { ProviderRegistry } from "./provider-registry";
import type { ProviderAdapter } from "./provider-types";

/**
 * Resolve the small model for lightweight tasks (title generation, compaction summaries, etc.).
 * Uses the configured smallModel from providers config, or falls back to the cheapest available.
 */
export const resolveSmallModel = (
  registry: ProviderRegistry,
  configuredSmallModel?: string
): { provider: ProviderAdapter; modelId: string } | null => {
  // Use explicitly configured model
  if (configuredSmallModel) {
    const provider = registry.findModelProvider(configuredSmallModel);
    if (provider) {
      return { provider, modelId: configuredSmallModel };
    }
  }

  // Fall back to cheapest available model (preference order)
  const SMALL_MODEL_PREFERENCES = [
    "claude-haiku-4-20250514",
    "claude-3-5-haiku-20241022",
    "gpt-4o-mini",
    "o4-mini",
  ];

  for (const modelId of SMALL_MODEL_PREFERENCES) {
    const provider = registry.findModelProvider(modelId);
    if (provider) {
      return { provider, modelId };
    }
  }

  // Use any available model
  const allModels = registry.getAllModels();
  if (allModels.length > 0 && allModels[0]) {
    const modelId = allModels[0].id;
    const provider = registry.findModelProvider(modelId);
    if (provider) {
      return { provider, modelId };
    }
  }

  return null;
};

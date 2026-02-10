import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("ModelVariant");

export interface ModelVariant {
  modelId: string;
  thinking: boolean;
}

/**
 * Known model variants with thinking/non-thinking pairs.
 * Ctrl+T cycles between thinking and non-thinking variants.
 */
const THINKING_PAIRS: Record<string, string> = {
  "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
  "claude-opus-4-20250514": "claude-opus-4-20250514",
  o3: "o3",
  "o3-mini": "o3-mini",
  "o4-mini": "o4-mini",
};

const NON_THINKING_MODELS = new Set([
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-haiku-4-20250514",
]);

export const isThinkingModel = (modelId: string): boolean => {
  return modelId in THINKING_PAIRS;
};

/**
 * Toggle thinking variant for a model.
 * If the model supports thinking, returns the same model with a thinking flag.
 * If the model doesn't support thinking, returns null (no variant available).
 */
export const toggleThinkingVariant = (current: ModelVariant): ModelVariant | null => {
  if (NON_THINKING_MODELS.has(current.modelId)) {
    return null; // No thinking variant available
  }
  if (current.modelId in THINKING_PAIRS) {
    return { modelId: current.modelId, thinking: !current.thinking };
  }
  return null;
};

/**
 * Cycle through recently used models.
 * Returns the next model in the list, wrapping around.
 */
export const cycleModel = (currentModelId: string, recentModels: string[]): string | null => {
  if (recentModels.length === 0) return null;
  const currentIndex = recentModels.indexOf(currentModelId);
  if (currentIndex < 0) return recentModels[0] ?? null;
  const nextIndex = (currentIndex + 1) % recentModels.length;
  return recentModels[nextIndex] ?? null;
};

/**
 * Cycle in reverse through recently used models.
 */
export const cycleModelReverse = (
  currentModelId: string,
  recentModels: string[]
): string | null => {
  if (recentModels.length === 0) return null;
  const currentIndex = recentModels.indexOf(currentModelId);
  if (currentIndex < 0) return recentModels[recentModels.length - 1] ?? null;
  const nextIndex = (currentIndex - 1 + recentModels.length) % recentModels.length;
  return recentModels[nextIndex] ?? null;
};

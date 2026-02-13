import { LIMIT } from "@/config/limits";
import {
  type AnalyticsMeta,
  type AnalyticsSnapshot,
  type CompressionSavings,
  type ContextAnalytics,
  type CostBreakdown,
  type MetricsAfter,
  type MetricsBefore,
  type OutputAnalytics,
  type TokenizerEstimate,
  analyticsMetaSchema,
  analyticsSnapshotSchema,
  compressionSavingsSchema,
  contextAnalyticsSchema,
  costBreakdownSchema,
  metricsAfterSchema,
  metricsBeforeSchema,
  outputAnalyticsSchema,
} from "./tokenOptimizer.types";

export interface AnalyticsBuildMetrics {
  text: string;
  estimate: TokenizerEstimate;
}

export interface AnalyticsBuildOptions {
  before: AnalyticsBuildMetrics;
  after: AnalyticsBuildMetrics;
  meta?: Partial<AnalyticsMeta>;
  cost?: Partial<CostBreakdown>;
  context?: Partial<ContextAnalytics>;
  output?: Partial<OutputAnalytics>;
}

const buildMetricsBefore = ({ text, estimate }: AnalyticsBuildMetrics): MetricsBefore =>
  metricsBeforeSchema.parse({
    rawPromptText: text,
    rawPromptCharCount: estimate.charCount,
    rawPromptTokenCount: estimate.tokenCount,
    rawPromptByteSize: estimate.byteSize,
  });

const buildMetricsAfter = ({ text, estimate }: AnalyticsBuildMetrics): MetricsAfter =>
  metricsAfterSchema.parse({
    optimizedPromptText: text,
    optimizedPromptCharCount: estimate.charCount,
    optimizedPromptTokenCount: estimate.tokenCount,
    optimizedPromptByteSize: estimate.byteSize,
  });

const buildSavings = (before: TokenizerEstimate, after: TokenizerEstimate): CompressionSavings => {
  const tokenCountAfter = after.tokenCount === 0 ? 1 : after.tokenCount;
  const ratio = before.tokenCount / tokenCountAfter;
  const tokensSaved = Math.max(0, before.tokenCount - after.tokenCount);
  const bytesSaved = Math.max(0, before.byteSize - after.byteSize);
  const percentReductionTokens =
    before.tokenCount === 0 ? 0 : (tokensSaved / before.tokenCount) * LIMIT.PERCENT_SCALE;
  const percentReductionBytes =
    before.byteSize === 0 ? 0 : (bytesSaved / before.byteSize) * LIMIT.PERCENT_SCALE;

  return compressionSavingsSchema.parse({
    compressionRatio: Number.isFinite(ratio) ? ratio : 0,
    tokensSaved,
    bytesSaved,
    percentReductionTokens,
    percentReductionBytes,
    estimatedCostSavingsUsd: 0,
  });
};

const defaultContextAnalytics: ContextAnalytics = contextAnalyticsSchema.parse({
  contextMessagesSelectedCount: 0,
  contextMessagesRemovedCount: 0,
  contextTokensSelected: 0,
  contextTokensRemoved: 0,
  contextPrunedPercentage: 0,
  memorySummaryTokens: 0,
  memorySummarySavingsTokens: 0,
  retrievalChunksSelected: 0,
  retrievalHitRate: 0,
});

const defaultOutputAnalytics: OutputAnalytics = outputAnalyticsSchema.parse({
  completionTokens: 0,
  tokensPerSecond: 0,
  latencyMs: 0,
  promptToOutputRatio: 0,
});

const defaultCostBreakdown: CostBreakdown = costBreakdownSchema.parse({
  providerName: "unknown",
  modelName: "unknown",
  providerTokenPricePrompt: 0,
  providerTokenPriceCompletion: 0,
  promptCostUsd: 0,
  completionCostUsd: 0,
  totalCostUsd: 0,
  contextWindowUtilization: 0,
});

const buildContextAnalytics = (overrides?: Partial<ContextAnalytics>): ContextAnalytics =>
  contextAnalyticsSchema.parse({
    ...defaultContextAnalytics,
    ...overrides,
  });

const buildOutputAnalytics = (overrides?: Partial<OutputAnalytics>): OutputAnalytics =>
  outputAnalyticsSchema.parse({
    ...defaultOutputAnalytics,
    ...overrides,
  });

const buildCostBreakdown = (overrides?: Partial<CostBreakdown>): CostBreakdown =>
  costBreakdownSchema.parse({
    ...defaultCostBreakdown,
    ...overrides,
  });

const buildMeta = (overrides?: Partial<AnalyticsMeta>): AnalyticsMeta =>
  analyticsMetaSchema.parse({
    timestampUtc: new Date().toISOString(),
    optimizerVersion: "0.1.0",
    requestId: "unknown",
    ...overrides,
  });

export const buildAnalyticsSnapshot = (options: AnalyticsBuildOptions): AnalyticsSnapshot => {
  const metricsBefore = buildMetricsBefore(options.before);
  const metricsAfter = buildMetricsAfter(options.after);
  const savings = buildSavings(options.before.estimate, options.after.estimate);
  const context = buildContextAnalytics(options.context);
  const output = buildOutputAnalytics(options.output);
  const cost = buildCostBreakdown(options.cost);
  const meta = buildMeta(options.meta);

  return analyticsSnapshotSchema.parse({
    metricsBefore,
    metricsAfter,
    savings,
    context,
    output,
    cost,
    meta,
  });
};

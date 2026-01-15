import { z } from "zod";
import { CompressionTypeEnum } from "./types";

export const compressionTypeSchema = z
  .enum([
    CompressionTypeEnum.JSON,
    CompressionTypeEnum.MARKDOWN,
    CompressionTypeEnum.XML,
    CompressionTypeEnum.YAML,
    CompressionTypeEnum.CSV,
    CompressionTypeEnum.TOON,
    CompressionTypeEnum.TONL,
  ])
  .describe("Type of compression/optimization strategy to apply");

export type CompressionType = z.infer<typeof compressionTypeSchema>;

export const cleanerTransformNameSchema = z
  .enum(["trim", "collapseWhitespace", "normalizeNewlines", "jsonFlatten"] as const)
  .describe("Name of text cleaning transform to apply");

export type CleanerTransformName = z.infer<typeof cleanerTransformNameSchema>;

export const cleanOptionsSchema = z
  .object({
    trim: z.boolean().default(true).describe("Trim leading/trailing whitespace"),
    collapseWhitespace: z
      .boolean()
      .default(true)
      .describe("Collapse multiple whitespace characters into single space"),
    normalizeNewlines: z
      .boolean()
      .default(true)
      .describe("Normalize different newline formats to consistent format"),
    jsonFlatten: z.boolean().default(false).describe("Flatten nested JSON structures"),
  })
  .describe("Text cleaning options schema");

export type CleanOptions = z.infer<typeof cleanOptionsSchema>;

export const cleanerTransformResultSchema = z
  .object({
    name: cleanerTransformNameSchema.describe("Name of the transform that was applied"),
    applied: z.boolean().describe("Whether the transform was successfully applied"),
  })
  .describe("Result of applying a text cleaning transform");

export type CleanerTransformResult = z.infer<typeof cleanerTransformResultSchema>;

export const promptMetricsSchema = z
  .object({
    text: z.string().describe("Prompt text content"),
    charCount: z.number().int().nonnegative().describe("Character count"),
    tokenCount: z.number().int().nonnegative().describe("Token count (estimated)"),
    byteSize: z.number().int().nonnegative().describe("Byte size (UTF-8 encoded)"),
  })
  .describe("Prompt metrics schema");

export type PromptMetrics = z.infer<typeof promptMetricsSchema>;

export const metricsBeforeSchema = z
  .object({
    rawPromptText: z.string().describe("Original prompt text before optimization"),
    rawPromptCharCount: z.number().int().nonnegative().describe("Original character count"),
    rawPromptTokenCount: z.number().int().nonnegative().describe("Original token count"),
    rawPromptByteSize: z.number().int().nonnegative().describe("Original byte size"),
  })
  .describe("Metrics before optimization");

export type MetricsBefore = z.infer<typeof metricsBeforeSchema>;

export const metricsAfterSchema = z
  .object({
    optimizedPromptText: z.string().describe("Optimized prompt text after compression"),
    optimizedPromptCharCount: z.number().int().nonnegative().describe("Optimized character count"),
    optimizedPromptTokenCount: z.number().int().nonnegative().describe("Optimized token count"),
    optimizedPromptByteSize: z.number().int().nonnegative().describe("Optimized byte size"),
  })
  .describe("Metrics after optimization");

export type MetricsAfter = z.infer<typeof metricsAfterSchema>;

export const compressionSavingsSchema = z
  .object({
    compressionRatio: z
      .number()
      .nonnegative()
      .describe("Compression ratio (original size / compressed size)"),
    tokensSaved: z.number().int().nonnegative().describe("Number of tokens saved"),
    bytesSaved: z.number().int().nonnegative().describe("Number of bytes saved"),
    percentReductionTokens: z.number().min(0).describe("Percentage reduction in tokens (0-100)"),
    percentReductionBytes: z.number().min(0).describe("Percentage reduction in bytes (0-100)"),
    estimatedCostSavingsUsd: z.number().min(0).describe("Estimated cost savings in USD"),
  })
  .describe("Compression savings metrics");

export type CompressionSavings = z.infer<typeof compressionSavingsSchema>;

export const contextAnalyticsSchema = z
  .object({
    contextMessagesSelectedCount: z
      .number()
      .int()
      .nonnegative()
      .describe("Number of context messages selected for prompt"),
    contextMessagesRemovedCount: z
      .number()
      .int()
      .nonnegative()
      .describe("Number of context messages removed/pruned"),
    contextTokensSelected: z
      .number()
      .int()
      .nonnegative()
      .describe("Number of context tokens selected"),
    contextTokensRemoved: z
      .number()
      .int()
      .nonnegative()
      .describe("Number of context tokens removed"),
    contextPrunedPercentage: z.number().min(0).describe("Percentage of context pruned (0-100)"),
    memorySummaryTokens: z.number().int().nonnegative().describe("Memory summary tokens included"),
    memorySummarySavingsTokens: z
      .number()
      .int()
      .nonnegative()
      .describe("Memory summary tokens saved"),
    retrievalChunksSelected: z
      .number()
      .int()
      .nonnegative()
      .describe("Number of retrieval chunks selected"),
    retrievalHitRate: z.number().min(0).describe("Retrieval hit rate (0-1)"),
  })
  .describe("Context analytics schema");

export type ContextAnalytics = z.infer<typeof contextAnalyticsSchema>;

export const outputAnalyticsSchema = z
  .object({
    completionTokens: z
      .number()
      .int()
      .nonnegative()
      .describe("Number of completion tokens generated"),
    tokensPerSecond: z.number().min(0).describe("Generation speed in tokens per second"),
    latencyMs: z.number().min(0).describe("Response latency in milliseconds"),
    promptToOutputRatio: z.number().min(0).describe("Ratio of prompt tokens to output tokens"),
  })
  .describe("Output analytics schema");

export type OutputAnalytics = z.infer<typeof outputAnalyticsSchema>;

export const costBreakdownSchema = z
  .object({
    providerName: z.string().describe("LLM provider name (e.g., OpenAI, Anthropic)"),
    modelName: z.string().describe("Model name (e.g., gpt-4o, claude-3-5-sonnet)"),
    providerTokenPricePrompt: z.number().min(0).describe("Price per prompt token in USD"),
    providerTokenPriceCompletion: z.number().min(0).describe("Price per completion token in USD"),
    promptCostUsd: z.number().min(0).describe("Total prompt cost in USD"),
    completionCostUsd: z.number().min(0).describe("Total completion cost in USD"),
    totalCostUsd: z.number().min(0).describe("Total cost in USD"),
    contextWindowUtilization: z
      .number()
      .min(0)
      .describe("Context window utilization percentage (0-100)"),
  })
  .describe("Cost breakdown schema");

export type CostBreakdown = z.infer<typeof costBreakdownSchema>;

export const analyticsMetaSchema = z
  .object({
    timestampUtc: z.string().describe("Timestamp in UTC (ISO 8601 format)"),
    optimizerVersion: z.string().describe("Token optimizer version"),
    requestId: z.string().describe("Unique request identifier"),
  })
  .describe("Analytics metadata schema");

export type AnalyticsMeta = z.infer<typeof analyticsMetaSchema>;

export const analyticsSnapshotSchema = z
  .object({
    metricsBefore: metricsBeforeSchema.describe("Metrics before optimization"),
    metricsAfter: metricsAfterSchema.describe("Metrics after optimization"),
    savings: compressionSavingsSchema.describe("Compression savings metrics"),
    context: contextAnalyticsSchema.describe("Context analytics"),
    output: outputAnalyticsSchema.describe("Output analytics"),
    cost: costBreakdownSchema.describe("Cost breakdown"),
    meta: analyticsMetaSchema.describe("Analytics metadata"),
  })
  .describe("Complete analytics snapshot schema");

export type AnalyticsSnapshot = z.infer<typeof analyticsSnapshotSchema>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { readonly [key: string]: JsonValue } | JsonValue[];
export type JsonArray = JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

const buildJsonValueSchema = (): z.ZodType<JsonValue> => {
  const lazySchema: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(lazySchema),
      z.record(z.string(), lazySchema) as z.ZodType<JsonValue>,
    ])
  );

  return lazySchema;
};

export const jsonValueSchema = buildJsonValueSchema();

export const jsonOptimizationPayloadSchema = jsonValueSchema;

export type JsonOptimizationPayload = z.infer<typeof jsonOptimizationPayloadSchema>;

export const markdownOptimizationPayloadSchema = z
  .object({
    headingCount: z.number().int().nonnegative().describe("Number of markdown headings"),
    listCount: z.number().int().nonnegative().describe("Number of markdown lists"),
    tableCount: z.number().int().nonnegative().describe("Number of markdown tables"),
    codeBlockCount: z.number().int().nonnegative().describe("Number of code blocks"),
  })
  .describe("Markdown optimization payload schema");

export type MarkdownOptimizationPayload = z.infer<typeof markdownOptimizationPayloadSchema>;

export const xmlOptimizationPayloadSchema = z
  .object({
    elementCount: z.number().int().nonnegative().describe("Number of XML elements"),
    attributeCount: z.number().int().nonnegative().describe("Number of XML attributes"),
    hasXmlDeclaration: z.boolean().describe("Whether XML declaration is present"),
  })
  .describe("XML optimization payload schema");

export type XmlOptimizationPayload = z.infer<typeof xmlOptimizationPayloadSchema>;

export const yamlOptimizationPayloadSchema = z
  .object({
    lineCount: z.number().int().nonnegative().describe("Number of lines in YAML output"),
    keyCount: z.number().int().nonnegative().describe("Total number of mapping keys"),
    sequenceCount: z.number().int().nonnegative().describe("Total number of sequences"),
    scalarCount: z.number().int().nonnegative().describe("Total number of scalar values"),
  })
  .describe("YAML optimization payload schema");

export type YamlOptimizationPayload = z.infer<typeof yamlOptimizationPayloadSchema>;

export const csvOptimizationPayloadSchema = z
  .object({
    rowCount: z.number().int().nonnegative().describe("Number of data rows"),
    columnCount: z.number().int().nonnegative().describe("Maximum column count across rows"),
    emptyCellCount: z.number().int().nonnegative().describe("Number of empty cells"),
    delimiter: z.string().min(1).describe("Detected delimiter used for CSV serialization"),
  })
  .describe("CSV optimization payload schema");

export type CsvOptimizationPayload = z.infer<typeof csvOptimizationPayloadSchema>;

export const toonOptimizationPayloadSchema = z
  .object({
    lineCount: z.number().int().nonnegative().describe("Number of lines in TOON output"),
    objectKeyCount: z
      .number()
      .int()
      .nonnegative()
      .describe("Total number of object keys encountered"),
    arrayCount: z.number().int().nonnegative().describe("Number of arrays encountered"),
  })
  .describe("TOON optimization analytics payload");

export type ToonOptimizationPayload = z.infer<typeof toonOptimizationPayloadSchema>;

export const tonlOptimizationPayloadSchema = z
  .object({
    lineCount: z.number().int().nonnegative().describe("Number of lines in TONL output"),
    delimiter: z.string().min(1).describe("Delimiter detected in TONL output"),
    includesTypeAnnotations: z
      .boolean()
      .describe("Indicates whether TONL output includes type annotations"),
  })
  .describe("TONL optimization analytics payload");

export type TonlOptimizationPayload = z.infer<typeof tonlOptimizationPayloadSchema>;

export const optimizationMetadataSchema = z
  .object({
    compressionType: compressionTypeSchema.describe("Type of compression strategy used"),
    strategyVersion: z.string().describe("Version of the optimization strategy"),
    appliedCleaners: z
      .array(cleanerTransformNameSchema)
      .describe("List of cleaning transforms that were applied"),
  })
  .describe("Optimization metadata schema");

export type OptimizationMetadata = z.infer<typeof optimizationMetadataSchema>;

export const optimizationResultSchema = z
  .object({
    optimizedPrompt: z.string().describe("Optimized prompt text"),
    optimizedPayload: z
      .unknown()
      .optional()
      .describe("Optimization-specific payload (type depends on compressionType)"),
    analytics: analyticsSnapshotSchema.describe("Complete analytics snapshot"),
    metadata: optimizationMetadataSchema.describe("Optimization metadata"),
  })
  .describe("Token optimization result schema");

export type OptimizationResult = z.infer<typeof optimizationResultSchema>;

export const optimizationRequestSchema = z
  .object({
    prompt: z.string().describe("Original prompt text to optimize"),
    compressionType: compressionTypeSchema.describe("Type of compression strategy to apply"),
    cleanOptions: cleanOptionsSchema.optional().describe("Text cleaning options (optional)"),
  })
  .describe("Token optimization request schema");

export type OptimizationRequest = z.infer<typeof optimizationRequestSchema>;

export const tokenizerEstimateSchema = z
  .object({
    tokenCount: z.number().int().nonnegative().describe("Estimated token count"),
    charCount: z.number().int().nonnegative().describe("Character count"),
    byteSize: z.number().int().nonnegative().describe("Byte size (UTF-8 encoded)"),
  })
  .describe("Tokenizer estimate schema");

export type TokenizerEstimate = z.infer<typeof tokenizerEstimateSchema>;

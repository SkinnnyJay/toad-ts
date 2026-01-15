export enum CompressionTypeEnum {
  TOON = "TOON",
  XML = "XML",
  MARKDOWN = "MARKDOWN",
  JSON = "JSON",
  YAML = "YAML",
  CSV = "CSV",
  TONL = "TONL",
}
export const COMPRESSION_TYPES = [
  CompressionTypeEnum.TOON,
  CompressionTypeEnum.XML,
  CompressionTypeEnum.MARKDOWN,
  CompressionTypeEnum.JSON,
  CompressionTypeEnum.YAML,
  CompressionTypeEnum.CSV,
  CompressionTypeEnum.TONL,
] as const;

export type CompressionType = (typeof COMPRESSION_TYPES)[number];

// Stub types for analytics (to be implemented)
export interface TokenAnalyticsInput {
  prompt?: string;
  cleanedPrompt?: string;
  optimizedPrompt?: string;
  originalTokenCount?: number;
  cleanedTokenCount?: number;
  optimizedTokenCount?: number;
  compressionType?: CompressionType;
  [key: string]: unknown;
}

export interface TokenAnalyticsSnapshot {
  originalTokenCount: number;
  cleanedTokenCount: number;
  optimizedTokenCount: number;
  compressionRatio: number;
  timestamp: number;
  [key: string]: unknown;
}

export interface TokenAnalyticsAdapter {
  record(input: TokenAnalyticsInput): void;
  getSnapshot(): TokenAnalyticsSnapshot;
  reset(): void;
}

export interface TokenCountAdapter {
  countTokens(text: string): number;
}

export interface CleanOptions {
  trim?: boolean;
  removeLineBreaks?: boolean;
  removeCarriageReturns?: boolean;
  collapseWhitespace?: boolean;
  flattenJson?: boolean;
}

export interface CleanApplied {
  trimmed: boolean;
  removedLineBreaks: boolean;
  removedCarriageReturns: boolean;
  collapsedWhitespace: boolean;
  flattenedJson: boolean;
}

export interface CleanResult {
  cleanedText: string;
  applied: CleanApplied;
}

export interface CompressionMetadata extends Record<string, unknown> {}

export interface CompressionInput {
  text: string;
  formatOptions?: unknown;
  context?: Record<string, unknown>;
}

export interface CompressionOutput<TMetadata extends CompressionMetadata = CompressionMetadata> {
  type: CompressionType;
  optimizedText: string;
  metadata: TMetadata;
}

export interface CompressionStrategy<TMetadata extends CompressionMetadata = CompressionMetadata> {
  readonly type: CompressionType;
  format(input: CompressionInput): CompressionOutput<TMetadata>;
}

export interface TokenOptimizerDependencies {
  tokenizer?: TokenCountAdapter;
  analytics?: TokenAnalyticsAdapter;
}

export interface TokenOptimizerCreateOptions extends TokenOptimizerDependencies {
  compressionType: CompressionType;
}

export interface OptimizePromptOptions {
  prompt: string;
  cleanOptions?: CleanOptions;
  formatOptions?: unknown;
  analyticsContext?: Partial<TokenAnalyticsInput>;
}

export interface TokenOptimizationResult<
  TMetadata extends CompressionMetadata = CompressionMetadata,
> {
  cleanedPrompt: string;
  optimizedPrompt: string;
  compressionOutput: CompressionOutput<TMetadata>;
  analytics: TokenAnalyticsSnapshot;
}

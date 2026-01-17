import { describe, expect, it, vi } from "vitest";
import type { TelemetryStorage } from "../../../src/utils/token-optimizer/telemetryStorage";
import { TokenOptimizer } from "../../../src/utils/token-optimizer/tokenOptimizer";
import type {
  CompressionStrategy,
  OptimizationRequest,
  OptimizationResult,
  TokenizerAdapter,
  TokenizerEstimate,
} from "../../../src/utils/token-optimizer/tokenOptimizer.types";
import type { AnalyticsSnapshot } from "../../../src/utils/token-optimizer/tokenOptimizer.types";
import { CompressionTypeEnum } from "../../../src/utils/token-optimizer/types";
import { CompressionValidatorRegistry } from "../../../src/utils/token-optimizer/validatorRegistry";

describe("TokenOptimizer", () => {
  const createMockTokenizer = (): TokenizerAdapter => ({
    name: "test-tokenizer",
    estimate: (input: string): TokenizerEstimate => {
      const charCount = input.length;
      const byteSize = new TextEncoder().encode(input).length;
      // Simple approximation: ~4 chars per token
      const tokenCount = Math.ceil(charCount / 4);
      return { tokenCount, charCount, byteSize };
    },
  });

  const createMockTelemetryStorage = (): TelemetryStorage => ({
    persistSnapshot: vi.fn().mockResolvedValue(undefined),
  });

  const createMockStrategy = (
    type: OptimizationRequest["compressionType"],
    optimizedText: string,
    optimizedPayload?: unknown
  ): CompressionStrategy => ({
    type,
    format: vi.fn().mockResolvedValue({
      optimizedText,
      optimizedPayload,
    }),
  });

  const createMockValidatorRegistry = (): CompressionValidatorRegistry => {
    return new CompressionValidatorRegistry();
  };

  describe("optimize()", () => {
    it("should optimize prompt with JSON strategy", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const mockStrategy = createMockStrategy(CompressionTypeEnum.JSON, '{"key":"value"}', {
        objectKeyCount: 1,
      });

      const strategies = new Map([[CompressionTypeEnum.JSON, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: '{\n  "key": "value"\n}',
        compressionType: CompressionTypeEnum.JSON,
      };

      const result = await optimizer.optimize(request);

      expect(result.optimizedPrompt).toBe('{"key":"value"}');
      expect(result.metadata.compressionType).toBe(CompressionTypeEnum.JSON);
      expect(mockStrategy.format).toHaveBeenCalled();
      expect(telemetryStorage.persistSnapshot).toHaveBeenCalled();
    });

    it("should apply cleaning transforms before optimization", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const mockStrategy = createMockStrategy(CompressionTypeEnum.MARKDOWN, "cleaned text");

      const strategies = new Map([[CompressionTypeEnum.MARKDOWN, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: "  text   with   extra   spaces  \n\n",
        compressionType: CompressionTypeEnum.MARKDOWN,
        cleanOptions: {
          trim: true,
          collapseWhitespace: true,
          normalizeNewlines: true,
          jsonFlatten: false,
        },
      };

      await optimizer.optimize(request);

      // Strategy should receive cleaned text (whitespace collapsed and trimmed)
      const callArgs = (mockStrategy.format as ReturnType<typeof vi.fn>).mock.calls[0];
      const cleanedText = callArgs?.[0] as string;
      expect(cleanedText).toBeTruthy();
      expect(cleanedText.trim()).toBe("text with extra spaces");
      // Should have whitespace collapsed (no multiple spaces)
      expect(cleanedText).not.toContain("   ");
    });

    it("should calculate token reduction correctly", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const originalText = "This is a long prompt that should be optimized";
      const optimizedText = "Short optimized";

      const mockStrategy = createMockStrategy(CompressionTypeEnum.MARKDOWN, optimizedText);

      const strategies = new Map([[CompressionTypeEnum.MARKDOWN, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: originalText,
        compressionType: CompressionTypeEnum.MARKDOWN,
      };

      const result = await optimizer.optimize(request);

      expect(result.analytics.metricsBefore.rawPromptTokenCount).toBeGreaterThan(0);
      expect(result.analytics.metricsAfter.optimizedPromptTokenCount).toBeGreaterThan(0);
      expect(result.analytics.savings.tokensSaved).toBeGreaterThanOrEqual(0);
    });

    it("should fall back to passthrough when strategy fails", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const failingStrategy: CompressionStrategy = {
        type: CompressionTypeEnum.TONL,
        format: vi.fn().mockRejectedValue(new Error("Strategy failed")),
      };

      const strategies = new Map([[CompressionTypeEnum.TONL, failingStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: "test prompt",
        compressionType: CompressionTypeEnum.TONL,
      };

      const result = await optimizer.optimize(request);

      // Should return passthrough result, not throw
      expect(result.optimizedPrompt).toBe("test prompt");
      expect(result.metadata.compressionType).toBe(CompressionTypeEnum.TONL);
    });

    it("should throw error for unsupported compression type", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const strategies = new Map();
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: "test",
        compressionType: CompressionTypeEnum.JSON,
      };

      await expect(optimizer.optimize(request)).rejects.toThrow("Unsupported compression type");
    });

    it("should validate metadata using validator registry", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const mockStrategy = createMockStrategy(CompressionTypeEnum.JSON, "{}", {
        objectKeyCount: 0,
      });

      const strategies = new Map([[CompressionTypeEnum.JSON, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
        strategyVersion: "1.0.0",
      });

      const request: OptimizationRequest = {
        prompt: "{}",
        compressionType: CompressionTypeEnum.JSON,
      };

      const result = await optimizer.optimize(request);

      expect(result.metadata.compressionType).toBe(CompressionTypeEnum.JSON);
      expect(result.metadata.strategyVersion).toBe("1.0.0");
      expect(Array.isArray(result.metadata.appliedCleaners)).toBe(true);
    });

    it("should validate payload using validator registry", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const payload = {
        lineCount: 10,
        objectKeyCount: 5,
        arrayCount: 2,
      };
      const mockStrategy = createMockStrategy(CompressionTypeEnum.TOON, "toon output", payload);

      const strategies = new Map([[CompressionTypeEnum.TOON, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: '{"key":"value"}',
        compressionType: CompressionTypeEnum.TOON,
      };

      const result = await optimizer.optimize(request);

      // Payload should be validated
      expect(result.optimizedPayload).toBeDefined();
      expect((result.optimizedPayload as { lineCount: number }).lineCount).toBe(10);
    });

    it("should persist analytics snapshot to telemetry storage", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const mockStrategy = createMockStrategy(CompressionTypeEnum.MARKDOWN, "optimized");

      const strategies = new Map([[CompressionTypeEnum.MARKDOWN, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: "original prompt",
        compressionType: CompressionTypeEnum.MARKDOWN,
      };

      await optimizer.optimize(request);

      expect(telemetryStorage.persistSnapshot).toHaveBeenCalledTimes(1);
      const snapshot = (telemetryStorage.persistSnapshot as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as AnalyticsSnapshot;

      expect(snapshot).toBeDefined();
      expect(snapshot.metricsBefore.rawPromptText).toBe("original prompt");
      expect(snapshot.metricsAfter.optimizedPromptText).toBe("optimized");
    });

    it("should handle empty prompt", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const mockStrategy = createMockStrategy(CompressionTypeEnum.MARKDOWN, "");

      const strategies = new Map([[CompressionTypeEnum.MARKDOWN, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: "",
        compressionType: CompressionTypeEnum.MARKDOWN,
      };

      const result = await optimizer.optimize(request);

      expect(result.optimizedPrompt).toBe("");
      expect(result.analytics.metricsBefore.rawPromptTokenCount).toBe(0);
      expect(result.analytics.metricsAfter.optimizedPromptTokenCount).toBe(0);
    });

    it("should use default strategy version when not provided", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const mockStrategy = createMockStrategy(CompressionTypeEnum.JSON, "{}");

      const strategies = new Map([[CompressionTypeEnum.JSON, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
        // strategyVersion not provided
      });

      const request: OptimizationRequest = {
        prompt: "{}",
        compressionType: CompressionTypeEnum.JSON,
      };

      const result = await optimizer.optimize(request);

      expect(result.metadata.strategyVersion).toBe("0.1.0"); // Default version
    });

    it("should handle strategy that returns unchanged content", async () => {
      const tokenizer = createMockTokenizer();
      const telemetryStorage = createMockTelemetryStorage();
      const validatorRegistry = createMockValidatorRegistry();

      const cleanedText = "cleaned text";
      const mockStrategy: CompressionStrategy = {
        type: CompressionTypeEnum.MARKDOWN,
        format: vi.fn().mockResolvedValue({
          optimizedText: cleanedText, // Same as cleaned input
          optimizedPayload: undefined,
        }),
      };

      const strategies = new Map([[CompressionTypeEnum.MARKDOWN, mockStrategy]]);
      const optimizer = new TokenOptimizer({
        tokenizer,
        telemetryStorage,
        strategies,
        validatorRegistry,
      });

      const request: OptimizationRequest = {
        prompt: "  cleaned text  ",
        compressionType: CompressionTypeEnum.MARKDOWN,
        cleanOptions: {
          trim: true,
          collapseWhitespace: true,
          normalizeNewlines: true,
          jsonFlatten: false,
        },
      };

      // Should not throw, but may log warning
      const result = await optimizer.optimize(request);

      expect(result.optimizedPrompt).toBe(cleanedText);
    });
  });
});

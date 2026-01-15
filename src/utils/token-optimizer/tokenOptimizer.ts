import { createClassLogger } from "@/shared/utils/logging/logger.utils";
import { buildAnalyticsSnapshot } from "./analytics";
import { cleanPrompt } from "./cleaner";
import type { CompressionStrategy } from "./strategies/base";
import { PassthroughStrategy } from "./strategies/passthroughStrategy";
import type { TelemetryStorage } from "./telemetryStorage";
import {
  type OptimizationMetadata,
  type OptimizationRequest,
  type OptimizationResult,
  optimizationRequestSchema,
} from "./tokenOptimizer.types";
import type { TokenizerAdapter } from "./tokenizer";
import type { CompressionValidatorRegistry } from "./validatorRegistry";

const logger = createClassLogger("TokenOptimizer");

export interface TokenOptimizerDependencies {
  readonly tokenizer: TokenizerAdapter;
  readonly telemetryStorage: TelemetryStorage;
  readonly strategies: Map<OptimizationRequest["compressionType"], CompressionStrategy>;
  readonly validatorRegistry: CompressionValidatorRegistry;
  readonly strategyVersion?: string;
}

export class TokenOptimizer {
  private readonly tokenizer: TokenizerAdapter;
  private readonly telemetryStorage: TelemetryStorage;
  private readonly strategies: Map<OptimizationRequest["compressionType"], CompressionStrategy>;
  private readonly validatorRegistry: CompressionValidatorRegistry;
  private readonly strategyVersion: string;

  public constructor(dependencies: TokenOptimizerDependencies) {
    this.tokenizer = dependencies.tokenizer;
    this.telemetryStorage = dependencies.telemetryStorage;
    this.strategies = dependencies.strategies;
    this.validatorRegistry = dependencies.validatorRegistry;
    this.strategyVersion = dependencies.strategyVersion ?? "0.1.0";
  }

  public async optimize(rawRequest: OptimizationRequest): Promise<OptimizationResult> {
    const request = optimizationRequestSchema.parse(rawRequest);
    const beforeEstimate = this.tokenizer.estimate(request.prompt);

    const cleanResult = cleanPrompt({
      text: request.prompt,
      options: request.cleanOptions,
    });

    const strategy = this.strategies.get(request.compressionType);

    if (!strategy) {
      throw new Error(`Unsupported compression type: ${request.compressionType}`);
    }

    // Try to format with the requested strategy, but fall back to passthrough if it fails
    // This handles cases where strategies like TONL/TOON require JSON but receive other formats
    let formatted: Awaited<ReturnType<CompressionStrategy["format"]>>;
    let usedFallback = false;
    try {
      formatted = await Promise.resolve(strategy.format(cleanResult.output, request));

      // Verify that optimization actually changed something
      // If the optimized text is the same as cleaned input, the strategy didn't optimize
      if (formatted.optimizedText === cleanResult.output) {
        logger.warn("Strategy returned unchanged content (no optimization applied)", {
          compressionType: request.compressionType,
          strategyType: strategy.type,
        });
      }
    } catch (error) {
      // If strategy fails (e.g., TONL/TOON with non-JSON input), fall back to passthrough
      // This ensures we always return a result, even if optimization fails
      logger.warn("Strategy failed, falling back to passthrough", {
        compressionType: request.compressionType,
        strategyType: strategy.type,
        error: error instanceof Error ? error.message : String(error),
      });
      const fallbackStrategy = new PassthroughStrategy(request.compressionType);
      formatted = await Promise.resolve(fallbackStrategy.format(cleanResult.output, request));
      usedFallback = true;
    }

    const afterEstimate = this.tokenizer.estimate(formatted.optimizedText);

    // Debug log: Show before and after prompt sizes
    const beforeSize = new TextEncoder().encode(request.prompt).length;
    const afterSize = new TextEncoder().encode(formatted.optimizedText).length;
    const sizeReduction = beforeSize - afterSize;
    const sizeReductionPercent =
      beforeSize > 0 ? ((sizeReduction / beforeSize) * 100).toFixed(2) : "0.00";
    const tokenReduction = beforeEstimate.tokenCount - afterEstimate.tokenCount;
    const tokenReductionPercent =
      beforeEstimate.tokenCount > 0
        ? ((tokenReduction / beforeEstimate.tokenCount) * 100).toFixed(2)
        : "0.00";

    logger.debug("Token optimization completed", {
      compressionType: request.compressionType,
      strategyType: strategy.type,
      usedFallback,
      before: {
        chars: request.prompt.length,
        bytes: beforeSize,
        tokens: beforeEstimate.tokenCount,
      },
      after: {
        chars: formatted.optimizedText.length,
        bytes: afterSize,
        tokens: afterEstimate.tokenCount,
      },
      reduction: {
        bytes: sizeReduction,
        bytesPercent: `${sizeReductionPercent}%`,
        tokens: tokenReduction,
        tokensPercent: `${tokenReductionPercent}%`,
      },
    });

    // Log if tokens didn't decrease (or increased)
    if (afterEstimate.tokenCount >= beforeEstimate.tokenCount) {
      logger.warn("Token optimization did not reduce token count", {
        compressionType: request.compressionType,
        tokensBefore: beforeEstimate.tokenCount,
        tokensAfter: afterEstimate.tokenCount,
        usedFallback,
        strategyType: strategy.type,
      });
    }

    const analytics = buildAnalyticsSnapshot({
      before: {
        text: request.prompt,
        estimate: beforeEstimate,
      },
      after: {
        text: formatted.optimizedText,
        estimate: afterEstimate,
      },
    });

    const metadata: OptimizationMetadata = this.validatorRegistry.validateMetadata({
      compressionType: request.compressionType,
      strategyVersion: this.strategyVersion,
      appliedCleaners: cleanResult.appliedTransforms
        .filter((transform) => transform.applied)
        .map((transform) => transform.name),
    });

    const validatedPayload = this.validatorRegistry.validatePayload(
      request.compressionType,
      formatted.optimizedPayload
    );

    const result: OptimizationResult = {
      optimizedPrompt: formatted.optimizedText,
      optimizedPayload: validatedPayload,
      analytics,
      metadata,
    };

    await this.telemetryStorage.persistSnapshot(analytics);

    return result;
  }
}

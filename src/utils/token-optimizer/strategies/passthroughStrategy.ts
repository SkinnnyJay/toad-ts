import type { OptimizationRequest } from "../tokenOptimizer.types";
import type { CompressionTypeEnum } from "../types";
import type { CompressionOutcome, CompressionStrategy } from "./base";

export class PassthroughStrategy implements CompressionStrategy {
  public constructor(private readonly compressionType: CompressionTypeEnum) {}

  public get type(): CompressionTypeEnum {
    return this.compressionType;
  }

  public format(_cleanedInput: string, _request: OptimizationRequest): CompressionOutcome {
    return {
      optimizedText: _cleanedInput,
    };
  }
}

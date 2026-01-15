import type { CompressionStrategy } from "./strategies/base";
import { CsvCompressionStrategy } from "./strategies/csvStrategy";
import { JsonCompressionStrategy } from "./strategies/jsonStrategy";
import { MarkdownCompressionStrategy } from "./strategies/markdownStrategy";
import { PassthroughStrategy } from "./strategies/passthroughStrategy";
import { TonlCompressionStrategy } from "./strategies/tonlStrategy";
import { ToonCompressionStrategy } from "./strategies/toonStrategy";
import { XmlCompressionStrategy } from "./strategies/xmlStrategy";
import { YamlCompressionStrategy } from "./strategies/yamlStrategy";
import { type TelemetryFactoryOptions, createTelemetryStorage } from "./telemetryFactory";
import type { TelemetryStorage } from "./telemetryStorage";
import { TokenOptimizer } from "./tokenOptimizer";
import { type CompressionType, compressionTypeSchema } from "./tokenOptimizer.types";
import { type TokenizerAdapter, createDefaultTokenizerAdapter } from "./tokenizer";
import { CompressionTypeEnum } from "./types";
import {
  type CompressionValidatorRegistry,
  createDefaultValidatorRegistry,
} from "./validatorRegistry";

export interface TokenOptimizerFactoryOptions {
  readonly tokenizer?: TokenizerAdapter;
  readonly telemetryStorage?: TelemetryStorage;
  readonly strategies?: CompressionStrategy[];
  readonly telemetryFactoryOptions?: TelemetryFactoryOptions;
  readonly validatorRegistry?: CompressionValidatorRegistry;
  readonly strategyVersion?: string;
}

const buildDefaultStrategies = (): Map<CompressionType, CompressionStrategy> => {
  const strategyMap = new Map<CompressionType, CompressionStrategy>();

  compressionTypeSchema.options.forEach((type) => {
    strategyMap.set(type, new PassthroughStrategy(type));
  });

  strategyMap.set(CompressionTypeEnum.JSON, new JsonCompressionStrategy());
  strategyMap.set(CompressionTypeEnum.MARKDOWN, new MarkdownCompressionStrategy());
  strategyMap.set(CompressionTypeEnum.XML, new XmlCompressionStrategy());
  strategyMap.set(CompressionTypeEnum.YAML, new YamlCompressionStrategy());
  strategyMap.set(CompressionTypeEnum.CSV, new CsvCompressionStrategy());
  strategyMap.set(CompressionTypeEnum.TONL, new TonlCompressionStrategy());
  strategyMap.set(CompressionTypeEnum.TOON, new ToonCompressionStrategy());

  return strategyMap;
};

const createStrategyMap = (
  strategies: CompressionStrategy[] | undefined
): Map<CompressionType, CompressionStrategy> => {
  const map = buildDefaultStrategies();

  if (!strategies || strategies.length === 0) {
    return map;
  }

  strategies.forEach((strategy) => {
    map.set(strategy.type, strategy);
  });

  return map;
};

export const createTokenOptimizer = (options?: TokenOptimizerFactoryOptions): TokenOptimizer => {
  const tokenizer = options?.tokenizer ?? createDefaultTokenizerAdapter();
  const telemetryStorage =
    options?.telemetryStorage ?? createTelemetryStorage(options?.telemetryFactoryOptions);
  const strategies = createStrategyMap(options?.strategies);
  const validatorRegistry = options?.validatorRegistry ?? createDefaultValidatorRegistry();

  return new TokenOptimizer({
    tokenizer,
    telemetryStorage,
    strategies,
    validatorRegistry,
    strategyVersion: options?.strategyVersion,
  });
};

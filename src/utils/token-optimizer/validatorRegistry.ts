import type { z } from "zod";

import {
  type CompressionType,
  type OptimizationMetadata,
  csvOptimizationPayloadSchema,
  jsonOptimizationPayloadSchema,
  markdownOptimizationPayloadSchema,
  optimizationMetadataSchema,
  tonlOptimizationPayloadSchema,
  toonOptimizationPayloadSchema,
  xmlOptimizationPayloadSchema,
  yamlOptimizationPayloadSchema,
} from "./tokenOptimizer.types";
import { CompressionTypeEnum } from "./types";

type PayloadSchema = z.ZodType<unknown>;

const DEFAULT_PAYLOAD_SCHEMAS = new Map<CompressionType, PayloadSchema>([
  [CompressionTypeEnum.JSON, jsonOptimizationPayloadSchema],
  [CompressionTypeEnum.MARKDOWN, markdownOptimizationPayloadSchema],
  [CompressionTypeEnum.XML, xmlOptimizationPayloadSchema],
  [CompressionTypeEnum.YAML, yamlOptimizationPayloadSchema],
  [CompressionTypeEnum.CSV, csvOptimizationPayloadSchema],
  [CompressionTypeEnum.TOON, toonOptimizationPayloadSchema],
  [CompressionTypeEnum.TONL, tonlOptimizationPayloadSchema],
]);

export class CompressionValidatorRegistry {
  private readonly payloadSchemas = new Map<CompressionType, PayloadSchema>();
  private readonly metadataSchema = optimizationMetadataSchema;

  public constructor(initialSchemas?: Iterable<[CompressionType, PayloadSchema]>) {
    DEFAULT_PAYLOAD_SCHEMAS.forEach((schema, compressionType) => {
      this.payloadSchemas.set(compressionType, schema);
    });

    if (initialSchemas) {
      for (const [compressionType, schema] of Array.from(initialSchemas)) {
        this.registerPayloadSchema(compressionType, schema);
      }
    }
  }

  public registerPayloadSchema(compressionType: CompressionType, schema: PayloadSchema): void {
    this.payloadSchemas.set(compressionType, schema);
  }

  public getPayloadSchema(compressionType: CompressionType): PayloadSchema | undefined {
    return this.payloadSchemas.get(compressionType);
  }

  public validatePayload<T = unknown>(compressionType: CompressionType, payload: T): T {
    if (payload === undefined || payload === null) {
      return payload;
    }

    const schema = this.payloadSchemas.get(compressionType);
    if (!schema) {
      return payload;
    }

    return schema.parse(payload) as T;
  }

  public validateMetadata(metadata: OptimizationMetadata): OptimizationMetadata {
    return this.metadataSchema.parse(metadata);
  }
}

export const createDefaultValidatorRegistry = (): CompressionValidatorRegistry =>
  new CompressionValidatorRegistry();

import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { OptimizationMetadata } from "../../../src/utils/token-optimizer/tokenOptimizer.types";
import { CompressionTypeEnum } from "../../../src/utils/token-optimizer/types";
import { CompressionValidatorRegistry } from "../../../src/utils/token-optimizer/validatorRegistry";

describe("CompressionValidatorRegistry", () => {
  describe("validatePayload", () => {
    it("should validate JSON payload", () => {
      const registry = new CompressionValidatorRegistry();
      const payload = { key: "value" };

      const result = registry.validatePayload(CompressionTypeEnum.JSON, payload);

      expect(result).toBeDefined();
      expect(result).toEqual(payload);
    });

    it("should validate Markdown payload", () => {
      const registry = new CompressionValidatorRegistry();
      const payload = {
        headingCount: 2,
        listCount: 3,
        tableCount: 1,
        codeBlockCount: 0,
      };

      const result = registry.validatePayload(CompressionTypeEnum.MARKDOWN, payload);

      expect(result).toBeDefined();
      expect((result as { headingCount: number }).headingCount).toBe(2);
    });

    it("should validate XML payload", () => {
      const registry = new CompressionValidatorRegistry();
      const payload = {
        elementCount: 5,
        attributeCount: 3,
        hasXmlDeclaration: true,
      };

      const result = registry.validatePayload(CompressionTypeEnum.XML, payload);

      expect(result).toBeDefined();
      expect((result as { elementCount: number }).elementCount).toBe(5);
    });

    it("should validate YAML payload", () => {
      const registry = new CompressionValidatorRegistry();
      const payload = {
        lineCount: 10,
        keyCount: 5,
        sequenceCount: 2,
        scalarCount: 8,
      };

      const result = registry.validatePayload(CompressionTypeEnum.YAML, payload);

      expect(result).toBeDefined();
      expect((result as { keyCount: number }).keyCount).toBe(5);
    });

    it("should validate CSV payload", () => {
      const registry = new CompressionValidatorRegistry();
      const payload = {
        rowCount: 10,
        columnCount: 3,
        emptyCellCount: 2,
        delimiter: ",",
      };

      const result = registry.validatePayload(CompressionTypeEnum.CSV, payload);

      expect(result).toBeDefined();
      expect((result as { rowCount: number }).rowCount).toBe(10);
    });

    it("should validate TOON payload", () => {
      const registry = new CompressionValidatorRegistry();
      const payload = {
        lineCount: 5,
        objectKeyCount: 3,
        arrayCount: 1,
      };

      const result = registry.validatePayload(CompressionTypeEnum.TOON, payload);

      expect(result).toBeDefined();
      expect((result as { objectKeyCount: number }).objectKeyCount).toBe(3);
    });

    it("should validate TONL payload", () => {
      const registry = new CompressionValidatorRegistry();
      const payload = {
        lineCount: 5,
        delimiter: ",",
        includesTypeAnnotations: false,
      };

      const result = registry.validatePayload(CompressionTypeEnum.TONL, payload);

      expect(result).toBeDefined();
      expect((result as { delimiter: string }).delimiter).toBe(",");
    });

    it("should return undefined/null payload as-is", () => {
      const registry = new CompressionValidatorRegistry();

      expect(registry.validatePayload(CompressionTypeEnum.JSON, undefined)).toBeUndefined();
      expect(registry.validatePayload(CompressionTypeEnum.JSON, null)).toBeNull();
    });

    it("should throw error for invalid payload", () => {
      const registry = new CompressionValidatorRegistry();
      const invalidPayload = {
        invalidField: "value",
      };

      expect(() =>
        registry.validatePayload(CompressionTypeEnum.MARKDOWN, invalidPayload)
      ).toThrow();
    });

    it("should return payload as-is for unknown compression type", () => {
      const registry = new CompressionValidatorRegistry();
      const payload = { custom: "data" };

      // TypeScript won't allow this, but runtime might
      const result = registry.validatePayload("UNKNOWN" as CompressionTypeEnum, payload);

      expect(result).toBe(payload);
    });
  });

  describe("validateMetadata", () => {
    it("should validate valid metadata", () => {
      const registry = new CompressionValidatorRegistry();
      const metadata: OptimizationMetadata = {
        compressionType: CompressionTypeEnum.JSON,
        strategyVersion: "1.0.0",
        appliedCleaners: ["trim", "collapseWhitespace"],
      };

      const result = registry.validateMetadata(metadata);

      expect(result).toEqual(metadata);
    });

    it("should throw error for invalid metadata", () => {
      const registry = new CompressionValidatorRegistry();
      const invalidMetadata = {
        compressionType: "INVALID",
        strategyVersion: "1.0.0",
        appliedCleaners: [],
      };

      expect(() => registry.validateMetadata(invalidMetadata as OptimizationMetadata)).toThrow();
    });
  });

  describe("registerPayloadSchema", () => {
    it("should register custom payload schema", () => {
      const registry = new CompressionValidatorRegistry();
      const customSchema = z.object({
        customField: z.string(),
      });

      registry.registerPayloadSchema(CompressionTypeEnum.JSON, customSchema);

      const payload = { customField: "value" };
      const result = registry.validatePayload(CompressionTypeEnum.JSON, payload);

      expect(result).toBeDefined();
      expect((result as { customField: string }).customField).toBe("value");
    });

    it("should override default schema when registering", () => {
      const registry = new CompressionValidatorRegistry();
      const customSchema = z.object({
        test: z.number(),
      });

      registry.registerPayloadSchema(CompressionTypeEnum.MARKDOWN, customSchema);

      const payload = { test: 42 };
      const result = registry.validatePayload(CompressionTypeEnum.MARKDOWN, payload);

      expect((result as { test: number }).test).toBe(42);
    });
  });

  describe("getPayloadSchema", () => {
    it("should return schema for known compression type", () => {
      const registry = new CompressionValidatorRegistry();

      const schema = registry.getPayloadSchema(CompressionTypeEnum.JSON);

      expect(schema).toBeDefined();
    });

    it("should return undefined for unknown compression type", () => {
      const registry = new CompressionValidatorRegistry();

      const schema = registry.getPayloadSchema("UNKNOWN" as CompressionTypeEnum);

      expect(schema).toBeUndefined();
    });
  });
});

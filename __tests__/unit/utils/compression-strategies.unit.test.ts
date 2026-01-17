import { describe, expect, it } from "vitest";
import { CsvCompressionStrategy } from "../../../src/utils/token-optimizer/strategies/csvStrategy";
import { JsonCompressionStrategy } from "../../../src/utils/token-optimizer/strategies/jsonStrategy";
import { MarkdownCompressionStrategy } from "../../../src/utils/token-optimizer/strategies/markdownStrategy";
import { PassthroughStrategy } from "../../../src/utils/token-optimizer/strategies/passthroughStrategy";
import { TonlCompressionStrategy } from "../../../src/utils/token-optimizer/strategies/tonlStrategy";
import { ToonCompressionStrategy } from "../../../src/utils/token-optimizer/strategies/toonStrategy";
import { XmlCompressionStrategy } from "../../../src/utils/token-optimizer/strategies/xmlStrategy";
import { YamlCompressionStrategy } from "../../../src/utils/token-optimizer/strategies/yamlStrategy";
import type { OptimizationRequest } from "../../../src/utils/token-optimizer/tokenOptimizer.types";
import { CompressionTypeEnum } from "../../../src/utils/token-optimizer/types";

describe("Compression Strategies", () => {
  const createRequest = (
    compressionType: CompressionTypeEnum,
    prompt: string
  ): OptimizationRequest => ({
    prompt,
    compressionType,
  });

  describe("JsonCompressionStrategy", () => {
    it("should compress JSON with sorted keys", () => {
      const strategy = new JsonCompressionStrategy();
      const input = '{\n  "zebra": "value",\n  "apple": "value2"\n}';
      const request = createRequest(CompressionTypeEnum.JSON, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toContain('"apple"');
      expect(result.optimizedText).toContain('"zebra"');
      expect(result.optimizedPayload).toBeDefined();
    });

    it("should throw error for invalid JSON", () => {
      const strategy = new JsonCompressionStrategy();
      const input = "{ invalid json }";
      const request = createRequest(CompressionTypeEnum.JSON, input);

      expect(() => strategy.format(input, request)).toThrow("Invalid JSON");
    });

    it("should handle nested JSON objects", () => {
      const strategy = new JsonCompressionStrategy();
      const input = '{"outer":{"inner":"value"}}';
      const request = createRequest(CompressionTypeEnum.JSON, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toBeDefined();
      expect(result.optimizedPayload).toBeDefined();
    });
  });

  describe("MarkdownCompressionStrategy", () => {
    it("should normalize markdown formatting", () => {
      const strategy = new MarkdownCompressionStrategy();
      const input = "# Heading\n\nParagraph with   extra   spaces";
      const request = createRequest(CompressionTypeEnum.MARKDOWN, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toContain("# Heading");
      expect(result.optimizedPayload).toBeDefined();
      expect((result.optimizedPayload as { headingCount: number }).headingCount).toBeGreaterThan(0);
    });

    it("should handle markdown lists", () => {
      const strategy = new MarkdownCompressionStrategy();
      const input = "- Item 1\n- Item 2\n- Item 3";
      const request = createRequest(CompressionTypeEnum.MARKDOWN, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toContain("- Item");
      expect((result.optimizedPayload as { listCount: number }).listCount).toBeGreaterThan(0);
    });

    it("should handle code blocks", () => {
      const strategy = new MarkdownCompressionStrategy();
      const input = "```typescript\nconst x = 1;\n```";
      const request = createRequest(CompressionTypeEnum.MARKDOWN, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toContain("```");
      expect(
        (result.optimizedPayload as { codeBlockCount: number }).codeBlockCount
      ).toBeGreaterThan(0);
    });
  });

  describe("XmlCompressionStrategy", () => {
    it("should normalize XML formatting", () => {
      const strategy = new XmlCompressionStrategy();
      const input = "<root>\n  <child>value</child>\n</root>";
      const request = createRequest(CompressionTypeEnum.XML, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toContain("<root>");
      expect(result.optimizedPayload).toBeDefined();
      expect((result.optimizedPayload as { elementCount: number }).elementCount).toBeGreaterThan(0);
    });

    it("should preserve XML declaration", () => {
      const strategy = new XmlCompressionStrategy();
      const input = '<?xml version="1.0"?>\n<root/>';
      const request = createRequest(CompressionTypeEnum.XML, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toContain("<?xml");
      expect((result.optimizedPayload as { hasXmlDeclaration: boolean }).hasXmlDeclaration).toBe(
        true
      );
    });

    it("should handle XML attributes", () => {
      const strategy = new XmlCompressionStrategy();
      const input = '<root attr="value"><child/></root>';
      const request = createRequest(CompressionTypeEnum.XML, input);

      const result = strategy.format(input, request);

      expect(
        (result.optimizedPayload as { attributeCount: number }).attributeCount
      ).toBeGreaterThan(0);
    });

    it("should throw error for invalid XML", () => {
      const strategy = new XmlCompressionStrategy();
      const input = "<root><unclosed";
      const request = createRequest(CompressionTypeEnum.XML, input);

      expect(() => strategy.format(input, request)).toThrow("Invalid XML");
    });
  });

  describe("YamlCompressionStrategy", () => {
    it("should normalize YAML formatting", () => {
      const strategy = new YamlCompressionStrategy();
      const input = "key: value\nnested:\n  subkey: subvalue";
      const request = createRequest(CompressionTypeEnum.YAML, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toContain("key:");
      expect(result.optimizedPayload).toBeDefined();
      expect((result.optimizedPayload as { keyCount: number }).keyCount).toBeGreaterThan(0);
    });

    it("should handle YAML arrays", () => {
      const strategy = new YamlCompressionStrategy();
      const input = "items:\n  - one\n  - two\n  - three";
      const request = createRequest(CompressionTypeEnum.YAML, input);

      const result = strategy.format(input, request);

      expect((result.optimizedPayload as { sequenceCount: number }).sequenceCount).toBeGreaterThan(
        0
      );
    });

    it("should throw error for invalid YAML", () => {
      const strategy = new YamlCompressionStrategy();
      const input = "invalid: yaml: : : :";
      const request = createRequest(CompressionTypeEnum.YAML, input);

      expect(() => strategy.format(input, request)).toThrow("Invalid YAML");
    });
  });

  describe("CsvCompressionStrategy", () => {
    it("should normalize CSV formatting", () => {
      const strategy = new CsvCompressionStrategy();
      const input = "name,age\nJohn,30\nJane,25";
      const request = createRequest(CompressionTypeEnum.CSV, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toContain("name,age");
      expect(result.optimizedPayload).toBeDefined();
      expect((result.optimizedPayload as { rowCount: number }).rowCount).toBeGreaterThan(0);
    });

    it("should handle empty cells", () => {
      const strategy = new CsvCompressionStrategy();
      const input = "a,b,c\n1,,3";
      const request = createRequest(CompressionTypeEnum.CSV, input);

      const result = strategy.format(input, request);

      expect(
        (result.optimizedPayload as { emptyCellCount: number }).emptyCellCount
      ).toBeGreaterThan(0);
    });

    it("should handle malformed CSV gracefully", () => {
      const strategy = new CsvCompressionStrategy();
      // PapaParse is lenient, so test with something that actually fails
      const input = "a,b\n1,2,3,4"; // Mismatched columns - this should still parse
      const request = createRequest(CompressionTypeEnum.CSV, input);

      // PapaParse handles this, so it won't throw
      const result = strategy.format(input, request);
      expect(result.optimizedText).toBeDefined();
    });
  });

  describe("ToonCompressionStrategy", () => {
    it("should compress JSON to TOON format", async () => {
      const strategy = new ToonCompressionStrategy();
      const input = '{"key":"value","nested":{"a":1}}';
      const request = createRequest(CompressionTypeEnum.TOON, input);

      const result = await strategy.format(input, request);

      expect(result.optimizedText).toBeDefined();
      expect(result.optimizedPayload).toBeDefined();
      expect((result.optimizedPayload as { lineCount: number }).lineCount).toBeGreaterThan(0);
    });

    it("should handle complex nested structures", async () => {
      const strategy = new ToonCompressionStrategy();
      const input = '{"array":[1,2,3],"object":{"nested":"value"}}';
      const request = createRequest(CompressionTypeEnum.TOON, input);

      const result = await strategy.format(input, request);

      expect((result.optimizedPayload as { arrayCount: number }).arrayCount).toBeGreaterThan(0);
      expect(
        (result.optimizedPayload as { objectKeyCount: number }).objectKeyCount
      ).toBeGreaterThan(0);
    });
  });

  describe("TonlCompressionStrategy", () => {
    it("should compress JSON to TONL format", async () => {
      const strategy = new TonlCompressionStrategy();
      const input = '{"key":"value"}';
      const request = createRequest(CompressionTypeEnum.TONL, input);

      const result = await strategy.format(input, request);

      expect(result.optimizedText).toBeDefined();
      expect(result.optimizedPayload).toBeDefined();
      expect((result.optimizedPayload as { lineCount: number }).lineCount).toBeGreaterThan(0);
      expect((result.optimizedPayload as { delimiter: string }).delimiter).toBeTruthy();
    });

    it("should detect type annotations", async () => {
      const strategy = new TonlCompressionStrategy();
      const input = '{"string":"text","number":42}';
      const request = createRequest(CompressionTypeEnum.TONL, input);

      const result = await strategy.format(input, request);

      expect(result.optimizedPayload).toBeDefined();
      expect(
        typeof (result.optimizedPayload as { includesTypeAnnotations: boolean })
          .includesTypeAnnotations
      ).toBe("boolean");
    });
  });

  describe("PassthroughStrategy", () => {
    it("should return input unchanged", () => {
      const strategy = new PassthroughStrategy(CompressionTypeEnum.JSON);
      const input = "any text content";
      const request = createRequest(CompressionTypeEnum.JSON, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toBe(input);
      expect(result.optimizedPayload).toBeUndefined();
    });

    it("should work with any compression type", () => {
      const strategy = new PassthroughStrategy(CompressionTypeEnum.MARKDOWN);
      const input = "markdown content";
      const request = createRequest(CompressionTypeEnum.MARKDOWN, input);

      const result = strategy.format(input, request);

      expect(result.optimizedText).toBe(input);
    });
  });
});

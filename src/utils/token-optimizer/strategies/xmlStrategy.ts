import { XMLBuilder, XMLParser } from "fast-xml-parser";

import type { OptimizationRequest } from "../tokenOptimizer.types";
import { type XmlOptimizationPayload, xmlOptimizationPayloadSchema } from "../tokenOptimizer.types";
import { CompressionTypeEnum } from "../types";
import type { CompressionOutcome, CompressionStrategy } from "./base";

type XmlTree = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  allowBooleanAttributes: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressEmptyNode: true,
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const collectXmlStats = (tree: XmlTree, hasDeclaration: boolean): XmlOptimizationPayload => {
  let elementCount = 0;
  let attributeCount = 0;

  const traverse = (node: XmlTree): void => {
    if (Array.isArray(node)) {
      for (const child of node) {
        traverse(child as XmlTree);
      }
      return;
    }

    if (!isObject(node)) {
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "#text" || key === "#cdata-section") {
        continue;
      }

      if (key.startsWith("@_")) {
        attributeCount += 1;
        continue;
      }

      elementCount += 1;

      traverse(value as XmlTree);
    }
  };

  traverse(tree);

  return xmlOptimizationPayloadSchema.parse({
    elementCount,
    attributeCount,
    hasXmlDeclaration: hasDeclaration,
  });
};

const applyXmlDeclaration = (original: string, normalized: string): string => {
  const trimmedOriginal = original.trimStart();
  const declarationMatch = trimmedOriginal.match(/^<\?xml[^>]+>\s*/i);
  if (!declarationMatch) {
    return normalized;
  }

  const fullDeclaration = declarationMatch[0];
  const declaration = fullDeclaration.trim();
  const separator = fullDeclaration.slice(declaration.length);
  return `${declaration}${separator}${normalized}`;
};

export class XmlCompressionStrategy implements CompressionStrategy {
  public readonly type = CompressionTypeEnum.XML;

  public format(cleanedInput: string, _request: OptimizationRequest): CompressionOutcome {
    let parsed: unknown;

    try {
      parsed = parser.parse(cleanedInput);
    } catch (_error) {
      throw new Error("Invalid XML input provided to XmlCompressionStrategy.");
    }

    const hasDeclaration = /^<\?xml/i.test(cleanedInput.trimStart());
    const payload = collectXmlStats(parsed as XmlTree, hasDeclaration);
    const normalizedWithoutDeclaration = builder.build(parsed);
    const normalized = applyXmlDeclaration(cleanedInput, normalizedWithoutDeclaration);

    return {
      optimizedText: normalized.trim(),
      optimizedPayload: payload,
    };
  }
}

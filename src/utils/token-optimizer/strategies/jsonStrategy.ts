import { isValidJSON } from "../stubs/json";
import type { OptimizationRequest } from "../tokenOptimizer.types";
import {
  type JsonOptimizationPayload,
  type JsonValue,
  jsonOptimizationPayloadSchema,
} from "../tokenOptimizer.types";
import { CompressionTypeEnum } from "../types";
import type { CompressionOutcome, CompressionStrategy } from "./base";

const isJsonObject = (value: JsonValue): value is { readonly [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeJsonValue = (value: unknown): JsonValue | undefined => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value as JsonValue;
  }

  if (Array.isArray(value)) {
    const normalizedArray = value
      .map((entry) => normalizeJsonValue(entry))
      .filter((entry): entry is JsonValue => entry !== undefined);
    return normalizedArray as JsonValue;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null)
      .map(([key, entryValue]) => [key, normalizeJsonValue(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    const normalizedObject: Record<string, JsonValue> = {};
    entries.forEach(([key, entryValue]) => {
      if (entryValue !== undefined) {
        normalizedObject[key] = entryValue;
      }
    });

    return normalizedObject as JsonValue;
  }

  return undefined;
};

const stringifyDeterministic = (value: JsonValue): string => {
  if (isJsonObject(value)) {
    const entries = Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => `"${key}":${stringifyDeterministic(entryValue)}`);

    return `{${entries.join(",")}}`;
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stringifyDeterministic(entry)).join(",")}]`;
  }

  return JSON.stringify(value);
};

export class JsonCompressionStrategy implements CompressionStrategy {
  public readonly type = CompressionTypeEnum.JSON;

  public format(cleanedInput: string, _request: OptimizationRequest): CompressionOutcome {
    if (!isValidJSON(cleanedInput)) {
      throw new Error("Invalid JSON input provided to JsonCompressionStrategy.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleanedInput);
    } catch (_error) {
      throw new Error("Invalid JSON input provided to JsonCompressionStrategy.");
    }

    const normalized = normalizeJsonValue(parsed);

    if (normalized === undefined) {
      throw new Error("Unable to normalize JSON input.");
    }

    const payload: JsonOptimizationPayload = jsonOptimizationPayloadSchema.parse(normalized);

    return {
      optimizedText: stringifyDeterministic(payload),
      optimizedPayload: payload,
    };
  }
}

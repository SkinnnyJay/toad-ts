import type { OptimizationRequest } from "../tokenOptimizer.types";
import { tonlOptimizationPayloadSchema } from "../tokenOptimizer.types";
import { CompressionTypeEnum } from "../types";

import type { CompressionOutcome, CompressionStrategy } from "./base";

type TonlModule = {
  encodeSmart?: (value: unknown) => string;
  encodeTONL?: (value: unknown) => string;
  detectDelimiter?: (text: string) => string;
};

let tonlModulePromise: Promise<TonlModule> | null = null;

const ensureTonlModule = async (): Promise<TonlModule> => {
  if (!tonlModulePromise) {
    tonlModulePromise = (async (): Promise<TonlModule> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const tonl = await import("tonl");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return tonl as TonlModule;
      } catch {
        // tonl package not available - return stub
        return {
          encodeTONL: (value: unknown) => JSON.stringify(value),
        };
      }
    })();
  }

  return tonlModulePromise;
};

export class TonlCompressionStrategy implements CompressionStrategy {
  public readonly type = CompressionTypeEnum.TONL;

  public async format(
    cleanedInput: string,
    _request: OptimizationRequest
  ): Promise<CompressionOutcome> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(cleanedInput);
    } catch (_error) {
      throw new Error("Invalid JSON input provided to TonlCompressionStrategy.");
    }

    const tonl = await ensureTonlModule();
    const encoder = tonl.encodeSmart ?? tonl.encodeTONL;

    if (encoder === undefined || typeof encoder !== "function") {
      throw new Error("TONL encoder is not available.");
    }

    const normalized =
      typeof tonl.encodeSmart === "function" && tonl.encodeSmart !== undefined
        ? tonl.encodeSmart(parsed as never)
        : tonl.encodeTONL !== undefined
          ? tonl.encodeTONL(parsed as never)
          : JSON.stringify(parsed);

    let detectedDelimiter = ",";
    if (typeof tonl.detectDelimiter === "function") {
      const result = tonl.detectDelimiter(normalized);
      if (typeof result === "string" && result.length > 0) {
        detectedDelimiter = result;
      }
    }

    const trimmed = normalized.trim();
    const payload = tonlOptimizationPayloadSchema.parse({
      lineCount: trimmed.length === 0 ? 0 : trimmed.split(/\r?\n/).length,
      delimiter: detectedDelimiter,
      includesTypeAnnotations: /@type/i.test(trimmed),
    });

    return {
      optimizedText: trimmed,
      optimizedPayload: payload,
    };
  }
}

import type { OptimizationRequest } from "../tokenOptimizer.types";
import {
  type ToonOptimizationPayload,
  toonOptimizationPayloadSchema,
} from "../tokenOptimizer.types";
import { CompressionTypeEnum } from "../types";
import type { CompressionOutcome, CompressionStrategy } from "./base";

type ToonModule = {
  encode?: (value: unknown, options?: Record<string, unknown>) => string;
};

let toonModulePromise: Promise<ToonModule> | null = null;

const ensureToonModule = async (): Promise<ToonModule> => {
  if (!toonModulePromise) {
    toonModulePromise = (async (): Promise<ToonModule> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const toon = await import("@toon-format/toon");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return toon as ToonModule;
      } catch {
        // @toon-format/toon package not available - return stub
        return {
          encode: (value: unknown) => JSON.stringify(value, null, 2),
        };
      }
    })();
  }

  return toonModulePromise;
};

const collectJsonStats = (
  value: unknown
): {
  objectKeyCount: number;
  arrayCount: number;
} => {
  let objectKeyCount = 0;
  let arrayCount = 0;

  const visit = (node: unknown): void => {
    if (node === null || node === undefined) {
      return;
    }

    if (Array.isArray(node)) {
      arrayCount += 1;
      node.forEach(visit);
      return;
    }

    if (typeof node === "object") {
      const entries = Object.entries(node as Record<string, unknown>);
      objectKeyCount += entries.length;
      for (const [, child] of entries) {
        visit(child);
      }
      return;
    }
  };

  visit(value);

  return {
    objectKeyCount,
    arrayCount,
  };
};

export class ToonCompressionStrategy implements CompressionStrategy {
  public readonly type = CompressionTypeEnum.TOON;

  public async format(
    cleanedInput: string,
    _request: OptimizationRequest
  ): Promise<CompressionOutcome> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(cleanedInput);
    } catch (_error) {
      throw new Error("Invalid JSON input provided to ToonCompressionStrategy.");
    }

    const toon = await ensureToonModule();

    if (typeof toon.encode !== "function") {
      throw new Error("TOON encoder is not available.");
    }

    const normalized = toon.encode(
      parsed as never,
      {
        indent: 2,
        delimiter: ",",
        keyFolding: "safe",
      } as Record<string, unknown>
    );

    const trimmed = normalized.trim();
    const lineCount = trimmed.length === 0 ? 0 : trimmed.split(/\r?\n/).length;
    const { objectKeyCount, arrayCount } = collectJsonStats(parsed);

    const payload: ToonOptimizationPayload = toonOptimizationPayloadSchema.parse({
      lineCount,
      objectKeyCount,
      arrayCount,
    });

    return {
      optimizedText: trimmed,
      optimizedPayload: payload,
    };
  }
}
